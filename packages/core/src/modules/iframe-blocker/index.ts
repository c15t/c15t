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
import type { AllConsentNames } from '../../consent/consent-types';
import { declareOwnedVendors, forgetOwnedVendors } from '../../libs/vendors';
import type { VendorOwner } from '../../libs/vendors';
import {
	buildReconcilePass,
	determineCategory,
	determineVendor,
	reconcileAllIframes,
	reconcileIframeSafely,
} from './reconcile';
import type { IframeBlockerHandle, IframeBlockerOptions } from './types';

export type { IframeBlockerHandle, IframeBlockerOptions } from './types';

/**
 * Whether a node is an iframe. False for a node page script can't read:
 * Firefox throws "Permission denied to access property" for some nodes,
 * such as ones an extension inserted.
 */
const isIframe = function isIframe(node: Node): node is HTMLIFrameElement {
	try {
		return (
			node.nodeType === 1 &&
			(node as Element).tagName?.toUpperCase() === 'IFRAME'
		);
	} catch {
		return false;
	}
};

/**
 * Add the iframes in a node to `into`: the node itself when it is an
 * iframe, plus any inside it. A node page script can't read is skipped, so
 * the rest of the mutation batch is still gated.
 */
const addIframes = function addIframes(
	node: Node,
	into: Set<HTMLIFrameElement>
): void {
	if (isIframe(node)) {
		into.add(node);
	}
	try {
		if (node.nodeType !== 1) {
			return;
		}
		for (const iframe of Array.from(
			(node as Element).querySelectorAll?.('iframe') ?? []
		)) {
			into.add(iframe);
		}
	} catch {
		// Unreadable node: page script can't gate what is inside it either.
	}
};

interface IframeGate {
	category: AllConsentNames | null | undefined;
	isConnected: boolean;
	vendor: string | undefined;
}

/**
 * Read what an iframe is gated on. `null` for an iframe page script can't
 * read (see `isIframe`), so it is skipped instead of stopping the pass.
 */
const readGate = function readGate(
	iframe: HTMLIFrameElement
): IframeGate | null {
	try {
		return {
			category: determineCategory(iframe),
			isConnected: iframe.isConnected !== false,
			vendor: determineVendor(iframe),
		};
	} catch {
		return null;
	}
};

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

	// What each frame on the page names right now, so the blocker's
	// declaration follows the live frames: a frame that changes its slug or
	// category, or leaves the page, takes its old pair with it. A scan only
	// sees the frames that changed, so the map is keyed by frame and the
	// declaration is the union over every frame still known.
	const ownerSource = Symbol('iframe-blocker');
	const framed = new Map<HTMLIFrameElement, VendorOwner>();
	const ownerKey = (owner: VendorOwner) =>
		`${owner.vendor}\u0000${JSON.stringify(owner.category)}`;
	const currentOwners = () => {
		const seen = new Map<string, VendorOwner>();
		for (const owner of framed.values()) {
			seen.set(ownerKey(owner), owner);
		}
		return [...seen.values()];
	};
	const registerIframes = (iframes: Iterable<HTMLIFrameElement>) => {
		const list = Array.from(iframes).flatMap((iframe) => {
			const gate = readGate(iframe);
			return gate ? [{ ...gate, iframe }] : [];
		});
		kernel.set.registerConsentCategories(
			list.flatMap(({ category }) => (category ? [category] : []))
		);
		// Declare the slugs the frames name, the way scripts and rules do, so
		// a stored denial keeps gating them before a backend declaration of
		// the same slug has arrived. A frame with only `data-vendor` has no
		// category to declare under; `reconcileIframe` holds it against the
		// stored denial directly instead.
		const before = new Set(currentOwners().map(ownerKey));
		for (const { category, iframe, isConnected, vendor } of list) {
			if (vendor && category && isConnected) {
				framed.set(iframe, { category, vendor });
			} else {
				framed.delete(iframe);
			}
		}
		// A pass only sees the frames that changed, so the rest are checked
		// here: one that left the page, or stayed but dropped its gate
		// attributes, takes its declaration with it. Without an observer,
		// under `disableAutomaticBlocking`, this is the only place that can.
		for (const iframe of [...framed.keys()]) {
			const gate = readGate(iframe);
			if (!(gate?.isConnected && gate.vendor && gate.category)) {
				framed.delete(iframe);
			}
		}
		const owners = currentOwners();
		const changed =
			owners.length !== before.size ||
			owners.some((owner) => !before.has(ownerKey(owner)));
		// Also when another source swept a framed slug out of the declared
		// set: a frame on the page owns its slug for as long as it is there.
		const declaredIds = new Set(
			kernel.getSnapshot().vendors?.declared.map((vendor) => vendor.id)
		);
		const missing = owners.some(
			(owner) => owner.vendor && !declaredIds.has(owner.vendor)
		);
		if (changed || missing) {
			declareOwnedVendors(kernel, owners, ownerSource);
		}
	};

	const observer = new MutationObserver((mutations) => {
		const iframes = new Set<HTMLIFrameElement>();
		for (const mutation of mutations) {
			if (mutation.type === 'attributes' && isIframe(mutation.target)) {
				iframes.add(mutation.target);
			}
			for (const node of Array.from(mutation.addedNodes)) {
				addIframes(node, iframes);
			}
			// A frame that left the page takes its declaration with it. Only
			// frames the blocker knows are re-registered, so a removed subtree
			// costs nothing when it held no gated frame.
			for (const node of Array.from(mutation.removedNodes ?? [])) {
				addIframes(node, iframes);
			}
		}
		registerIframes(iframes);
		const pass = buildReconcilePass(kernel.getSnapshot());
		for (const iframe of iframes) {
			reconcileIframeSafely(iframe, pass);
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
			forgetOwnedVendors(kernel, ownerSource);
		},
		processAllIframes: processAll,
	};
};
