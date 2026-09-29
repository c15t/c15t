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
	identified.resolve(undefined);
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
