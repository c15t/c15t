/**
 * Snapshot subscribers and event listeners observe committed transitions.
 * A listener that throws cannot hide a transition from the others or fail
 * the command that caused it, and a listener that updates consent while
 * being notified cannot reorder or skip transitions for later listeners.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { NOW } from '../../__tests__/fixtures/kernel-fixtures';
import type { ConsentKernel, KernelEvent } from '../../types';
import { MAX_DELIVERY_DEPTH } from '../dispatch';
import { createConsentKernel } from '../index';

let reported: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	reported = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

const grantedKernel = async function grantedKernel(): Promise<ConsentKernel> {
	const kernel = createConsentKernel({ now: NOW });
	await kernel.commands.save({ measurement: true });
	expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(true);
	return kernel;
};

const failure = new Error('Subscriber failed');
const fail = () => {
	throw failure;
};

describe('a throwing subscriber', () => {
	test.each([
		['before', 0],
		['between', 1],
		['after', 2],
	])('registered %s the others does not hide a denial', async (_label, at) => {
		const kernel = await grantedKernel();
		const observed: boolean[][] = [[], []];
		const observers = observed.map(
			(values) => (snapshot: ReturnType<ConsentKernel['getSnapshot']>) => {
				values.push(snapshot.effectivePermissions.measurement);
			}
		);
		observers.splice(at, 0, fail);
		for (const listener of observers) {
			kernel.subscribe(listener);
		}
		const recorded = vi.fn();
		kernel.events.on('choice:recorded', recorded);

		const result = await kernel.commands.save({ measurement: false });

		expect(result.ok).toBe(true);
		expect(observed).toEqual([[false], [false]]);
		expect(recorded).toHaveBeenCalledOnce();
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(reported).toHaveBeenCalledWith(
			expect.stringContaining('[c15t]'),
			failure
		);
	});

	test('a throwing event listener does not hide the event from others', async () => {
		const kernel = await grantedKernel();
		kernel.events.on('choice:recorded', fail);
		kernel.events.on('permissions:changed', fail);
		const recorded = vi.fn();
		const changed = vi.fn();
		kernel.events.on('choice:recorded', recorded);
		kernel.events.on('permissions:changed', changed);

		const result = await kernel.commands.save({ measurement: false });

		expect(result.ok).toBe(true);
		expect(recorded).toHaveBeenCalledOnce();
		expect(changed).toHaveBeenCalledOnce();
		expect(reported).toHaveBeenCalledTimes(2);
	});

	test('reports through reportError when the platform provides it', async () => {
		const reportError = vi.fn();
		vi.stubGlobal('reportError', reportError);
		const kernel = await grantedKernel();
		kernel.subscribe(fail);

		await kernel.commands.save({ measurement: false });

		expect(reportError).toHaveBeenCalledWith(failure);
		expect(reported).not.toHaveBeenCalled();
	});

	test('a throwing reporter cannot recurse into delivery', async () => {
		vi.stubGlobal('reportError', fail);
		const kernel = await grantedKernel();
		const observed: boolean[] = [];
		kernel.subscribe(fail);
		kernel.subscribe((snapshot) => {
			observed.push(snapshot.effectivePermissions.measurement);
		});

		const result = await kernel.commands.save({ measurement: false });

		expect(result.ok).toBe(true);
		expect(observed).toEqual([false]);
	});

	test('a synchronous setter still notifies every subscriber', () => {
		const kernel = createConsentKernel({ now: NOW });
		kernel.subscribe(fail);
		const listener = vi.fn();
		kernel.subscribe(listener);

		expect(() => kernel.set.language('de')).not.toThrow();

		expect(listener).toHaveBeenCalledOnce();
		expect(listener).toHaveBeenCalledWith(kernel.getSnapshot());
	});
});

describe('a subscriber that updates consent while notified', () => {
	const regrantOnce = function regrantOnce(kernel: ConsentKernel) {
		let done = false;
		return (snapshot: ReturnType<ConsentKernel['getSnapshot']>) => {
			if (!done && !snapshot.effectivePermissions.measurement) {
				done = true;
				void kernel.commands.save({ measurement: true });
			}
		};
	};

	test.each([
		['before', true],
		['after', false],
	])(
		'registered %s an observer keeps the intervening denial',
		async (_label, nestedFirst) => {
			const kernel = await grantedKernel();
			const observed: boolean[] = [];
			const observer = (snapshot: ReturnType<ConsentKernel['getSnapshot']>) => {
				observed.push(snapshot.effectivePermissions.measurement);
			};
			const nested = regrantOnce(kernel);
			kernel.subscribe(nestedFirst ? nested : observer);
			kernel.subscribe(nestedFirst ? observer : nested);

			await kernel.commands.save({ measurement: false });
			await vi.runAllTimersAsync();

			expect(observed).toEqual([false, true]);
			expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(true);
		}
	);

	test('a nested update reaches every subscriber before it returns', async () => {
		const kernel = createConsentKernel({ now: NOW });
		const observed: boolean[] = [];
		let seenByNestedCaller: boolean[] = [];
		kernel.subscribe((snapshot) => {
			if (snapshot.effectivePermissions.measurement) {
				void kernel.commands.save({ measurement: false });
				seenByNestedCaller = [...observed];
			}
		});
		kernel.subscribe((snapshot) => {
			observed.push(snapshot.effectivePermissions.measurement);
		});

		await kernel.commands.save({ measurement: true });

		// A listener mid-work (a script mount) must learn about a revocation
		// it caused before its own call returns.
		expect(seenByNestedCaller).toEqual([true, false]);
		expect(observed).toEqual([true, false]);
	});

	test('events arrive in commit order and carry their own snapshot', async () => {
		const kernel = await grantedKernel();
		kernel.subscribe(regrantOnce(kernel));
		const log: string[] = [];
		const record = (event: KernelEvent) => {
			if (event.type === 'choice:recorded') {
				log.push(`recorded:${event.snapshot.effectivePermissions.measurement}`);
			}
			if (event.type === 'permissions:changed') {
				log.push(
					`changed:${event.previous.measurement}->${event.snapshot.effectivePermissions.measurement}`
				);
			}
		};
		kernel.events.on('choice:recorded', record);
		kernel.events.on('permissions:changed', record);

		const denied = kernel.commands.save({ measurement: false });

		// Delivery is synchronous: every transition landed before the save
		// yielded to the transport.
		expect(log).toEqual([
			'changed:true->false',
			'recorded:false',
			'changed:false->true',
			'recorded:true',
		]);
		expect((await denied).ok).toBe(true);
	});

	test('subscribers that keep flipping consent are cut off, not looped forever', async () => {
		const kernel = await grantedKernel();
		let calls = 0;
		kernel.subscribe((snapshot) => {
			calls += 1;
			void kernel.commands.save({
				measurement: !snapshot.effectivePermissions.measurement,
			});
		});

		await kernel.commands.save({ measurement: false });

		expect(calls).toBeLessThanOrEqual(MAX_DELIVERY_DEPTH);
		expect(reported).toHaveBeenCalledWith(
			expect.stringContaining('[c15t]'),
			expect.objectContaining({
				message: expect.stringContaining('pending notifications were dropped'),
			})
		);
	});

	test('a subscriber added during delivery waits for the next transition', async () => {
		const kernel = await grantedKernel();
		const late = vi.fn();
		let added = false;
		kernel.subscribe(() => {
			if (!added) {
				added = true;
				kernel.subscribe(late);
			}
		});

		await kernel.commands.save({ measurement: false });
		expect(late).not.toHaveBeenCalled();

		await kernel.commands.save({ measurement: true });
		expect(late).toHaveBeenCalledOnce();
	});
});

describe('unsubscribing during delivery', () => {
	test('a subscriber removed by an earlier one is not called', async () => {
		const kernel = await grantedKernel();
		const removed = vi.fn();
		let unsubscribe = (): void => undefined;
		kernel.subscribe(() => unsubscribe());
		unsubscribe = kernel.subscribe(removed);

		await kernel.commands.save({ measurement: false });

		expect(removed).not.toHaveBeenCalled();
	});

	test('a subscriber can remove itself and later ones still run', async () => {
		const kernel = await grantedKernel();
		let unsubscribe = (): void => undefined;
		const self = vi.fn(() => unsubscribe());
		unsubscribe = kernel.subscribe(self);
		const later = vi.fn();
		kernel.subscribe(later);

		await kernel.commands.save({ measurement: false });
		await kernel.commands.save({ measurement: true });

		expect(self).toHaveBeenCalledOnce();
		expect(later).toHaveBeenCalledTimes(2);
	});

	test('a subscriber removed and added again waits for the next transition', async () => {
		const kernel = await grantedKernel();
		const observed: boolean[] = [];
		const readd = (snapshot: ReturnType<ConsentKernel['getSnapshot']>) => {
			observed.push(snapshot.effectivePermissions.measurement);
		};
		let unsubscribe = (): void => undefined;
		let resubscribed = false;
		kernel.subscribe(() => {
			if (!resubscribed) {
				resubscribed = true;
				unsubscribe();
				kernel.subscribe(readd);
			}
		});
		unsubscribe = kernel.subscribe(readd);

		await kernel.commands.save({ measurement: false });
		expect(observed).toEqual([]);

		await kernel.commands.save({ measurement: true });
		expect(observed).toEqual([true]);
	});

	test('an old unsubscribe does not remove a later subscription', async () => {
		const kernel = await grantedKernel();
		const listener = vi.fn();
		const first = kernel.subscribe(listener);
		first();
		kernel.subscribe(listener);
		first();

		await kernel.commands.save({ measurement: false });

		expect(listener).toHaveBeenCalledOnce();
	});

	test('subscribing a function twice registers it once', async () => {
		const kernel = await grantedKernel();
		const listener = vi.fn();
		kernel.subscribe(listener);
		const second = kernel.subscribe(listener);

		await kernel.commands.save({ measurement: false });
		expect(listener).toHaveBeenCalledOnce();

		second();
		await kernel.commands.save({ measurement: true });
		expect(listener).toHaveBeenCalledOnce();
	});

	test('an event listener removed and added again waits for the next event', async () => {
		const kernel = await grantedKernel();
		const recorded = vi.fn();
		let off = (): void => undefined;
		let readded = false;
		kernel.events.on('choice:recorded', () => {
			if (!readded) {
				readded = true;
				off();
				kernel.events.on('choice:recorded', recorded);
			}
		});
		off = kernel.events.on('choice:recorded', recorded);

		await kernel.commands.save({ measurement: false });
		expect(recorded).not.toHaveBeenCalled();

		await kernel.commands.save({ measurement: true });
		expect(recorded).toHaveBeenCalledOnce();
	});

	test('an event listener removed by an earlier one is not called', async () => {
		const kernel = await grantedKernel();
		const removed = vi.fn();
		let off = (): void => undefined;
		kernel.events.on('choice:recorded', () => off());
		off = kernel.events.on('choice:recorded', removed);

		await kernel.commands.save({ measurement: false });

		expect(removed).not.toHaveBeenCalled();
	});
});

test('subscribers receive the frozen snapshot that was committed', async () => {
	const kernel = await grantedKernel();
	const received: ReturnType<ConsentKernel['getSnapshot']>[] = [];
	kernel.subscribe((snapshot) => {
		received.push(snapshot);
	});

	await kernel.commands.save({ measurement: false });

	expect(received).toHaveLength(1);
	expect(received[0]).toBe(kernel.getSnapshot());
	expect(Object.isFrozen(received[0])).toBe(true);
});
