import { createConsentKernel } from '@c15t/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStoreConnector } from '../../core/store-connector';

describe('store-connector', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		delete (window as unknown as Record<string, unknown>).testKernel;
	});

	it('keeps retrying and connects when the kernel appears later', () => {
		const onConnect = vi.fn();
		const onDisconnect = vi.fn();
		const connector = createStoreConnector({
			namespace: 'testKernel',
			onConnect,
			onDisconnect,
		});

		vi.advanceTimersByTime(3200);
		expect(onDisconnect).toHaveBeenCalledTimes(1);
		expect(connector.isConnected()).toBe(false);

		const kernel = createConsentKernel();
		(window as unknown as Record<string, unknown>).testKernel = kernel;
		vi.advanceTimersByTime(2500);

		expect(onConnect).toHaveBeenCalledWith(kernel.getSnapshot(), kernel);
		expect(connector.isConnected()).toBe(true);

		connector.destroy();
	});

	it('retryConnection triggers an immediate reconnect attempt', () => {
		const onConnect = vi.fn();
		const kernel = createConsentKernel();
		const connector = createStoreConnector({
			namespace: 'testKernel',
			onConnect,
		});

		(window as unknown as Record<string, unknown>).testKernel = kernel;
		connector.retryConnection();
		vi.runOnlyPendingTimers();

		expect(connector.getKernel()).toBe(kernel);
		expect(onConnect).toHaveBeenCalledTimes(1);

		connector.destroy();
	});

	it('connects directly to a supplied kernel', () => {
		const kernel = createConsentKernel();
		const connector = createStoreConnector({ kernel });

		expect(connector.getKernel()).toBe(kernel);
		expect(connector.getState()).toBe(kernel.getSnapshot());

		connector.destroy();
	});

	it('exposes reconnect diagnostics for disconnected state', () => {
		const connector = createStoreConnector({ namespace: 'testKernel' });
		const snapshots: ReturnType<typeof connector.getDiagnostics>[] = [];
		const unsubscribe = connector.subscribeDiagnostics((diagnostics) => {
			snapshots.push(diagnostics);
		});

		vi.advanceTimersByTime(100);

		const latest = connector.getDiagnostics();
		expect(latest.namespace).toBe('testKernel');
		expect(latest.isPolling).toBe(true);
		expect(latest.reconnectAttempts).toBeGreaterThanOrEqual(1);
		expect(latest.lastError).toContain('testKernel');
		expect(snapshots.length).toBeGreaterThan(1);

		unsubscribe();
		connector.destroy();
	});
});
