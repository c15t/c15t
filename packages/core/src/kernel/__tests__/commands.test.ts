import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../index';
import type { KernelEvent } from '../../types';

/** Save through the kernel and report what the action recorded. */
const recordSave = async function recordSave(
	kernel: ReturnType<typeof createConsentKernel>,
	...args: Parameters<
		ReturnType<typeof createConsentKernel>['commands']['save']
	>
) {
	let recorded: Extract<KernelEvent, { type: 'choice:recorded' }> | undefined;
	const off = kernel.events.on('choice:recorded', (event) => {
		recorded = event;
	});
	await kernel.commands.save(...args);
	off();
	const values = Object.fromEntries(
		Object.entries(kernel.getSnapshot().explicitChoice?.categories ?? {}).map(
			([category, decision]) => [category, decision?.value]
		)
	);
	return {
		confirmed: [...(recorded?.confirmed ?? [])].sort(),
		consentAction: recorded?.consentAction,
		values,
	};
};

describe('save selection', () => {
	test("'all' confirms the active scope with true", async () => {
		const kernel = createConsentKernel({
			consentCategories: ['marketing', 'measurement'],
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing', 'measurement'] })
			),
			now: NOW,
		});
		expect(await recordSave(kernel, 'all')).toEqual({
			confirmed: ['marketing', 'measurement'],
			consentAction: 'all',
			values: { marketing: true, measurement: true },
		});
	});

	test("'none' confirms the active scope with false", async () => {
		const kernel = createConsentKernel({ now: NOW });
		expect(await recordSave(kernel, 'none')).toEqual({
			confirmed: ['experience', 'functionality', 'marketing', 'measurement'],
			consentAction: 'necessary',
			values: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
			},
		});
	});

	test("'all' over a displayed subset still reports the bulk action", async () => {
		const config = {
			consentCategories: ['experience', 'marketing', 'measurement'] as const,
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing', 'measurement', 'experience'] })
			),
			now: NOW,
		};
		const displayed = ['marketing', 'measurement'] as const;
		expect(
			await recordSave(createConsentKernel({ ...config }), 'all', {
				categories: displayed,
			})
		).toEqual({
			confirmed: ['marketing', 'measurement'],
			consentAction: 'all',
			values: { marketing: true, measurement: true },
		});
		expect(
			await recordSave(createConsentKernel({ ...config }), 'none', {
				categories: displayed,
			})
		).toEqual({
			confirmed: ['marketing', 'measurement'],
			consentAction: 'necessary',
			values: { marketing: false, measurement: false },
		});
	});

	test('object input confirms exactly its own categories', async () => {
		const kernel = createConsentKernel({ now: NOW });
		expect(await recordSave(kernel, { marketing: true })).toEqual({
			confirmed: ['marketing'],
			consentAction: 'custom',
			values: { marketing: true },
		});
	});

	test('object input is validated, not coerced', async () => {
		const kernel = createConsentKernel({ now: NOW });
		const result = await kernel.commands.save({
			marketing: 'yes' as unknown as boolean,
		});
		expect(result.ok).toBe(false);
		expect(result.issues).not.toHaveLength(0);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
	});

	test('no input confirms draft, then explicit, then displayed default', async () => {
		const kernel = createConsentKernel({
			consentCategories: ['experience', 'marketing', 'measurement'],
			initialPolicyResolution: matchedResolution(
				optInRule({
					categories: ['experience', 'marketing', 'measurement'],
					preselectedCategories: ['experience'],
				})
			),
			initialRecords: choiceRecords({ marketing: true }),
			now: NOW,
		});
		kernel.set.draft({ measurement: true });
		expect((await recordSave(kernel)).values).toEqual({
			experience: true,
			marketing: true,
			measurement: true,
		});
	});

	test('no input under opt-out confirms the unmasked default, not the GPC mask', async () => {
		const kernel = createConsentKernel({
			consentCategories: ['marketing'],
			initialOverrides: { gpc: true },
			initialPolicyResolution: matchedResolution(
				optOutRule({
					categories: ['marketing'],
					privacySignals: { gpc: { denyCategories: ['marketing'] } },
				})
			),
			now: NOW,
		});
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect((await recordSave(kernel)).values).toEqual({ marketing: true });
	});
});

describe('displayed category saves', () => {
	afterEach(() => vi.useRealTimers());
	test.each(['all', 'none', undefined] as const)(
		'preserves hidden choices and clocks for %s',
		async (input) => {
			let now = NOW;
			vi.useFakeTimers();
			vi.setSystemTime(now);
			const kernel = createConsentKernel({ now });
			await kernel.commands.save({ marketing: true, measurement: false });
			const hidden = kernel.getSnapshot().explicitChoice?.categories.marketing;
			now += 1000;
			vi.setSystemTime(now);
			const result = await kernel.commands.save(input, {
				categories: ['necessary', 'measurement'],
			});
			expect(result.ok).toBe(true);
			expect(kernel.getSnapshot().explicitChoice?.categories.marketing).toEqual(
				hidden
			);
			expect(
				kernel.getSnapshot().explicitChoice?.categories.measurement
			).toMatchObject({ confirmedAt: now, value: input === 'all' });
			kernel.dispose();
		}
	);
	test('an empty displayed scope records no choice', async () => {
		const kernel = createConsentKernel({ now: NOW });
		await kernel.commands.save('all', { categories: [] });
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		kernel.dispose();
	});
});
