import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
	explicitChoice,
	matchedResolution,
	noticeRule,
	NOW,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createPersistence } from '../../modules/persistence';
import type { InitResponse } from '../../types';
import { createConsentKernel } from '../index';

const pendingResponse = function pendingResponse() {
	return Promise.withResolvers<InitResponse>();
};

const oldRecords = {
	choice: explicitChoice({ marketing: true }, { legacy: true }),
	subject: { subjectId: 'sub_old' },
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});

afterEach(() => {
	vi.useRealTimers();
});

test.each([false, true])(
	'clear discards pending init records with existing records = %s',
	async (existing) => {
		const response = pendingResponse();
		const resolution = matchedResolution(optInRule({ id: 'new-policy' }));
		const kernel = createConsentKernel({
			initialRecords: existing ? oldRecords : undefined,
			transport: { init: () => response.promise },
		});
		const persistence = createPersistence({ kernel, skipHydration: true });
		const pending = kernel.commands.init();
		persistence.clear();
		response.resolve({
			policyResolution: { ...resolution, version: 1 },
			records: oldRecords,
			subjectId: 'sub_old',
		});
		await pending;
		expect(kernel.getSnapshot().resolution).toEqual(resolution);
		expect(kernel.getSnapshot().subject).toBeNull();
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		persistence.dispose();
		kernel.dispose();
	}
);

test.each([false, true])(
	'clear prevents pending init from re-recording GPC on failure = %s',
	async (failure) => {
		const response = pendingResponse();
		const resolution = matchedResolution(
			noticeRule({
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
			})
		);
		const kernel = createConsentKernel({
			initialPolicyResolution: resolution,
			initialPrivacySignals: { gpc: true },
			transport: { init: () => response.promise },
		});
		const recorded = vi.fn();
		kernel.events.on('privacy:opt-out', recorded);
		const persistence = createPersistence({ kernel, skipHydration: true });
		const pending = kernel.commands.init();
		persistence.clear();
		if (failure) {
			response.reject(new Error('offline'));
		} else {
			response.resolve({ policyResolution: { ...resolution, version: 1 } });
		}
		await pending;
		expect(kernel.getSnapshot().optOutDirectives).toEqual([]);
		expect(recorded).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		persistence.dispose();
		kernel.dispose();
	}
);

test('a save establishing a subject supersedes pending init identity', async () => {
	const response = pendingResponse();
	const kernel = createConsentKernel({
		transport: { init: () => response.promise },
	});
	const pending = kernel.commands.init();
	await kernel.commands.save({ marketing: false });
	const saved = kernel.getSnapshot();
	response.resolve({
		policyResolution: { policy: null, status: 'unconfigured', version: 1 },
		records: oldRecords,
		subjectId: 'sub_old',
	});
	await pending;
	expect(kernel.getSnapshot().subject).toEqual(saved.subject);
	expect(kernel.getSnapshot().explicitChoice).toEqual(saved.explicitChoice);
	kernel.dispose();
});

test('privacy forwarding retries failure and acknowledges each subject separately', async () => {
	const directive = {
		categories: ['marketing'] as const,
		recordedAt: NOW - 1000,
		source: 'gpc' as const,
	};
	const send = vi
		.fn()
		.mockRejectedValueOnce(new Error('offline'))
		.mockResolvedValue(undefined);
	const kernel = createConsentKernel({
		initialRecords: {
			optOutDirectives: [
				{ ...directive, categories: [...directive.categories] },
			],
			subject: { subjectId: 'sub_first' },
		},
		transport: { recordPrivacyOptOut: send },
	});
	const user = { externalId: 'person' };
	await kernel.commands.identify(user);
	await vi.advanceTimersByTimeAsync(0);
	await kernel.commands.identify(user);
	await vi.advanceTimersByTimeAsync(0);
	expect(send).toHaveBeenCalledTimes(2);
	expect(send).toHaveBeenLastCalledWith(directive, 'sub_first');
	await kernel.commands.identify(user);
	expect(send).toHaveBeenCalledTimes(2);
	kernel.hydrate({ subject: { subjectId: 'sub_second' } });
	await kernel.commands.identify(user);
	await vi.advanceTimersByTimeAsync(0);
	expect(send).toHaveBeenCalledTimes(3);
	expect(send).toHaveBeenLastCalledWith(directive, 'sub_second');
	kernel.dispose();
});

test('init preserves a local notice dismissal and standing directive', async () => {
	const resolution = matchedResolution(noticeRule());
	const directive = {
		categories: ['marketing'] as const,
		recordedAt: NOW - 1000,
		source: 'gpc' as const,
	};
	const dismissal = {
		dismissedAt: NOW - 1000,
		fingerprint: resolution.fingerprints.notice,
		version: 1 as const,
	};
	const kernel = createConsentKernel({
		initialPolicyResolution: resolution,
		initialRecords: {
			noticeDismissal: dismissal,
			optOutDirectives: [
				{ ...directive, categories: [...directive.categories] },
			],
		},
		transport: {
			init: () =>
				Promise.resolve({
					policyResolution: { ...resolution, version: 1 },
					records: { noticeDismissal: null, optOutDirectives: [] },
				}),
		},
	});
	await kernel.commands.init();
	expect(kernel.getSnapshot().noticeDismissal).toEqual(dismissal);
	expect(kernel.getSnapshot().optOutDirectives).toEqual([directive]);
	expect(kernel.getSnapshot().promptRequirement).toEqual({ kind: 'none' });
	expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
	kernel.dispose();
});
