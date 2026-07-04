/**
 * c15t/v3/modules/iframe-blocker
 *
 * Kernel-consuming iframe blocker. Subscribes to the kernel snapshot,
 * observes the DOM for iframes carrying a `data-category` attribute,
 * and toggles their `src` based on consent.
 *
 * Concerns are split across siblings:
 * - `types.ts`        — public type definitions.
 * - `reconcile.ts`    — pure per-iframe + bulk reconciliation.
 * - `index.ts`        — this file: MutationObserver wiring + lifecycle.
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
import {
	buildReconcilePass,
	reconcileAllIframes,
	reconcileIframe,
} from './reconcile';
import type { IframeBlockerHandle, IframeBlockerOptions } from './types';

export type { IframeBlockerHandle, IframeBlockerOptions } from './types';

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

	const observer = new MutationObserver((mutations) => {
		const pass = buildReconcilePass(kernel.getSnapshot());
		for (const mutation of mutations) {
			for (const node of Array.from(mutation.addedNodes)) {
				if (node.nodeType !== 1 /* ELEMENT_NODE */) continue;
				const element = node as Element;
				if (element.tagName?.toUpperCase() === 'IFRAME') {
					reconcileIframe(element as HTMLIFrameElement, pass);
				}
				const nested = element.querySelectorAll?.('iframe');
				if (nested) {
					for (const iframe of Array.from(nested) as HTMLIFrameElement[]) {
						reconcileIframe(iframe, pass);
					}
				}
			}
		}
	});

	function processAll(): void {
		reconcileAllIframes(kernel.getSnapshot());
	}

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
