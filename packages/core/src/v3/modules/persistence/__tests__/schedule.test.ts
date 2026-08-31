import { describe, expect, test, vi } from 'vitest';

import { createWriteScheduler } from '../schedule';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

const flushScheduledWrite = function flushScheduledWrite(): Promise<void> {
	return createDeferredPromise((resolve) => setTimeout(resolve, 0));
};

describe('createWriteScheduler', () => {
	test('coalesces multiple schedule() calls within a microtask into one write', async () => {
		const write = vi.fn();
		const scheduler = createWriteScheduler(write);
		scheduler.schedule();
		scheduler.schedule();
		scheduler.schedule();
		expect(write).not.toHaveBeenCalled();
		await flushScheduledWrite();
		expect(write).toHaveBeenCalledOnce();
	});

	test('a second schedule after the first microtask fires triggers another write', async () => {
		const write = vi.fn();
		const scheduler = createWriteScheduler(write);
		scheduler.schedule();
		await flushScheduledWrite();
		scheduler.schedule();
		await flushScheduledWrite();
		expect(write).toHaveBeenCalledTimes(2);
	});

	test('flush() runs synchronously when something is scheduled', () => {
		const write = vi.fn();
		const scheduler = createWriteScheduler(write);
		scheduler.schedule();
		scheduler.flush();
		expect(write).toHaveBeenCalledOnce();
	});

	test('flush() is a no-op when nothing is scheduled', () => {
		const write = vi.fn();
		const scheduler = createWriteScheduler(write);
		scheduler.flush();
		expect(write).not.toHaveBeenCalled();
	});

	test('flush() prevents the queued microtask from running again', async () => {
		const write = vi.fn();
		const scheduler = createWriteScheduler(write);
		scheduler.schedule();
		scheduler.flush();
		await flushScheduledWrite();
		expect(write).toHaveBeenCalledOnce();
	});
});
