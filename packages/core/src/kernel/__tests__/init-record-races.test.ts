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
	'clear keeps the live GPC mask while pending init settles, failure = %s',
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
		const persistence = createPersistence({ kernel, skipHydration: true });
		const pending = kernel.commands.init();
		persistence.clear();
		if (failure) {
			response.reject(new Error('offline'));
		} else {
			response.resolve({ policyResolution: { ...resolution, version: 1 } });
		}
		await pending;
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

test('init preserves a local notice dismissal', async () => {
	const resolution = matchedResolution(noticeRule());
	const dismissal = {
		dismissedAt: NOW - 1000,
		fingerprint: resolution.fingerprints.notice,
		version: 1 as const,
	};
	const kernel = createConsentKernel({
		initialPolicyResolution: resolution,
		initialRecords: { noticeDismissal: dismissal },
		transport: {
			init: () =>
				Promise.resolve({
					policyResolution: { ...resolution, version: 1 },
					records: { noticeDismissal: null },
				}),
		},
	});
	await kernel.commands.init();
	expect(kernel.getSnapshot().noticeDismissal).toEqual(dismissal);
	expect(kernel.getSnapshot().promptRequirement).toEqual({ kind: 'none' });
	kernel.dispose();
});
