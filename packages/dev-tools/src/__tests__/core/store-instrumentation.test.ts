import type { ConsentStoreState } from '@c15t/core';
import { describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';

import { registerStoreInstrumentation } from '../../core/store-instrumentation';

const createMockStore =
	function createMockStore(): StoreApi<ConsentStoreState> {
		const listeners = new Set<(state: ConsentStoreState) => void>();
		const state = {
			callbacks: {
				onBannerFetched: undefined,
				onBeforeConsentRevocationReload: undefined,
				onConsentChanged: undefined,
				onConsentSet: undefined,
				onError: undefined,
			},
			networkBlocker: undefined,
			setCallback: (name: string, handler: unknown) => {
				(state.callbacks as Record<string, unknown>)[name] = handler;
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
			getInitialState: () => state,
			getState: () => state,
			setState: () => state,
			subscribe: (listener) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			},
		} as unknown as StoreApi<ConsentStoreState>;
	};

describe('store instrumentation', () => {
	it('fans out callback events to all subscribers and restores originals', () => {
		const store = createMockStore();
		const originalConsentSet = vi.fn();
		store.getState().setCallback('onConsentSet', originalConsentSet);

		const eventsA: string[] = [];
		const eventsB: string[] = [];
		const cleanupA = registerStoreInstrumentation({
			namespace: 'testStore',
			onEvent: (event) => eventsA.push(event.type),
			store,
		});
		const cleanupB = registerStoreInstrumentation({
			namespace: 'testStore',
			onEvent: (event) => eventsB.push(event.type),
			store,
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

	it('logs onConsentChanged as consent_save and restores originals', () => {
		const store = createMockStore();
		const originalConsentChanged = vi.fn();
		store.getState().setCallback('onConsentChanged', originalConsentChanged);

		const events: string[] = [];
		const cleanup = registerStoreInstrumentation({
			namespace: 'testStore-consent-changed',
			onEvent: (event) => events.push(event.type),
			store,
		});

		const wrappedConsentChanged = store.getState().callbacks
			.onConsentChanged as ((payload: unknown) => void) | undefined;
		wrappedConsentChanged?.({
			allowedCategories: ['necessary', 'measurement'],
		});

		expect(events).toEqual(['consent_save']);
		expect(originalConsentChanged).toHaveBeenCalledTimes(1);

		cleanup();
		const restoredConsentChanged = store.getState().callbacks
			.onConsentChanged as ((payload: unknown) => void) | undefined;
		restoredConsentChanged?.({ allowedCategories: ['necessary'] });
		expect(originalConsentChanged).toHaveBeenCalledTimes(2);
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
			onEvent: (event) => {
				received.push(event.type);
			},
			store,
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
