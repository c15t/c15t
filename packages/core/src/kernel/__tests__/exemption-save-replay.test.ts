/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { NOW } from '../../__tests__/fixtures/kernel-fixtures';
import type { SavePayload } from '../../types';
import { createPendingSaveQueue } from '../pending-saves';

const action = (at: number, extra: Partial<SavePayload> = {}): SavePayload => ({
	choice: { categories: {}, version: 3 },
	confirmed: { actionAt: at, categories: {} },
	consentAction: 'custom',
	consents: {
		experience: false,
		functionality: false,
		marketing: false,
		measurement: false,
		necessary: true,
	},
	exemptionPreferences: {
		categories: { measurement: { confirmedAt: at, value: false } },
		version: 1,
	},
	model: 'opt-in',
	overrides: {},
	policySnapshotToken: null,
	subject: { subjectId: 'sub_replay' },
	subjectId: 'sub_replay',
	uiSource: 'dialog',
	user: null,
	...extra,
});
beforeEach(() => {
	window.localStorage.clear();
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});
afterEach(() => {
	vi.useRealTimers();
	window.localStorage.clear();
});

test('queued objection survives a later consent-only action and replays its original time', async () => {
	const sent: SavePayload[] = [];
	const queue = createPendingSaveQueue({
		emit: () => {},
		save: (payload) => {
			sent.push(payload);
			return Promise.resolve({ ok: true });
		},
	});
	const objection = action(NOW - 1);
	await queue.enqueue(objection);
	await queue.discard(
		action(NOW, {
			choice: {
				categories: {
					marketing: {
						basis: { fingerprint: 'choice', kind: 'choice-v1' },
						confirmedAt: NOW,
						value: true,
					},
				},
				version: 3,
			},
			confirmed: { actionAt: NOW, categories: { marketing: true } },
			exemptionPreferences: undefined,
		})
	);
	await queue.replay();
	expect(sent).toEqual([objection]);
});
test('newer reversal supersedes an older queued objection without creating consent', async () => {
	const sent: SavePayload[] = [];
	const queue = createPendingSaveQueue({
		emit: () => {},
		save: (payload) => {
			sent.push(payload);
			return Promise.resolve({ ok: true });
		},
	});
	await queue.enqueue(action(NOW - 1));
	const reversal = action(NOW, {
		exemptionPreferences: {
			categories: { measurement: { confirmedAt: NOW, value: true } },
			version: 1,
		},
	});
	await queue.enqueue(reversal);
	await queue.replay();
	expect(sent).toEqual([reversal]);
	expect(sent[0]?.confirmed.categories).toEqual({});
});

test('a newer preference action keeps the earlier unsent vendor decision independent', async () => {
	const sent: SavePayload[] = [];
	const queue = createPendingSaveQueue({
		emit: () => {},
		save: (payload) => {
			sent.push(payload);
			return Promise.resolve({ ok: true });
		},
	});
	const vendorChoice: NonNullable<SavePayload['vendorChoice']> = {
		confirmedAt: NOW - 1,
		grants: { analytics: false },
		version: 1,
	};
	await queue.enqueue(action(NOW - 1, { vendorChoice }));
	const reversal = action(NOW, {
		exemptionPreferences: {
			categories: { measurement: { confirmedAt: NOW, value: true } },
			version: 1,
		},
	});
	await queue.enqueue(reversal);
	await queue.replay();
	expect(sent).toHaveLength(2);
	expect(sent[0]?.vendorChoice).toEqual(vendorChoice);
	expect(sent[0]?.exemptionPreferences).toBeUndefined();
	expect(sent[0]?.confirmed.categories).toEqual({});
	expect(sent[0]?.confirmed.actionAt).toBe(NOW - 1);
	expect(sent[1]).toEqual(reversal);
});
