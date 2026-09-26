'use client';

import { evaluateConsent } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import type { IframeBlockerHandle } from '@c15t/core/modules/iframe-blocker';
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

const isIframe = function isIframe(node: Node): node is HTMLIFrameElement {
	return (
		node.nodeType === 1 && (node as Element).tagName.toUpperCase() === 'IFRAME'
	);
};

/**
 * Whether the snapshot clearly allows a frame. A frame without a category,
 * or with one the gate cannot read, is not clearly allowed.
 */
const isClearlyAllowed = function isClearlyAllowed(
	iframe: HTMLIFrameElement,
	kernel: ConsentKernel
): boolean {
	const category = iframe.getAttribute('data-category');
	if (!category) {
		return false;
	}
	try {
		return evaluateConsent(
			{
				category: category as Parameters<typeof evaluateConsent>[0]['category'],
				vendor: iframe.getAttribute('data-vendor') || undefined,
			},
			kernel.getSnapshot()
		);
	} catch {
		return false;
	}
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
			} else if (node.nodeType === 1) {
				for (const iframe of Array.from(
					(node as Element).querySelectorAll('iframe')
				)) {
					found.add(iframe);
				}
			}
		}
	}
	return [...found].filter((iframe) => iframe.matches(GATED_IFRAME));
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
			holdIframe(iframe, kernel);
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
 * The provider's default iframe blocker. Loads the blocker module when the
 * first gated iframe (`data-category` or `data-vendor`) is on the page
 * instead of on every mount, so pages without one never download it.
 *
 * @param options - Blocker options. With `disableAutomaticBlocking` the
 * module loads at once, as it did before.
 * @internal
 */
export const useIframeBlockerOnDemand = function useIframeBlockerOnDemand(
	options: UseIframeBlockerOptions = {}
): void {
	const kernel = useRequiredKernel();
	const { disableAutomaticBlocking } = options;

	useEffect(() => {
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
				try {
					const { createIframeBlocker } = await loadIframeBlockerModule();
					if (disposed) {
						return;
					}
					// Stop first: the blocker's first pass restores allowed frames,
					// and the watcher must not see that as a new arrival.
					stopWatching();
					blocker = createIframeBlocker({ disableAutomaticBlocking, kernel });
				} catch {
					// A failed chunk load leaves the held frames paused; the next
					// gated frame to arrive tries again.
					loading = false;
				}
			})();
		};
		if (disableAutomaticBlocking) {
			load();
		} else {
			stopWatching = watchGatedIframes(kernel, load);
		}
		return () => {
			disposed = true;
			stopWatching();
			blocker?.dispose();
			blocker = null;
		};
	}, [kernel, disableAutomaticBlocking]);
};

export type { IframeBlockerHandle };
