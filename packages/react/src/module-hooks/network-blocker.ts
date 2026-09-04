'use client';

import type {
	BlockedRequestInfo,
	NetworkBlockerHandle,
	NetworkBlockerRule,
} from '@c15t/core/modules/network-blocker';
import { useEffect, useRef, useState } from 'react';

import { useRequiredKernel } from './shared';

const loadNetworkBlockerModule = () =>
	import('@c15t/core/modules/network-blocker');

export interface UseNetworkBlockerOptions {
	rules: NetworkBlockerRule[];
	enabled?: boolean;
	logBlockedRequests?: boolean;
	onRequestBlocked?: (info: BlockedRequestInfo) => void;
}

export const useNetworkBlocker = function useNetworkBlocker(
	options: UseNetworkBlockerOptions
): NetworkBlockerHandle {
	const kernel = useRequiredKernel();
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
		void (async () => {
			const { createNetworkBlocker } = await loadNetworkBlockerModule();
			if (disposed) {
				return;
			}
			const created = createNetworkBlocker({
				enabled: latestEnabledRef.current,
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
		};
	}, [kernel, options.logBlockedRequests, options.onRequestBlocked]);

	return handle;
};

export type { BlockedRequestInfo, NetworkBlockerHandle, NetworkBlockerRule };
