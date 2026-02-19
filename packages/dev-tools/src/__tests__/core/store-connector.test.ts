import type { ConsentStoreState } from 'c15t';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import { createStoreConnector } from '../../core/store-connector';

function createMockStore(): StoreApi<ConsentStoreState> {
	const state = {} as ConsentStoreState;
	return {
		getState: () => state,
		getInitialState: () => state,
		setState: () => state,
		subscribe: () => () => {},
	} as unknown as StoreApi<ConsentStoreState>;
}

describe('store-connector', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		delete (window as unknown as Record<string, unknown>).testStore;
	});

	it('keeps retrying and connects when the store appears later', () => {
		const onConnect = vi.fn();
		const onDisconnect = vi.fn();
		const connector = createStoreConnector({
			namespace: 'testStore',
			onConnect,
			onDisconnect,
		});

		// Reaches disconnect notification threshold, but should continue retrying.
		vi.advanceTimersByTime(3200);
		expect(onDisconnect).toHaveBeenCalledTimes(1);
		expect(connector.isConnected()).toBe(false);

		(window as unknown as Record<string, unknown>).testStore =
			createMockStore();
		vi.advanceTimersByTime(2500);

		expect(onConnect).toHaveBeenCalledTimes(1);
		expect(connector.isConnected()).toBe(true);

		connector.destroy();
	});

	it('retryConnection triggers an immediate reconnect attempt', () => {
		const onConnect = vi.fn();
		const connector = createStoreConnector({
			namespace: 'testStore',
			onConnect,
		});

		(window as unknown as Record<string, unknown>).testStore =
			createMockStore();
		connector.retryConnection();
		vi.runOnlyPendingTimers();

		expect(connector.isConnected()).toBe(true);
		expect(onConnect).toHaveBeenCalledTimes(1);

		connector.destroy();
	});
});
