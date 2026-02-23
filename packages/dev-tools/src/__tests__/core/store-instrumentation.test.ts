import type { ConsentStoreState } from 'c15t';
import { describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import { registerStoreInstrumentation } from '../../core/store-instrumentation';

function createMockStore(): StoreApi<ConsentStoreState> {
	const listeners = new Set<(state: ConsentStoreState) => void>();
	const state = {
		callbacks: {
			onBannerFetched: undefined,
			onConsentSet: undefined,
			onError: undefined,
			onBeforeConsentRevocationReload: undefined,
		},
		networkBlocker: undefined,
		setCallback: (name: string, callback: unknown) => {
			(state.callbacks as Record<string, unknown>)[name] = callback;
		},
		setNetworkBlocker: (networkBlocker: unknown) => {
			state.networkBlocker =
				networkBlocker as ConsentStoreState['networkBlocker'];
			for (const listener of listeners) {
				listener(state as unknown as ConsentStoreState);
			}
		},
	} as unknown as ConsentStoreState;

	return {
		getState: () => state,
		getInitialState: () => state,
		setState: () => state,
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	} as unknown as StoreApi<ConsentStoreState>;
}

describe('store instrumentation', () => {
	it('fans out callback events to all subscribers and restores originals', () => {
		const store = createMockStore();
		const originalConsentSet = vi.fn();
		store.getState().setCallback('onConsentSet', originalConsentSet);

		const eventsA: string[] = [];
		const eventsB: string[] = [];
		const cleanupA = registerStoreInstrumentation({
			namespace: 'testStore',
			store,
			onEvent: (event) => eventsA.push(event.type),
		});
		const cleanupB = registerStoreInstrumentation({
			namespace: 'testStore',
			store,
			onEvent: (event) => eventsB.push(event.type),
		});

		const wrappedConsentSet = store.getState().callbacks.onConsentSet as
			| ((payload: unknown) => void)
			| undefined;
		wrappedConsentSet?.({ preferences: { measurement: true } });

		expect(eventsA).toEqual(['consent_set']);
		expect(eventsB).toEqual(['consent_set']);
		expect(originalConsentSet).toHaveBeenCalledTimes(1);

		cleanupA();
		wrappedConsentSet?.({ preferences: { marketing: false } });
		expect(eventsA).toEqual(['consent_set']);
		expect(eventsB).toEqual(['consent_set', 'consent_set']);

		cleanupB();
		const restoredConsentSet = store.getState().callbacks.onConsentSet as
			| ((payload: unknown) => void)
			| undefined;
		restoredConsentSet?.({ preferences: { necessary: true } });
		expect(originalConsentSet).toHaveBeenCalledTimes(3);
	});

	it('wraps and restores network blocker callback', () => {
		const store = createMockStore();
		const originalBlocked = vi.fn();
		store.getState().setNetworkBlocker({
			onRequestBlocked: originalBlocked,
		});

		const received: string[] = [];
		const cleanup = registerStoreInstrumentation({
			namespace: 'testStore-network',
			store,
			onEvent: (event) => {
				received.push(event.type);
			},
		});

		const wrapped = store.getState().networkBlocker?.onRequestBlocked as
			| ((payload: unknown) => void)
			| undefined;
		expect(wrapped).toBeTypeOf('function');
		expect(wrapped).not.toBe(originalBlocked);

		wrapped?.({ method: 'GET', url: 'https://example.com/pixel' });
		expect(received).toContain('network');
		expect(originalBlocked).toHaveBeenCalledTimes(1);

		cleanup();
		expect(store.getState().networkBlocker?.onRequestBlocked).toBe(
			originalBlocked
		);
	});
});
