'use client';

import {
	type BlockedRequestInfo,
	createNetworkBlocker,
	type NetworkBlockerHandle,
	type NetworkBlockerRule,
} from 'c15t/v3/modules/network-blocker';
import { useEffect, useRef } from 'react';
import { useRequiredKernel } from './shared';

export interface UseNetworkBlockerOptions {
	rules: NetworkBlockerRule[];
	enabled?: boolean;
	logBlockedRequests?: boolean;
	onRequestBlocked?: (info: BlockedRequestInfo) => void;
}

export function useNetworkBlocker(
	options: UseNetworkBlockerOptions
): NetworkBlockerHandle {
	const kernel = useRequiredKernel();
	const handleRef = useRef<NetworkBlockerHandle | null>(null);
	const latestRulesRef = useRef(options.rules);
	const latestEnabledRef = useRef(options.enabled);

	latestRulesRef.current = options.rules;
	latestEnabledRef.current = options.enabled;

	const facadeRef = useRef<NetworkBlockerHandle | null>(null);
	if (!facadeRef.current) {
		facadeRef.current = {
			dispose() {
				handleRef.current?.dispose();
				handleRef.current = null;
			},
			updateRules(next) {
				latestRulesRef.current = next;
				handleRef.current?.updateRules(next);
			},
			setEnabled(enabled) {
				latestEnabledRef.current = enabled;
				handleRef.current?.setEnabled(enabled);
			},
		};
	}
	const handle = facadeRef.current;

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
		const created = createNetworkBlocker({
			kernel,
			rules: latestRulesRef.current,
			enabled: latestEnabledRef.current,
			logBlockedRequests: options.logBlockedRequests,
			onRequestBlocked: options.onRequestBlocked,
		});
		handleRef.current = created;

		return () => {
			if (handleRef.current === created) {
				handleRef.current = null;
			}
			created.dispose();
		};
	}, [kernel, options.logBlockedRequests, options.onRequestBlocked]);

	return handle;
}

export type { BlockedRequestInfo, NetworkBlockerHandle, NetworkBlockerRule };
