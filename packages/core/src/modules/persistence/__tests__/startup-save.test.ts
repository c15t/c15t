/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { NOW } from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { deleteConsentFromStorage } from '../../../libs/cookie';
import { STORAGE_KEY_V2 } from '../../../libs/storage-keys';
import { createOfflineTransport } from '../../../transports/offline';
import type { InitResponse } from '../../../types';
import { createPersistence } from '../index';
import { readStoredConsentRecord } from '../record-storage';

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	localStorage.clear();
	deleteConsentFromStorage();
});

afterEach(() => {
	deleteConsentFromStorage();
	vi.useRealTimers();
});

// #1134: v2 startup wrote an old choice back while adding its fingerprint.
// Exercise both orderings of the v3 deferred write against init completion.
test.each([false, true])(
	'a save during startup survives storage and reload, write before init = %s',
	async (writeBeforeInit) => {
		localStorage.setItem(
			STORAGE_KEY_V2,
			JSON.stringify({
				consentInfo: {
					subjectId: 'sub_2VZxR7YmNpKq3WfLs8TgHd',
					time: NOW - 60_000,
				},
				consents: { marketing: true, necessary: true },
			})
		);
		const response = Promise.withResolvers<InitResponse>();
		const offline = createOfflineTransport();
		const kernel = createConsentKernel({
			initialPolicyPending: true,
			now: NOW,
			transport: { init: () => response.promise },
		});
		const persistence = createPersistence({ kernel });
		let reloaded: ReturnType<typeof createConsentKernel> | undefined;
		let reloadedPersistence: ReturnType<typeof createPersistence> | undefined;
		try {
			expect(kernel.getSnapshot().explicitChoice?.categories.marketing).toEqual(
				{
					basis: { kind: 'legacy-v2' },
					confirmedAt: NOW - 60_000,
					value: true,
				}
			);
			const pending = kernel.commands.init();
			expect(kernel.getSnapshot().policyPending).toBe(true);
			kernel.set.draft({ marketing: false });
			const saved = await kernel.commands.save();
			expect(saved.ok).toBe(true);
			const savedChoice = kernel.getSnapshot().explicitChoice;
			expect(savedChoice?.categories.marketing).toMatchObject({
				confirmedAt: NOW,
				value: false,
			});
			if (writeBeforeInit) {
				vi.advanceTimersByTime(0);
			}
			response.resolve(await offline.init({ overrides: {}, user: null }));
			await pending;
			vi.advanceTimersByTime(0);
			expect(kernel.getSnapshot().policyPending).toBe(false);
			expect(kernel.getSnapshot().explicitChoice).toEqual(savedChoice);
			expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
			const stored = readStoredConsentRecord(undefined, NOW);
			expect(stored.selected?.choice).toEqual(savedChoice);
			// The decoder checks both the cookie and localStorage, not just memory.
			const valid = stored.candidates.filter(
				(candidate) => candidate.status === 'valid'
			);
			expect(valid.map((candidate) => candidate.source)).toEqual([
				'cookie',
				'local-storage',
			]);
			expect(valid.map((candidate) => candidate.record.choice)).toEqual([
				savedChoice,
				savedChoice,
			]);
			persistence.dispose();
			kernel.dispose();
			reloaded = createConsentKernel({ now: NOW, transport: offline });
			reloadedPersistence = createPersistence({ kernel: reloaded });
			await reloaded.commands.init();
			expect(reloaded.getSnapshot().explicitChoice).toEqual(savedChoice);
			expect(reloaded.getSnapshot().effectivePermissions.marketing).toBe(false);
		} finally {
			reloadedPersistence?.dispose();
			reloaded?.dispose();
			persistence.dispose();
			kernel.dispose();
		}
	}
);
