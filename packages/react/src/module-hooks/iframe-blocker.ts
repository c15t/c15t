'use client';

import {
	allConsentNames,
	getEffectiveGateState,
	has,
	isVendorDenied,
} from '@c15t/core';
import type {
	AllConsentNames,
	ConsentKernel,
	ConsentSnapshot,
} from '@c15t/core';
import type {
	IframeBlockerHandle,
	IframeBlockerOptions,
} from '@c15t/core/modules/iframe-blocker';
import { useEffect, useRef, useState } from 'react';

import { useRequiredKernel } from './shared';

const loadIframeBlockerModule = () =>
	import('@c15t/core/modules/iframe-blocker');

export interface UseIframeBlockerOptions {
	disableAutomaticBlocking?: boolean;
}

export const useIframeBlocker = function useIframeBlocker(
	options: UseIframeBlockerOptions = {}
): IframeBlockerHandle {
	const kernel = useRequiredKernel();
	const handleRef = useRef<IframeBlockerHandle | null>(null);

	const [handle, setHandle] = useState<IframeBlockerHandle>(() => ({
		dispose() {
			handleRef.current?.dispose();
			handleRef.current = null;
		},
		processAllIframes() {
			handleRef.current?.processAllIframes();
		},
	}));
	void setHandle;

	useEffect(() => {
		let disposed = false;
		void (async () => {
			const { createIframeBlocker } = await loadIframeBlockerModule();
			if (disposed) {
				return;
			}
			const created = createIframeBlocker({
				disableAutomaticBlocking: options.disableAutomaticBlocking,
				kernel,
			});
			handleRef.current = created;
		})();

		return () => {
			disposed = true;
			handleRef.current?.dispose();
			handleRef.current = null;
		};
	}, [kernel, options.disableAutomaticBlocking]);

	return handle;
};

const GATED_IFRAME = 'iframe[data-category], iframe[data-vendor]';

/** Same marker the blocker sets, so it restores what this pauses. */
const PAUSED_ATTRIBUTE = 'data-c15t-paused';

/**
 * Whether a node is an iframe. False for a node page script can't read:
 * Firefox throws "Permission denied to access property" for some nodes,
 * such as ones an extension inserted.
 */
const isIframe = function isIframe(node: Node): node is HTMLIFrameElement {
	try {
		return (
			node.nodeType === 1 &&
			(node as Element).tagName.toUpperCase() === 'IFRAME'
		);
	} catch {
		return false;
	}
};

/**
 * Whether a vendor the visitor turned off still gates a frame once the
 * blocker has loaded. The blocker declares the slug a frame names (or, for
 * a vendor-only frame, holds it against the stored denial directly), so a
 * stored denial counts before anything else has declared the slug. Once
 * the slug is declared, the gate's own filtered set decides, so a
 * `disabled` declaration lifts a stale denial here as it does there.
 */
const isVendorTurnedOff = function isVendorTurnedOff(
	snapshot: ConsentSnapshot,
	vendor: string
): boolean {
	if (!snapshot.vendorChoice?.denied.includes(vendor)) {
		return false;
	}
	const declared = snapshot.vendors?.declared.some(
		(entry) => entry.id === vendor
	);
	return declared ? isVendorDenied(snapshot, vendor) : true;
};

/**
 * Whether the loaded blocker would leave a frame's `src` alone, decided the
 * way `reconcileIframe` decides it: the category, when there is one, must be
 * granted, and outside IAB mode the vendor must not be turned off. A frame
 * with a category the gate cannot read is not clearly allowed.
 */
const isClearlyAllowed = function isClearlyAllowed(
	iframe: HTMLIFrameElement,
	kernel: ConsentKernel
): boolean {
	const snapshot = kernel.getSnapshot();
	const category = iframe.getAttribute('data-category');
	if (category !== null) {
		if (!allConsentNames.includes(category as AllConsentNames)) {
			return false;
		}
		const { effectivePermissions } = getEffectiveGateState(snapshot);
		if (!has(category as AllConsentNames, effectivePermissions)) {
			return false;
		}
	}
	const vendor = iframe.getAttribute('data-vendor');
	// Vendor denials are inert in IAB mode, where the TC string decides.
	if (!vendor || snapshot.model === 'iab') {
		return true;
	}
	return !isVendorTurnedOff(snapshot, vendor);
};

/**
 * Pause a gated frame that arrived with a `src` before the blocker loaded,
 * the way the blocker itself pauses a denied one. The blocker restores it
 * once it runs, if consent allows it by then.
 */
const holdIframe = function holdIframe(
	iframe: HTMLIFrameElement,
	kernel: ConsentKernel
): void {
	const src = iframe.getAttribute('src');
	if (!(src && iframe.matches(GATED_IFRAME))) {
		return;
	}
	if (isClearlyAllowed(iframe, kernel)) {
		return;
	}
	if (!iframe.hasAttribute('data-src')) {
		iframe.setAttribute('data-src', src);
	}
	iframe.removeAttribute('src');
	iframe.setAttribute(PAUSED_ATTRIBUTE, '');
};

