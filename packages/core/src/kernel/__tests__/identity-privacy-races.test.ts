import { afterEach, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	noticeRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createPersistence } from '../../modules/persistence';
import type { KernelConfig } from '../../types';
import { createConsentKernel } from '../index';

const disposers: (() => void)[] = [];
afterEach(() => {
	for (const dispose of disposers.splice(0)) {
		dispose();
	}
	vi.restoreAllMocks();
});

const setup = (config: KernelConfig = {}) => {
	const kernel = createConsentKernel({
		initialPolicyResolution: matchedResolution(
			noticeRule({
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
			})
		),
		...config,
	});
	disposers.push(kernel.dispose);
	return kernel;
};

test.each([false, true])(
	'identified init forwards stored directives with active GPC = %s',
	async (active) => {
		const recordPrivacyOptOut = vi.fn(async () => {});
		const directive = {
			categories: ['marketing' as const],
			recordedAt: Date.now() - 1000,
			source: 'gpc' as const,
		};
		const kernel = setup({
			initialPrivacySignals: { gpc: active },
			initialRecords: {
				optOutDirectives: [directive],
				subject: { subjectId: 'canonical' },
			},
			initialUser: { externalId: 'person' },
			transport: { recordPrivacyOptOut },
		});
		const recorded = vi.fn();
		kernel.events.on('privacy:opt-out', recorded);
		expect(recordPrivacyOptOut).not.toHaveBeenCalled();
		await kernel.commands.init();
		await Promise.resolve();
		expect(recordPrivacyOptOut).toHaveBeenCalledExactlyOnceWith(
			directive,
			'canonical'
		);
		expect(recorded).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
	}
);

test('clear cancels late identify before a replacement subject is read', async () => {
	const identified = Promise.withResolvers<undefined>();
	const loadSubjectRecord = vi.fn(() => Promise.resolve(null));
	const kernel = setup({
		transport: { identify: () => identified.promise, loadSubjectRecord },
	});
	kernel.set.subjectId('old');
	const pending = kernel.commands.identify({ externalId: 'old-user' });
	const persistence = createPersistence({ kernel, skipHydration: true });
	disposers.push(persistence.dispose);
	persistence.clear();
	kernel.set.subjectId('new');
	identified.resolve();
	await pending;
	expect(loadSubjectRecord).not.toHaveBeenCalled();
	expect(kernel.getSnapshot().subject?.subjectId).toBe('new');
});

test('failed save acknowledgement preserves subject and local denial', async () => {
	const kernel = setup({
		transport: {
			save: () => Promise.resolve({ ok: false, subjectId: 'wrong' }),
		},
	});
	kernel.set.subjectId('old');
	const result = await kernel.commands.save({ marketing: false });
	expect(result.ok).toBe(false);
	expect(kernel.getSnapshot().subject?.subjectId).toBe('old');
	expect(kernel.getSnapshot().explicitChoice?.categories.marketing?.value).toBe(
		false
	);
});

test.each([false, true])(
	'hydrating unchanged privacy records does not notify subscribers, populated = %s',
	(populated) => {
		const optOutDirectives = populated
			? [
					{
						categories: ['marketing' as const],
						recordedAt: Date.now() - 1000,
						source: 'gpc' as const,
					},
				]
			: [];
		const kernel = setup({ initialRecords: { optOutDirectives } });
		const changed = vi.fn();
		kernel.subscribe(changed);
		const result = kernel.hydrate({
			optOutDirectives: structuredClone(optOutDirectives),
		});
		expect(result).toEqual({ changed: false, ok: true });
		expect(changed).not.toHaveBeenCalled();
		const updated = {
			categories: ['marketing' as const],
			recordedAt: Date.now(),
			source: 'gpc' as const,
		};
		expect(kernel.hydrate({ optOutDirectives: [updated] })).toEqual({
			changed: true,
			ok: true,
		});
		expect(changed).toHaveBeenCalledTimes(1);
		expect(kernel.getSnapshot().optOutDirectives).toEqual([updated]);
	}
);
