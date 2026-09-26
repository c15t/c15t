'use client';

import type {
	BlockedRequestInfo,
	NetworkBlockerHandle,
	NetworkBlockerRule,
} from '@c15t/core/modules/network-blocker';
import { useEffect, useRef, useState } from 'react';

import { useEarlyNetworkHold } from './network-hold';
import { useRequiredKernel } from './shared';

const loadNetworkBlockerModule = () =>
	import('@c15t/core/modules/network-blocker');

export interface UseNetworkBlockerOptions {
	rules: NetworkBlockerRule[];
	enabled?: boolean;
	logBlockedRequests?: boolean;
	onRequestBlocked?: (info: BlockedRequestInfo) => void;
}

/**
 * Block `fetch` and XHR requests that match `rules` until the visitor's
 * consent allows them.
 *
 * Blocking starts during the first render in the browser: matching requests
 * wait from then on, including ones sent from this component's children's
 * mount effects and from effects that run before this component's. The
 * blocker loads after mount and decides each waiting request. On the
 * server the hook does nothing.
 *
 * Rendering has a side effect: the first render patches `fetch` and
 * `XMLHttpRequest` to hold matching requests. If React discards that
 * render and never commits it, the hold ends after 10 seconds and the
 * requests it held are sent unchecked, as they would have been without the
 * hook.
 *
 * Prefer the provider's `networkBlocker` option. It starts blocking when
 * the provider renders, so it also covers components rendered before this
 * one.
 *
 * @param options - Rules and logging options.
 * @returns A handle to update rules or toggle blocking.
 */
export const useNetworkBlocker = function useNetworkBlocker(
	options: UseNetworkBlockerOptions
): NetworkBlockerHandle {
	const kernel = useRequiredKernel();
	const earlyHold = useEarlyNetworkHold(options.rules, options.enabled);
	const handleRef = useRef<NetworkBlockerHandle | null>(null);
	const latestRulesRef = useRef(options.rules);
	const latestEnabledRef = useRef(options.enabled);

	const [handle, setHandle] = useState<NetworkBlockerHandle>(() => ({
		dispose() {
			handleRef.current?.dispose();
			handleRef.current = null;
		},
		setEnabled(enabled) {
			latestEnabledRef.current = enabled;
			handleRef.current?.setEnabled(enabled);
		},
		updateRules(next) {
			latestRulesRef.current = next;
			handleRef.current?.updateRules(next);
		},
	}));
	void setHandle;

	useEffect(() => {
		latestRulesRef.current = options.rules;
		latestEnabledRef.current = options.enabled;
	}, [options.enabled, options.rules]);

	const firstRules = useRef(true);
	useEffect(() => {
		if (firstRules.current) {
			firstRules.current = false;
			return;
		}
		handle.updateRules(options.rules);
	}, [handle, options.rules]);

	useEffect(() => {
		if (options.enabled !== undefined) {
			handle.setEnabled(options.enabled);
		}
	}, [handle, options.enabled]);

	useEffect(() => {
		let disposed = false;
		const hold = earlyHold.claim(
			latestRulesRef.current,
			latestEnabledRef.current
		);
		void (async () => {
			const { createNetworkBlocker } = await loadNetworkBlockerModule();
			if (disposed) {
				return;
			}
			const created = createNetworkBlocker({
				enabled: latestEnabledRef.current,
				hold,
				kernel,
				logBlockedRequests: options.logBlockedRequests,
				onRequestBlocked: options.onRequestBlocked,
				rules: latestRulesRef.current,
			});
			handleRef.current = created;
		})();

		return () => {
			disposed = true;
			handleRef.current?.dispose();
			handleRef.current = null;
			earlyHold.unmount();
		};
	}, [earlyHold, kernel, options.logBlockedRequests, options.onRequestBlocked]);

	return handle;
};

export type { BlockedRequestInfo, NetworkBlockerHandle, NetworkBlockerRule };