/** Whether an iframe is gated. False for one page script can't read. */
const isGatedIframe = function isGatedIframe(
	iframe: HTMLIFrameElement
): boolean {
	try {
		return iframe.matches(GATED_IFRAME);
	} catch {
		return false;
	}
};

const collectIframes = function collectIframes(
	mutations: MutationRecord[]
): HTMLIFrameElement[] {
	const found = new Set<HTMLIFrameElement>();
	for (const mutation of mutations) {
		if (mutation.type === 'attributes' && isIframe(mutation.target)) {
			found.add(mutation.target);
		}
		for (const node of Array.from(mutation.addedNodes)) {
			if (isIframe(node)) {
				found.add(node);
				continue;
			}
			try {
				if (node.nodeType === 1) {
					for (const iframe of Array.from(
						(node as Element).querySelectorAll('iframe')
					)) {
						found.add(iframe);
					}
				}
			} catch {
				// Unreadable node: skip it so the rest of the batch is still held.
			}
		}
	}
	return [...found].filter(isGatedIframe);
};

/**
 * Call `onFound` when a gated iframe is on the page: at once when one is
 * there already, and again for each batch of gated frames that arrives.
 *
 * Until the returned stop function runs, a gated frame that arrives with a
 * `src` the snapshot does not clearly allow is paused (`src` moved to
 * `data-src`), as the loaded blocker would pause it. Frames on the page at
 * the first call are left to the blocker, which is what happens when it
 * loads with the provider.
 *
 * @param kernel - The kernel whose snapshot decides what is clearly allowed.
 * @param onFound - Called for every sighting; the caller dedupes.
 * @returns Stops watching.
 * @internal
 */
export const watchGatedIframes = function watchGatedIframes(
	kernel: ConsentKernel,
	onFound: () => void
): () => void {
	if (typeof document === 'undefined' || !document.body) {
		onFound();
		return () => {
			/* nothing to stop */
		};
	}
	if (document.querySelector(GATED_IFRAME)) {
		onFound();
	}
	const observer = new MutationObserver((mutations) => {
		const iframes = collectIframes(mutations);
		if (iframes.length === 0) {
			return;
		}
		for (const iframe of iframes) {
			try {
				holdIframe(iframe, kernel);
			} catch {
				// Unreadable iframe: skip it so the rest of the batch is still held.
			}
		}
		onFound();
	});
	observer.observe(document.body, {
		attributeFilter: ['data-category', 'data-vendor', 'src'],
		attributes: true,
		childList: true,
		subtree: true,
	});
	return () => observer.disconnect();
};

/**
 * The provider's iframe blocker. Loads the blocker module when the first
 * gated iframe (`data-category` or `data-vendor`) is on the page instead of
 * on every mount, so pages without one never download it. Until then it
 * pauses gated frames that arrive with a `src` consent does not allow.
 *
 * Passed to the provider runtime as its `createIframeBlocker` module.
 *
 * @param options - The kernel and blocker options. With
 * `disableAutomaticBlocking` the module loads at once.
 * @returns A handle; `processAllIframes()` reaches the blocker once it has
 * loaded.
 * @internal
 */
export const createIframeBlockerOnDemand =
	function createIframeBlockerOnDemand({
		disableAutomaticBlocking,
		kernel,
	}: IframeBlockerOptions): IframeBlockerHandle {
		let disposed = false;
		let blocker: IframeBlockerHandle | null = null;
		let loading = false;
		let stopWatching = () => {
			/* not watching yet */
		};
		const load = () => {
			if (loading) {
				return;
			}
			loading = true;
			void (async () => {
				let loaded: Awaited<ReturnType<typeof loadIframeBlockerModule>>;
				try {
					loaded = await loadIframeBlockerModule();
				} catch {
					// A failed chunk load leaves the held frames paused; the next
					// gated frame to arrive tries again.
					loading = false;
					return;
				}
				if (disposed) {
					return;
				}
				// Stop first: the blocker's first pass restores allowed frames,
				// and the watcher must not see that as a new arrival.
				stopWatching();
				// Outside the `try`: a configuration error such as an invalid
				// `data-category` must surface, not pass for a failed download.
				blocker = loaded.createIframeBlocker({
					disableAutomaticBlocking,
					kernel,
				});
			})();
		};
		if (disableAutomaticBlocking) {
			load();
		} else {
			stopWatching = watchGatedIframes(kernel, load);
		}
		return {
			dispose() {
				disposed = true;
				stopWatching();
				blocker?.dispose();
				blocker = null;
			},
			processAllIframes() {
				blocker?.processAllIframes();
			},
		};
	};

export type { IframeBlockerHandle };
