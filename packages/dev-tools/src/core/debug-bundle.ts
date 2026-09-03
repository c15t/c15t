import type { ConsentSnapshot } from '@c15t/core';

import type { DevToolsState, EventLogEntry } from './state-manager';
import type { ConnectionDiagnostics } from './store-connector';

export interface DebugBundlePayload {
	namespace: string;
	devToolsState: Pick<
		DevToolsState,
		'isOpen' | 'activeTab' | 'isConnected' | 'position'
	>;
	connection: ConnectionDiagnostics;
	recentEvents: EventLogEntry[];
	storeState: Record<string, unknown> | null;
}

export const createDebugBundle = function createDebugBundle(
	payload: DebugBundlePayload
): string {
	const { namespace, devToolsState, connection, recentEvents, storeState } =
		payload;
	const iabState = storeState?.iab as
		| {
				purposeConsents?: Record<string, unknown>;
				tcString?: unknown;
				vendorConsents?: Record<string, unknown>;
		  }
		| undefined;
	const bundle = {
		connection,
		devToolsState,
		generatedAt: new Date().toISOString(),
		iab: iabState
			? {
					purposeCount: Object.keys(iabState.purposeConsents ?? {}).length,
					tcString: iabState.tcString ?? null,
					vendorCount: Object.keys(iabState.vendorConsents ?? {}).length,
				}
			: null,
		namespace,
		overrides:
			(storeState?.overrides as Record<string, unknown> | undefined) ?? null,
		recentEvents,
		storeState,
	};

	return JSON.stringify(bundle, null, 2);
};

export const sanitizeStoreState = function sanitizeStoreState(
	state: ConsentSnapshot | null
): Record<string, unknown> | null {
	if (!state) {
		return null;
	}
	try {
		return JSON.parse(
			JSON.stringify(state, (_key, value) =>
				typeof value === 'function' ? undefined : value
			)
		) as Record<string, unknown>;
	} catch {
		return {
			error: 'Unable to serialize kernel snapshot',
		};
	}
};

export const downloadDebugBundle = function downloadDebugBundle(
	content: string
): void {
	const blob = new Blob([content], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const timestamp = new Date().toISOString().replace(/[:.]/gu, '-');
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = `c15t-debug-bundle-${timestamp}.json`;
	anchor.click();
	URL.revokeObjectURL(url);
};
