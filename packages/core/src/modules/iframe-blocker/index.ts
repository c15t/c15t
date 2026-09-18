/**
 * `@c15t/core/modules/iframe-blocker`
 *
 * Kernel-consuming iframe blocker. Subscribes to the kernel snapshot,
 * observes the DOM for iframes carrying a `data-category` or
 * `data-vendor` attribute, and toggles their `src` based on consent.
 *
 * Concerns are split across siblings:
 * - `types.ts`        — public type definitions.
 * - `reconcile.ts`    — pure per-iframe + bulk reconciliation.
 * - `index.ts`        — this file: MutationObserver wiring + lifecycle.
 *
 * v2 parity: `packages/core/src/libs/iframe-blocker/core.ts`.
 *
 * Semantics:
 * - iframes WITHOUT `data-category` or `data-vendor` are untouched.
 * - iframes WITH `data-category` and/or `data-vendor`:
 *   - consent granted + HTTP(S) `data-src` but no `src` → set resolved src
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
import { declareOwnedVendors } from '../../libs/vendors';
import {
	buildReconcilePass,
	determineCategory,
	determineVendor,
	reconcileAllIframes,
	reconcileIframe,
} from './reconcile';
import type { IframeBlockerHandle, IframeBlockerOptions } from './types';

export type { IframeBlockerHandle, IframeBlockerOptions } from './types';

export const createIframeBlocker = function createIframeBlocker(
	options: IframeBlockerOptions
): IframeBlockerHandle {
	const { kernel } = options;
	const disableAuto = options.disableAutomaticBlocking === true;

	const hasDom =
		typeof document !== 'undefined' && typeof MutationObserver !== 'undefined';

	if (!hasDom) {
		// No-op handle for SSR / non-browser contexts.
		const unsubscribe = kernel.subscribe(() => {
			/* empty */
		});
		return {
			dispose() {
				unsubscribe();
			},
			processAllIframes() {
				/* empty */
			},
		};
	}

	const registerIframes = (iframes: Iterable<HTMLIFrameElement>) => {
		const list = Array.from(iframes);
		kernel.set.registerConsentCategories(
			list.flatMap((iframe) => {
				const category = determineCategory(iframe);
				return category ? [category] : [];
			})
		);
		// Declare the slugs the frames name, the way scripts and rules do, so
		// a stored denial keeps gating them before a backend declaration of
		// the same slug has arrived. A frame with only `data-vendor` has no
		// category to declare under and waits for that declaration instead.
		declareOwnedVendors(
			kernel,
			list.flatMap((iframe) => {
				const vendor = determineVendor(iframe);
				const category = determineCategory(iframe);
				return vendor && category ? [{ category, vendor }] : [];
			})
		);
	};

	const observer = new MutationObserver((mutations) => {
		const iframes = new Set<HTMLIFrameElement>();
		for (const mutation of mutations) {
			if (
				mutation.type === 'attributes' &&
				(mutation.target as Element).tagName?.toUpperCase() === 'IFRAME'
			) {
				iframes.add(mutation.target as HTMLIFrameElement);
			}
			for (const node of Array.from(mutation.addedNodes)) {
				if (node.nodeType !== 1) {
					continue;
				}
				const element = node as Element;
				if (element.tagName?.toUpperCase() === 'IFRAME') {
					iframes.add(element as HTMLIFrameElement);
				}
				for (const iframe of Array.from(element.querySelectorAll('iframe'))) {
					iframes.add(iframe);
				}
			}
		}
		registerIframes(iframes);
		const pass = buildReconcilePass(kernel.getSnapshot());
		for (const iframe of iframes) {
			reconcileIframe(iframe, pass);
		}
	});

	const processAll = function processAll(): void {
		registerIframes(
			document.querySelectorAll<HTMLIFrameElement>(
				'iframe[data-category], iframe[data-vendor]'
			)
		);
		reconcileAllIframes(kernel.getSnapshot());
	};

	if (!disableAuto) {
		processAll();
		if (document.body) {
			observer.observe(document.body, {
				attributeFilter: ['data-category', 'data-vendor'],
				attributes: true,
				childList: true,
				subtree: true,
			});
		}
	}

	// Short-circuit subscriber ticks that don't actually move consent.
	let lastConsents: unknown = null;
	let lastPolicyCategories: unknown = null;
	let lastScopeMode: unknown = null;
	let lastVendorChoice: unknown = null;
	let lastVendors: unknown = null;
	let lastModel: unknown = null;
	const unsubscribe = kernel.subscribe((snapshot) => {
		if (disableAuto) {
			return;
		}
		if (
			snapshot.effectivePermissions === lastConsents &&
			snapshot.policyRule.scope === lastPolicyCategories &&
			snapshot.policyRule.scopeMode === lastScopeMode &&
			snapshot.vendorChoice === lastVendorChoice &&
			snapshot.vendors === lastVendors &&
			snapshot.model === lastModel
		) {
			return;
		}
		lastConsents = snapshot.effectivePermissions;
		lastPolicyCategories = snapshot.policyRule.scope;
		lastScopeMode = snapshot.policyRule.scopeMode;
		lastVendorChoice = snapshot.vendorChoice;
		lastVendors = snapshot.vendors;
		lastModel = snapshot.model;
		processAll();
	});

	return {
		dispose() {
			observer.disconnect();
			unsubscribe();
		},
		processAllIframes: processAll,
	};
};
