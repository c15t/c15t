import type { ConsentStoreState } from 'c15t';
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

export function createDebugBundle(payload: DebugBundlePayload): string {
	const { namespace, devToolsState, connection, recentEvents, storeState } =
		payload;
	const bundle = {
		generatedAt: new Date().toISOString(),
		namespace,
		devToolsState,
		connection,
		recentEvents,
		storeState,
		overrides:
			(storeState?.overrides as Record<string, unknown> | undefined) ?? null,
		iab: (storeState?.iab as Record<string, unknown> | undefined)
			? {
					tcString:
						(storeState?.iab as { tcString?: unknown }).tcString ?? null,
					purposeCount: Object.keys(
						((storeState?.iab as { purposeConsents?: Record<string, unknown> })
							.purposeConsents ?? {}) as Record<string, unknown>
					).length,
					vendorCount: Object.keys(
						((storeState?.iab as { vendorConsents?: Record<string, unknown> })
							.vendorConsents ?? {}) as Record<string, unknown>
					).length,
				}
			: null,
	};

	return JSON.stringify(bundle, null, 2);
}

export function sanitizeStoreState(
	state: ConsentStoreState | null
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
			error: 'Unable to serialize store state',
		};
	}
}

export function downloadDebugBundle(content: string): void {
	const blob = new Blob([content], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = `c15t-debug-bundle-${timestamp}.json`;
	anchor.click();
	URL.revokeObjectURL(url);
}
