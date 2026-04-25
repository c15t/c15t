'use client';

import {
	type BlockedRequestInfo,
	createNetworkBlocker,
	type NetworkBlockerHandle,
	type NetworkBlockerRule,
} from 'c15t/v3/modules/network-blocker';
import { useEffect, useRef, useState } from 'react';
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
	const [handle] = useState(() =>
		createNetworkBlocker({
			kernel,
			rules: options.rules,
			enabled: options.enabled,
			logBlockedRequests: options.logBlockedRequests,
			onRequestBlocked: options.onRequestBlocked,
		})
	);

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
		return () => handle.dispose();
	}, [handle]);

	return handle;
}

export type { BlockedRequestInfo, NetworkBlockerHandle, NetworkBlockerRule };
