import type { ConsentStoreState } from 'c15t';
import type { StoreApi } from 'zustand/vanilla';
import type { EventLogEntry } from './state-manager';

type InstrumentationEvent = Omit<EventLogEntry, 'id' | 'timestamp'>;
type InstrumentationListener = (event: InstrumentationEvent) => void;

interface InstrumentationEntry {
	store: StoreApi<ConsentStoreState>;
	listeners: Set<InstrumentationListener>;
	originalCallbacks: {
		onBannerFetched?: unknown;
		onConsentSet?: unknown;
		onConsentChanged?: unknown;
		onError?: unknown;
		onBeforeConsentRevocationReload?: unknown;
	};
	originalNetworkBlockedCallback: unknown;
	wrappedNetworkBlockedCallback: ((payload: unknown) => void) | null;
	stopWatchingStore: (() => void) | null;
}

type InstrumentationRegistry = Map<string, InstrumentationEntry>;

const REGISTRY_KEY = '__c15tDevToolsInstrumentationRegistry';
let fallbackRegistry: InstrumentationRegistry | null = null;

function getRegistry(): InstrumentationRegistry {
	if (typeof window === 'undefined') {
		if (!fallbackRegistry) {
			fallbackRegistry = new Map();
		}
		return fallbackRegistry;
	}

	const host = window as unknown as Record<string, unknown>;
	const existing = host[REGISTRY_KEY] as InstrumentationRegistry | undefined;
	if (existing) {
		return existing;
	}
	const registry: InstrumentationRegistry = new Map();
	host[REGISTRY_KEY] = registry;
	return registry;
}

function getBlockedRequestMessage(payload: unknown): string {
	const data = payload as { method?: unknown; url?: unknown };
	const method =
		typeof data?.method === 'string' ? data.method.toUpperCase() : 'REQUEST';
	const url = typeof data?.url === 'string' ? data.url : 'unknown-url';
	return `Network blocked: ${method} ${url}`;
}

function emitEvent(
	entry: InstrumentationEntry,
	event: InstrumentationEvent
): void {
	for (const listener of entry.listeners) {
		listener(event);
	}
}

function ensureNetworkBlockerWrapped(entry: InstrumentationEntry): void {
	const blocker = entry.store.getState().networkBlocker;
	if (!blocker) {
		return;
	}
	if (blocker.onRequestBlocked === entry.wrappedNetworkBlockedCallback) {
		return;
	}

	entry.originalNetworkBlockedCallback = blocker.onRequestBlocked;
	entry.wrappedNetworkBlockedCallback = (payload: unknown) => {
		emitEvent(entry, {
			type: 'network',
			message: getBlockedRequestMessage(payload),
			data: payload as Record<string, unknown>,
		});

		if (typeof entry.originalNetworkBlockedCallback === 'function') {
			(entry.originalNetworkBlockedCallback as (event: unknown) => void)(
				payload
			);
		}
	};

	entry.store.getState().setNetworkBlocker({
		...blocker,
		onRequestBlocked: entry.wrappedNetworkBlockedCallback,
	});
}

function restoreInstrumentation(entry: InstrumentationEntry): void {
	entry.stopWatchingStore?.();
	entry.stopWatchingStore = null;

	const state = entry.store.getState();
	state.setCallback(
		'onBannerFetched',
		entry.originalCallbacks.onBannerFetched as
			| ConsentStoreState['callbacks']['onBannerFetched']
			| undefined
	);
	state.setCallback(
		'onConsentSet',
		entry.originalCallbacks.onConsentSet as
			| ConsentStoreState['callbacks']['onConsentSet']
			| undefined
	);
	state.setCallback(
		'onConsentChanged',
		entry.originalCallbacks.onConsentChanged as
			| ConsentStoreState['callbacks']['onConsentChanged']
			| undefined
	);
	state.setCallback(
		'onError',
		entry.originalCallbacks.onError as
			| ConsentStoreState['callbacks']['onError']
			| undefined
	);
	state.setCallback(
		'onBeforeConsentRevocationReload',
		entry.originalCallbacks.onBeforeConsentRevocationReload as
			| ConsentStoreState['callbacks']['onBeforeConsentRevocationReload']
			| undefined
	);

	const blocker = state.networkBlocker;
	if (
		blocker &&
		blocker.onRequestBlocked === entry.wrappedNetworkBlockedCallback
	) {
		state.setNetworkBlocker({
			...blocker,
			onRequestBlocked: entry.originalNetworkBlockedCallback as
				| ((payload: unknown) => void)
				| undefined,
		});
	}

	entry.wrappedNetworkBlockedCallback = null;
}

