/**
 * c15t/v3/modules/iframe-blocker
 *
 * Kernel-consuming iframe blocker. Subscribes to the kernel snapshot.
 * Observes the DOM for iframes carrying a `data-category` attribute and
 * toggles their src based on consent.
 *
 * v2 parity: `packages/core/src/libs/iframe-blocker/core.ts`.
 *
 * Semantics (matching v2):
 * - iframes WITHOUT `data-category` are untouched (never blocked).
 * - iframes WITH `data-category`:
 *   - consent granted + has `data-src` but no `src` → move data-src → src
 *   - consent NOT granted + has `src`              → removeAttribute('src')
 *
 * Headless (no placeholder UI in v2; v3 preserves that — consumer can
 * wrap blocked iframes with their own UI using the snapshot).
 *
 * Idempotent: `dispose` disconnects the observer. Multiple simultaneous
 * iframe-blockers are allowed — each runs its own observer + snapshot
 * subscription. Per-iframe state is derived from the DOM at check time,
 * so multiple instances produce the same result.
 */

import type { ConsentState } from '../../../types/compliance';
import type { AllConsentNames } from '../../../types/consent-types';
import { allConsentNames } from '../../../types/consent-types';
import type { ConsentKernel, ConsentSnapshot } from '../../types';
import { type HasOptions, has } from '../has';

export interface IframeBlockerOptions {
	kernel: ConsentKernel;
	/**
	 * Skip the initial DOM scan + observer install. Useful when a
	 * consumer wants to drive reconciliation manually via
	 * `processAllIframes()`. Defaults to false.
	 */
	disableAutomaticBlocking?: boolean;
}

export interface IframeBlockerHandle {
	dispose(): void;
	/** Re-scan every iframe in the document and reapply the src toggle. */
	processAllIframes(): void;
}

function determineCategory(
	iframe: HTMLIFrameElement
): AllConsentNames | undefined {
	const raw = iframe.getAttribute('data-category');
	if (!raw) return undefined;
	if (!allConsentNames.includes(raw as AllConsentNames)) {
		throw new Error(
			`c15t iframe-blocker: invalid data-category "${raw}". Must be one of: ${allConsentNames.join(
				', '
			)}`
		);
	}
	return raw as AllConsentNames;
}

export function createIframeBlocker(
	options: IframeBlockerOptions
): IframeBlockerHandle {
	const { kernel } = options;
	const disableAuto = options.disableAutomaticBlocking === true;

	const hasDom =
		typeof document !== 'undefined' && typeof MutationObserver !== 'undefined';

	if (!hasDom) {
		// No-op handle for SSR / non-browser contexts.
		const unsubscribe = kernel.subscribe(() => {});
		return {
			dispose() {
				unsubscribe();
			},
			processAllIframes() {},
		};
	}

	interface ReconcileCtx {
		consents: ConsentState;
		hasOptions: HasOptions;
	}

	function buildCtx(snapshot: ConsentSnapshot): ReconcileCtx {
		return {
			consents: snapshot.consents as ConsentState,
			hasOptions: {
				policyCategories:
					snapshot.policyCategories.length > 0
						? (snapshot.policyCategories as AllConsentNames[])
						: null,
				policyScopeMode: snapshot.policyScopeMode,
			},
		};
	}

	function processOne(iframe: HTMLIFrameElement, ctx: ReconcileCtx): void {
		const category = determineCategory(iframe);
		if (!category) return; // no gate declared → always allowed

		const allowed = has(category, ctx.consents, ctx.hasOptions);
		const dataSrc = iframe.getAttribute('data-src');

		if (allowed) {
			if (dataSrc && !iframe.getAttribute('src')) {
				iframe.setAttribute('src', dataSrc);
				iframe.removeAttribute('data-src');
			}
			return;
		}

		// Not allowed. Clear src if present.
		if (iframe.getAttribute('src')) {
			iframe.removeAttribute('src');
		}
	}

	function processAll(): void {
		const iframes = document.querySelectorAll('iframe');
		const ctx = buildCtx(kernel.getSnapshot());
		for (const iframe of Array.from(iframes) as HTMLIFrameElement[]) {
			processOne(iframe, ctx);
		}
	}

	const observer = new MutationObserver((mutations) => {
		const ctx = buildCtx(kernel.getSnapshot());
		for (const mutation of mutations) {
			for (const node of Array.from(mutation.addedNodes)) {
				if (node.nodeType !== 1 /* ELEMENT_NODE */) continue;
				const element = node as Element;
				if (element.tagName?.toUpperCase() === 'IFRAME') {
					processOne(element as HTMLIFrameElement, ctx);
				}
				const nested = element.querySelectorAll?.('iframe');
				if (nested) {
					for (const iframe of Array.from(nested) as HTMLIFrameElement[]) {
						processOne(iframe, ctx);
					}
				}
			}
		}
	});

	if (!disableAuto) {
		processAll();
		if (document.body) {
			observer.observe(document.body, { childList: true, subtree: true });
		}
	}

	// Short-circuit subscriber ticks that don't actually move consent.
	let lastConsents: unknown = null;
	let lastPolicyCategories: unknown = null;
	let lastScopeMode: unknown = null;
	const unsubscribe = kernel.subscribe((snapshot) => {
		if (disableAuto) return;
		if (
			snapshot.consents === lastConsents &&
			snapshot.policyCategories === lastPolicyCategories &&
			snapshot.policyScopeMode === lastScopeMode
		) {
			return;
		}
		lastConsents = snapshot.consents;
		lastPolicyCategories = snapshot.policyCategories;
		lastScopeMode = snapshot.policyScopeMode;
		processAll();
	});

	return {
		dispose() {
			observer.disconnect();
			unsubscribe();
		},
		processAllIframes: processAll,
	};
}
