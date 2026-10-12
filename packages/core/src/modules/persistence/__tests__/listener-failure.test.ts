/** @vitest-environment jsdom */
/**
 * Persistence observes committed choices through the kernel's event bus.
 * A throwing or reentrant consumer registered next to it must not keep a
 * committed denial out of storage.
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { NOW } from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { deleteConsentFromStorage } from '../../../libs/cookie';
import { createPersistence } from '../index';
import { readStoredConsentRecord } from '../record-storage';

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
	vi.stubGlobal('reportError', undefined);
	localStorage.clear();
	deleteConsentFromStorage();
});

afterEach(() => {
	deleteConsentFromStorage();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

const storedMeasurement = function storedMeasurement(): boolean | undefined {
	return readStoredConsentRecord(undefined, NOW).selected?.choice?.categories
		.measurement?.value;
};

const fail = () => {
	throw new Error('Consumer failed');
};

test.each([
	['before', true],
	['after', false],
])(
	'throwing consumers registered %s persistence do not block a denial',
	async (_label, consumersFirst) => {
		const kernel = createConsentKernel({ now: NOW });
		const register = () => {
			kernel.subscribe(fail);
			kernel.events.on('choice:recorded', fail);
		};
		if (consumersFirst) {
			register();
		}
		const persistence = createPersistence({ kernel });
		if (!consumersFirst) {
			register();
		}
		try {
			await kernel.commands.save({ measurement: true });
			vi.advanceTimersByTime(0);
			expect(storedMeasurement()).toBe(true);

			const result = await kernel.commands.save({ measurement: false });
			vi.advanceTimersByTime(0);

			expect(result.ok).toBe(true);
			expect(storedMeasurement()).toBe(false);
		} finally {
			persistence.dispose();
			kernel.dispose();
		}
	}
);

test('a consumer that regrants during the denial persists the newest choice', async () => {
	const kernel = createConsentKernel({ now: NOW });
	const persistence = createPersistence({ kernel });
	try {
		await kernel.commands.save({ measurement: true });
		vi.advanceTimersByTime(0);
		let regranted = false;
		kernel.subscribe((snapshot) => {
			if (!regranted && !snapshot.effectivePermissions.measurement) {
				regranted = true;
				void kernel.commands.save({ measurement: true });
			}
		});

		await kernel.commands.save({ measurement: false });
		vi.advanceTimersByTime(0);

		expect(regranted).toBe(true);
		expect(storedMeasurement()).toBe(true);
	} finally {
		persistence.dispose();
		kernel.dispose();
	}
});
