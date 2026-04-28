import { describe, expect, test, vi } from 'vitest';
import { createWriteScheduler } from '../schedule';

describe('createWriteScheduler', () => {
	test('coalesces multiple schedule() calls within a microtask into one write', async () => {
		const write = vi.fn();
		const scheduler = createWriteScheduler(write);
		scheduler.schedule();
		scheduler.schedule();
		scheduler.schedule();
		expect(write).not.toHaveBeenCalled();
		await Promise.resolve();
		expect(write).toHaveBeenCalledOnce();
	});

	test('a second schedule after the first microtask fires triggers another write', async () => {
		const write = vi.fn();
		const scheduler = createWriteScheduler(write);
		scheduler.schedule();
		await Promise.resolve();
		scheduler.schedule();
		await Promise.resolve();
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
		await Promise.resolve();
		expect(write).toHaveBeenCalledOnce();
	});
});