function createInstrumentationEntry(
	store: StoreApi<ConsentStoreState>
): InstrumentationEntry {
	const entry: InstrumentationEntry = {
		store,
		listeners: new Set(),
		originalCallbacks: {
			...store.getState().callbacks,
		},
		originalNetworkBlockedCallback:
			store.getState().networkBlocker?.onRequestBlocked,
		wrappedNetworkBlockedCallback: null,
		stopWatchingStore: null,
	};

	store.getState().setCallback('onBannerFetched', (payload: unknown) => {
		const jurisdiction = (payload as { jurisdiction?: unknown }).jurisdiction;
		emitEvent(entry, {
			type: 'info',
			message: `Banner fetched: ${String(jurisdiction)}`,
			data: payload as Record<string, unknown>,
		});
		if (typeof entry.originalCallbacks.onBannerFetched === 'function') {
			(entry.originalCallbacks.onBannerFetched as (event: unknown) => void)(
				payload
			);
		}
	});

	store.getState().setCallback('onConsentSet', (payload: unknown) => {
		emitEvent(entry, {
			type: 'consent_set',
			message: 'Consent preferences updated',
			data: payload as Record<string, unknown>,
		});
		if (typeof entry.originalCallbacks.onConsentSet === 'function') {
			(entry.originalCallbacks.onConsentSet as (event: unknown) => void)(
				payload
			);
		}
	});

	store.getState().setCallback('onConsentChanged', (payload: unknown) => {
		emitEvent(entry, {
			type: 'consent_save',
			message: 'Consent preferences changed',
			data: payload as Record<string, unknown>,
		});
		if (typeof entry.originalCallbacks.onConsentChanged === 'function') {
			(entry.originalCallbacks.onConsentChanged as (event: unknown) => void)(
				payload
			);
		}
	});

	store.getState().setCallback('onError', (payload: unknown) => {
		const errorMessage = (payload as { error?: unknown }).error;
		emitEvent(entry, {
			type: 'error',
			message: `Error: ${String(errorMessage)}`,
			data: payload as Record<string, unknown>,
		});
		if (typeof entry.originalCallbacks.onError === 'function') {
			(entry.originalCallbacks.onError as (event: unknown) => void)(payload);
		}
	});

	store
		.getState()
		.setCallback('onBeforeConsentRevocationReload', (payload: unknown) => {
			emitEvent(entry, {
				type: 'info',
				message: 'Consent revocation - page will reload',
				data: payload as Record<string, unknown>,
			});
			if (
				typeof entry.originalCallbacks.onBeforeConsentRevocationReload ===
				'function'
			) {
				(
					entry.originalCallbacks.onBeforeConsentRevocationReload as (
						event: unknown
					) => void
				)(payload);
			}
		});

	ensureNetworkBlockerWrapped(entry);
	entry.stopWatchingStore = store.subscribe(() => {
		ensureNetworkBlockerWrapped(entry);
	});

	return entry;
}

interface InstrumentationOptions {
	namespace: string;
	store: StoreApi<ConsentStoreState>;
	onEvent: InstrumentationListener;
}

export function registerStoreInstrumentation(
	options: InstrumentationOptions
): () => void {
	const { namespace, store, onEvent } = options;
	const registry = getRegistry();
	let entry = registry.get(namespace);

	if (!entry || entry.store !== store) {
		if (entry) {
			restoreInstrumentation(entry);
		}
		entry = createInstrumentationEntry(store);
		registry.set(namespace, entry);
	}

	entry.listeners.add(onEvent);

	return () => {
		const current = registry.get(namespace);
		if (!current) {
			return;
		}

		current.listeners.delete(onEvent);
		if (current.listeners.size === 0) {
			restoreInstrumentation(current);
			registry.delete(namespace);
		}
	};
}
