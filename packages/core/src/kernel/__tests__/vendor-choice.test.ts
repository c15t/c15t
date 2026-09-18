/**
 * Vendor-level consent through the kernel's public boundaries: hydration,
 * save, bulk actions, events, the transport payload and replay narrowing.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	iabRule,
	matchedResolution,
	noneRule,
	NOW,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../index';
import type {
	KernelVendorsState,
	SavePayload,
	KernelTransport,
} from '../../types';
import { applyInitResponse } from '../apply-init-response';
import { validateVendorChoice } from '../records';
import { selectSavePayload } from '../save-selection';
import { buildInitialSnapshot } from '../snapshot';

afterEach(() => {
	vi.restoreAllMocks();
});

const vendors: KernelVendorsState = {
	declared: [
		{
			category: 'marketing',
			id: 'meta-pixel',
			name: 'Meta Pixel',
			presentable: true,
			privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
			source: 'config',
		},
		{
			category: 'measurement',
			id: 'google-analytics',
			name: 'Google Analytics',
			presentable: true,
			privacyPolicyUrl: 'https://policies.google.com/privacy',
			source: 'config',
		},
		{
			category: 'necessary',
			disabled: true,
			id: 'cdn',
			name: 'CDN',
			presentable: true,
			privacyPolicyUrl: 'https://cdn.example/privacy',
			source: 'config',
		},
	],
	listVersion: '2026-09',
};

const createKernel = function createKernel(
	overrides: Parameters<typeof createConsentKernel>[0] = {}
) {
	vi.spyOn(Date, 'now').mockReturnValue(NOW);
	return createConsentKernel({
		initialPolicyResolution: matchedResolution(
			optInRule({ categories: ['marketing', 'measurement'] })
		),
		initialVendors: vendors,
		now: NOW,
		...overrides,
	});
};

describe('validateVendorChoice', () => {
	test('accepts, dedupes and sorts a denial list', () => {
		expect(
			validateVendorChoice(
				{ confirmedAt: NOW - 1, denied: ['b', 'a', 'b'], version: 1 },
				NOW
			)
		).toEqual({
			ok: true,
			record: { confirmedAt: NOW - 1, denied: ['a', 'b'], version: 1 },
		});
	});

	test.each([
		['future time', { confirmedAt: NOW + 1, denied: [], version: 1 }],
		['unknown version', { confirmedAt: NOW, denied: [], version: 2 }],
		['unknown key', { confirmedAt: NOW, denied: [], extra: 1, version: 1 }],
		['empty id', { confirmedAt: NOW, denied: [''], version: 1 }],
		['non-array', { confirmedAt: NOW, denied: 'a', version: 1 }],
	])('rejects %s', (_label, input) => {
		expect(validateVendorChoice(input, NOW).ok).toBe(false);
	});
});

describe('snapshot vendor state', () => {
	test('an empty declared list still keeps its version', () => {
		const snap = buildInitialSnapshot({
			initialVendors: { declared: [], listVersion: '2026-09' },
			now: NOW,
		});
		expect(snap.vendors).toEqual({ declared: [], listVersion: '2026-09' });
	});

	test('construction copies declared vendors and seeds no denial', () => {
		const snap = buildInitialSnapshot({ initialVendors: vendors, now: NOW });
		expect(snap.vendors?.declared).toHaveLength(3);
		expect(snap.vendors?.listVersion).toBe('2026-09');
		expect(snap.vendorChoice).toBeNull();
		expect(Object.isFrozen(snap.vendors)).toBe(true);
		expect(Object.isFrozen(snap.vendors?.declared)).toBe(true);
	});

	test('hydration applies a stored denial list without a choice event', () => {
		const kernel = createKernel();
		const recorded = vi.fn();
		kernel.events.on('vendors:recorded', recorded);
		const result = kernel.hydrate({
			now: NOW,
			vendorChoice: {
				confirmedAt: NOW - 5,
				denied: ['meta-pixel'],
				version: 1,
			},
		});
		expect(result).toEqual({ changed: true, ok: true });
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual(['meta-pixel']);
		expect(Object.isFrozen(kernel.getSnapshot().vendorChoice)).toBe(true);
		expect(recorded).not.toHaveBeenCalled();
		kernel.dispose();
	});

	test('a malformed stored denial list rejects the whole hydration', () => {
		const kernel = createKernel();
		const result = kernel.hydrate({
			now: NOW,
			vendorChoice: { confirmedAt: NOW + 1, denied: [], version: 1 },
		});
		expect(result.ok).toBe(false);
		expect(kernel.getSnapshot().vendorChoice).toBeNull();
		kernel.dispose();
	});

	test('set.vendors merges declarations and emits once per change', () => {
		const kernel = createKernel({ initialVendors: undefined });
		const set = vi.fn();
		kernel.events.on('vendors:set', set);
		kernel.set.vendors({ declared: vendors.declared });
		kernel.set.vendors({ declared: vendors.declared });
		expect(set).toHaveBeenCalledOnce();
		expect(kernel.getSnapshot().vendors?.declared).toHaveLength(3);
		kernel.dispose();
	});
});

describe('save with vendors', () => {
	test('a vendor-only save records, persists an event and sends the grant map', async () => {
		const save = vi.fn<NonNullable<KernelTransport['save']>>(() =>
			Promise.resolve({ ok: true })
		);
		const kernel = createKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
			transport: { save },
		});
		const choice = vi.fn();
		const recorded = vi.fn();
		kernel.events.on('choice:recorded', choice);
		kernel.events.on('vendors:recorded', recorded);
		const before = kernel.getSnapshot();

		// An empty category object confirms no category; only the vendor moves.
		const result = await kernel.commands.save(
			{},
			{
				vendors: { 'meta-pixel': false },
			}
		);
		expect(result.ok).toBe(true);
		expect(result.confirmed).toEqual([]);
		const after = kernel.getSnapshot();
		expect(after.vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: ['meta-pixel'],
			version: 1,
		});
		// Category receipts are untouched: no renewed timestamps.
		expect(after.explicitChoice).toBe(before.explicitChoice);
		expect(choice).not.toHaveBeenCalled();
		expect(recorded).toHaveBeenCalledOnce();
		expect(save).toHaveBeenCalledOnce();
		const payload = save.mock.calls[0]?.[0] as SavePayload;
		expect(payload.vendorChoice).toEqual({
			confirmedAt: NOW,
			grants: { cdn: true, 'google-analytics': true, 'meta-pixel': false },
			version: 1,
		});
		kernel.dispose();
	});

	test('the staged vendor draft is confirmed by a no-input save and then cleared', async () => {
		const kernel = createKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
		});
		kernel.set.vendorDraft({ 'google-analytics': false });
		await kernel.commands.save();
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual([
			'google-analytics',
		]);
		// A second no-input save finds no draft and changes nothing.
		const settled = kernel.getSnapshot();
		await kernel.commands.save();
		expect(kernel.getSnapshot().vendorChoice).toBe(settled.vendorChoice);
		kernel.dispose();
	});

	test('an unchanged vendor selection does not renew the confirmation time', async () => {
		const kernel = createKernel({
			initialRecords: {
				...choiceRecords({ marketing: true, measurement: true }),
				vendorChoice: {
					confirmedAt: NOW - 500,
					denied: ['meta-pixel'],
					version: 1,
				},
			},
		});
		const recorded = vi.fn();
		kernel.events.on('vendors:recorded', recorded);
		const result = await kernel.commands.save(
			{},
			{
				vendors: { 'meta-pixel': false },
			}
		);
		expect(result.confirmed).toEqual([]);
		expect(kernel.getSnapshot().vendorChoice?.confirmedAt).toBe(NOW - 500);
		expect(recorded).not.toHaveBeenCalled();
		kernel.dispose();
	});

	test('undeclared and disabled vendor ids are ignored', async () => {
		const kernel = createKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
		});
		await kernel.commands.save(
			{},
			{
				vendors: { cdn: false, unknown: false },
			}
		);
		expect(kernel.getSnapshot().vendorChoice).toBeNull();
		kernel.dispose();
	});

	test('malformed vendor input rejects the save before anything changes', async () => {
		const kernel = createKernel();
		const started = vi.fn();
		kernel.events.on('command:save:started', started);
		const result = await kernel.commands.save(
			{ marketing: true },
			{ vendors: { 'meta-pixel': 'no' as never } }
		);
		expect(result.ok).toBe(false);
		expect(started).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		kernel.dispose();
	});

	test('a bulk action ignores explicit vendor grants and stamps the clear', async () => {
		const kernel = createKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
		});
		await kernel.commands.save('all', { vendors: { 'meta-pixel': false } });
		// Stamped even with nothing denied before, so an older server denial
		// that lands afterwards loses the newest-wins merge.
		expect(kernel.getSnapshot().vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: [],
			version: 1,
		});
		kernel.dispose();
	});

	test('a bulk action with no declared vendors records no vendor decision', async () => {
		const kernel = createKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
			initialVendors: undefined,
		});
		await kernel.commands.save('all');
		expect(kernel.getSnapshot().vendorChoice).toBeNull();
		kernel.dispose();
	});

	test("'all' and 'none' clear the denial list", async () => {
		const kernel = createKernel({
			initialRecords: {
				...choiceRecords({ marketing: true, measurement: true }),
				vendorChoice: {
					confirmedAt: NOW - 500,
					denied: ['meta-pixel'],
					version: 1,
				},
			},
		});
		await kernel.commands.save('none');
		// Cleared, but still a timestamped decision so it wins newest-wins.
		expect(kernel.getSnapshot().vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: [],
			version: 1,
		});
		kernel.set.vendorDraft({ 'meta-pixel': false });
		await kernel.commands.save('all');
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual([]);
		kernel.dispose();
	});

	test('a category save with a vendor toggle emits both events in one action', async () => {
		const kernel = createKernel();
		const choice = vi.fn();
		const recorded = vi.fn();
		kernel.events.on('choice:recorded', choice);
		kernel.events.on('vendors:recorded', recorded);
		await kernel.commands.save(
			{ marketing: true, measurement: true },
			{ vendors: { 'meta-pixel': false } }
		);
		expect(choice).toHaveBeenCalledOnce();
		expect(recorded).toHaveBeenCalledOnce();
		expect(recorded.mock.calls[0]?.[0].actionAt).toBe(NOW);
		kernel.dispose();
	});

	test('a none regime still records a vendor toggle', async () => {
		const kernel = createKernel({
			initialPolicyResolution: matchedResolution(noneRule()),
		});
		const result = await kernel.commands.save(
			{},
			{
				vendors: { 'meta-pixel': false },
			}
		);
		expect(result.ok).toBe(true);
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual(['meta-pixel']);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		kernel.dispose();
	});

	test('the vendor axis is inert under an IAB policy', async () => {
		const kernel = createKernel({
			initialIab: { enabled: true },
			initialPolicyResolution: matchedResolution(iabRule()),
		});
		expect(kernel.getSnapshot().model).toBe('iab');
		const result = await kernel.commands.save(
			{},
			{
				vendors: { 'meta-pixel': false },
			}
		);
		expect(result.confirmed).toEqual([]);
		expect(kernel.getSnapshot().vendorChoice).toBeNull();
		kernel.dispose();
	});
});

describe('server records and init', () => {
	test('init folds backend vendors under code-declared presentation', () => {
		const current = buildInitialSnapshot({ initialVendors: vendors, now: NOW });
		const { patch } = applyInitResponse(
			current,
			{
				policyResolution: {
					fingerprints: matchedResolution(optInRule()).fingerprints,
					matchedBy: 'default',
					policy: matchedResolution(optInRule()).policy,
					policyId: 'test-opt-in',
					status: 'matched',
					version: 1,
				},
				vendorListVersion: '2026-10',
				vendors: [
					{
						category: 'marketing',
						id: 'meta-pixel',
						name: 'Meta (backend)',
						privacyPolicyUrl: 'https://example.com/backend',
					},
					{
						category: 'experience',
						id: 'intercom',
						name: 'Intercom',
						privacyPolicyUrl: 'https://www.intercom.com/legal/privacy',
					},
				],
			},
			NOW
		);
		expect(patch.vendors?.listVersion).toBe('2026-10');
		expect(patch.vendors?.declared.map((vendor) => vendor.id)).toEqual([
			'cdn',
			'google-analytics',
			'intercom',
			'meta-pixel',
		]);
		expect(
			patch.vendors?.declared.find((vendor) => vendor.id === 'meta-pixel')?.name
		).toBe('Meta Pixel');
	});

	test('a newer all-granted server map clears an older local denial', () => {
		const current = buildInitialSnapshot({
			initialRecords: {
				...choiceRecords({ marketing: true }),
				vendorChoice: {
					confirmedAt: NOW - 10,
					denied: ['meta-pixel'],
					version: 1,
				},
			},
			initialVendors: vendors,
			now: NOW,
		});
		const { patch } = applyInitResponse(
			current,
			{
				policyResolution: undefined,
				records: {
					vendorChoice: { confirmedAt: NOW - 5, denied: [], version: 1 },
				},
			},
			NOW
		);
		expect(patch.vendorChoice).toEqual({
			confirmedAt: NOW - 5,
			denied: [],
			version: 1,
		});
	});

	test('granting the last denied vendor survives an older server denial that lands afterwards', () => {
		const current = buildInitialSnapshot({
			initialRecords: {
				...choiceRecords({ marketing: true }),
				// The visitor lifted a denial at NOW - 2 ...
				vendorChoice: { confirmedAt: NOW - 2, denied: [], version: 1 },
			},
			initialVendors: vendors,
			now: NOW,
		});
		// ... and a server read taken earlier still carries the denial.
		const { patch } = applyInitResponse(
			current,
			{
				policyResolution: undefined,
				records: {
					vendorChoice: {
						confirmedAt: NOW - 10,
						denied: ['meta-pixel'],
						version: 1,
					},
				},
			},
			NOW
		);
		expect(patch.vendorChoice).toBe(current.vendorChoice);
	});

	test('a later init replaces the previous backend vendor list', () => {
		const current = buildInitialSnapshot({
			initialVendors: {
				declared: [
					...vendors.declared,
					{
						category: 'experience',
						id: 'old-backend',
						name: 'Old',
						presentable: true,
						privacyPolicyUrl: 'https://example.com/old',
						source: 'manifest',
					},
				],
				listVersion: '1',
			},
			now: NOW,
		});
		const { patch } = applyInitResponse(
			current,
			{
				policyResolution: undefined,
				vendorListVersion: '2',
				vendors: [
					{
						category: 'experience',
						id: 'intercom',
						name: 'Intercom',
						privacyPolicyUrl: 'https://www.intercom.com/legal/privacy',
					},
				],
			},
			NOW
		);
		expect(patch.vendors?.listVersion).toBe('2');
		expect(patch.vendors?.declared.map((vendor) => vendor.id)).toEqual([
			'cdn',
			'google-analytics',
			'intercom',
			'meta-pixel',
		]);
	});

	test('server vendor records merge newest-wins on init', () => {
		const current = buildInitialSnapshot({
			initialRecords: {
				...choiceRecords({ marketing: true }),
				vendorChoice: {
					confirmedAt: NOW - 10,
					denied: ['meta-pixel'],
					version: 1,
				},
			},
			initialVendors: vendors,
			now: NOW,
		});
		const older = applyInitResponse(
			current,
			{
				policyResolution: undefined,
				records: {
					vendorChoice: { confirmedAt: NOW - 20, denied: [], version: 1 },
				},
			},
			NOW
		);
		expect(older.patch.vendorChoice).toBe(current.vendorChoice);
		const newer = applyInitResponse(
			current,
			{
				policyResolution: undefined,
				records: {
					vendorChoice: {
						confirmedAt: NOW - 5,
						denied: ['google-analytics'],
						version: 1,
					},
				},
			},
			NOW
		);
		expect(newer.patch.vendorChoice?.denied).toEqual(['google-analytics']);
	});
});

describe('replay narrowing', () => {
	test('a narrowed replay drops the full vendor grant map', () => {
		const payload: SavePayload = {
			choice: choiceRecords({ marketing: true, measurement: true })
				.choice as SavePayload['choice'],
			confirmed: {
				actionAt: NOW,
				categories: { marketing: true, measurement: true },
			},
			consentAction: 'all',
			consents: {
				experience: false,
				functionality: false,
				marketing: true,
				measurement: true,
				necessary: true,
			},
			model: 'opt-in',
			overrides: {},
			policySnapshotToken: null,
			subject: { subjectId: 'sub_test' },
			subjectId: 'sub_test',
			uiSource: 'dialog',
			user: null,
			vendorChoice: {
				confirmedAt: NOW,
				grants: { 'meta-pixel': false },
				version: 1,
			},
		};
		const narrowed = selectSavePayload(
			payload,
			(category) => category === 'marketing'
		);
		expect(narrowed).not.toBeNull();
		expect(narrowed).not.toHaveProperty('vendorChoice');
		expect(selectSavePayload(payload, () => true)).toBe(payload);
	});
});

describe('in-flight saves', () => {
	test('a later vendor toggle strips the stale map but keeps category receipts', async () => {
		let release: (() => void) | undefined;
		const sent: SavePayload[] = [];
		const save = vi.fn<NonNullable<KernelTransport['save']>>(
			(payload) =>
				new Promise((resolve) => {
					sent.push(payload);
					release = () => resolve({ ok: true });
				})
		);
		const kernel = createKernel({ transport: { save } });
		const first = kernel.commands.save(
			{ marketing: true, measurement: true },
			{ vendors: { 'meta-pixel': false } }
		);
		// Let the first save pass its yield and reach the transport.
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(sent).toHaveLength(1);
		expect(sent[0]?.vendorChoice?.grants['meta-pixel']).toBe(false);
		const second = kernel.commands.save(
			{},
			{ vendors: { 'meta-pixel': true } }
		);
		release?.();
		await first;
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		release?.();
		await second;
		// The second payload carried the newer map; the first kept its receipts.
		expect(sent).toHaveLength(2);
		expect(sent[1]?.vendorChoice?.grants['meta-pixel']).toBe(true);
		expect(Object.keys(sent[1]?.confirmed.categories ?? {})).toEqual([]);
		expect(Object.keys(sent[0]?.confirmed.categories ?? {})).toEqual([
			'marketing',
			'measurement',
		]);
		kernel.dispose();
	});
});
