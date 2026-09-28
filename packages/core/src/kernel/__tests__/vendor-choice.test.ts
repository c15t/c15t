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
import { PENDING_SAVES_STORAGE_KEY } from '../../libs/storage-keys';
import type {
	KernelVendorsState,
	ResolvedVendor,
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
		// The wire accepts only slugs as grant keys; a stored id outside that
		// shape would fail every later save once a vendor is declared.
		['non-slug id', { confirmedAt: NOW, denied: ['Bad ID'], version: 1 }],
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

	test('set.vendors with replaceSource drops that source\u2019s previous entries', () => {
		const kernel = createKernel();
		kernel.set.vendors(
			{
				declared: [
					{
						category: 'marketing',
						id: 'meta-pixel',
						name: 'Meta Pixel',
						presentable: true,
						privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
						source: 'config',
					},
				],
			},
			{ replaceSource: 'config' }
		);
		// The two other config vendors are gone; a manifest one would survive.
		expect(
			kernel.getSnapshot().vendors?.declared.map((vendor) => vendor.id)
		).toEqual(['meta-pixel']);
		kernel.set.vendors({ declared: [] }, { replaceSource: 'config' });
		// The list version is presentation data and survives an empty list.
		expect(kernel.getSnapshot().vendors).toEqual({
			declared: [],
			listVersion: '2026-09',
		});
		kernel.dispose();
	});

	test('replacing the config source restores the backend copy a config entry shadowed', () => {
		const kernel = createKernel({ initialVendors: undefined });
		kernel.set.vendors({
			declared: [
				{
					category: 'marketing',
					id: 'meta-pixel',
					name: 'Meta (backend)',
					presentable: true,
					privacyPolicyUrl: 'https://example.com/backend',
					source: 'manifest',
				},
			],
		});
		kernel.set.vendors(
			{ declared: [vendors.declared[0] as ResolvedVendor] },
			{ replaceSource: 'config' }
		);
		expect(kernel.getSnapshot().vendors?.declared[0]?.name).toBe('Meta Pixel');
		kernel.set.vendors({ declared: [] }, { replaceSource: 'config' });
		const [restored] = kernel.getSnapshot().vendors?.declared ?? [];
		expect(restored?.source).toBe('manifest');
		expect(restored?.name).toBe('Meta (backend)');
		kernel.dispose();
	});

	test('set.vendors with replaceSource and the same list is a no-op', () => {
		const kernel = createKernel();
		const set = vi.fn();
		kernel.events.on('vendors:set', set);
		const before = kernel.getSnapshot();
		kernel.set.vendors(
			{ declared: vendors.declared },
			{ replaceSource: 'config' }
		);
		expect(set).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().vendors).toBe(before.vendors);
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

	test('an explicit reconfirmation of the same denials renews the confirmation time', async () => {
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
		// Same list, but the visitor confirmed it again: a server read taken
		// between the two times must lose to this act.
		const result = await kernel.commands.save(
			{},
			{
				vendors: { 'meta-pixel': false },
			}
		);
		expect(result.confirmed).toEqual([]);
		expect(kernel.getSnapshot().vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: ['meta-pixel'],
			version: 1,
		});
		expect(recorded).toHaveBeenCalledOnce();
		kernel.dispose();
	});

	test('an unchanged staged draft does not renew the confirmation time', async () => {
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
		kernel.set.vendorDraft({ 'meta-pixel': false });
		await kernel.commands.save();
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

	test('a staged value for an undeclared vendor is dropped by a no-op save', async () => {
		const kernel = createKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
		});
		kernel.set.vendorDraft({ 'tiktok-pixel': false });
		await kernel.commands.save();
		expect(kernel.getSnapshot().vendorChoice).toBeNull();
		// The vendor is declared later. The stale staged denial must not be
		// applied by the next unrelated save.
		kernel.set.vendors({
			declared: [
				...vendors.declared,
				{
					category: 'marketing',
					id: 'tiktok-pixel',
					presentable: false,
					source: 'config',
				},
			],
		});
		await kernel.commands.save();
		expect(kernel.getSnapshot().vendorChoice).toBeNull();
		kernel.dispose();
	});

	test('an object input carries its vendor grants next to the categories', async () => {
		const kernel = createKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
		});
		const result = await kernel.commands.save({
			marketing: true,
			vendors: { 'meta-pixel': false },
		});
		expect(result.ok).toBe(true);
		expect(kernel.getSnapshot().vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: ['meta-pixel'],
			version: 1,
		});
		// `vendors` is split off before the category validator sees it, so
		// it is neither refused as an unknown key nor recorded as one.
		const categories = kernel.getSnapshot().explicitChoice?.categories ?? {};
		expect(categories.marketing?.value).toBe(true);
		expect(Object.keys(categories)).not.toContain('vendors');
		// The context form wins when both are given.
		await kernel.commands.save(
			{ vendors: { 'meta-pixel': false } },
			{ vendors: { 'meta-pixel': true } }
		);
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual([]);
		// A malformed inline map is refused the same as a malformed context.
		const bad = await kernel.commands.save({
			vendors: { 'meta-pixel': 'no' as never },
		});
		expect(bad.ok).toBe(false);
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

	test('a bulk action narrowed to some categories keeps unrelated denials', async () => {
		const kernel = createKernel({
			initialRecords: {
				...choiceRecords({ marketing: true, measurement: true }),
				vendorChoice: {
					confirmedAt: NOW - 500,
					denied: ['google-analytics', 'meta-pixel'],
					version: 1,
				},
			},
		});
		// Rejecting only measurement lifts the analytics denial and leaves the
		// marketing vendor exactly as the visitor left it.
		await kernel.commands.save('none', { categories: ['measurement'] });
		expect(kernel.getSnapshot().vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: ['meta-pixel'],
			version: 1,
		});
		kernel.dispose();
	});

	test('a narrowed bulk action keeps the denial of a vendor another granted category still loads', async () => {
		// Receipts under the kernel's own rule, so marketing is granted for real.
		const rule = matchedResolution(
			optInRule({ categories: ['marketing', 'measurement'] })
		);
		const kernel = createKernel({
			initialRecords: {
				...choiceRecords(
					{ marketing: true, measurement: true },
					{ fingerprint: rule.fingerprints.choice }
				),
				vendorChoice: {
					confirmedAt: NOW - 500,
					denied: ['shared'],
					version: 1,
				},
			},
			initialVendors: {
				declared: [
					...vendors.declared,
					{
						category: { or: ['marketing', 'measurement'] },
						id: 'shared',
						presentable: false,
						source: 'script',
					},
				],
				listVersion: null,
			},
		});
		// Rejecting measurement alone leaves marketing granted, and marketing
		// alone loads the shared vendor, so its denial must survive.
		await kernel.commands.save('none', { categories: ['measurement'] });
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual(['shared']);
		kernel.dispose();
	});

	test('a narrowed bulk action decides a vendor whose condition negates a selected category', async () => {
		const rule = matchedResolution(
			optInRule({ categories: ['marketing', 'measurement'] })
		);
		const kernel = createKernel({
			initialRecords: {
				...choiceRecords(
					{ marketing: true, measurement: true },
					{ fingerprint: rule.fingerprints.choice }
				),
				vendorChoice: {
					confirmedAt: NOW - 500,
					denied: ['contextual'],
					version: 1,
				},
			},
			initialVendors: {
				declared: [
					...vendors.declared,
					{
						category: { not: 'marketing' },
						id: 'contextual',
						presentable: false,
						source: 'script',
					},
				],
				listVersion: null,
			},
		});
		// Rejecting marketing is what makes this vendor eligible, so the bulk
		// action decided it and its denial lifts.
		await kernel.commands.save('none', { categories: ['marketing'] });
		expect(kernel.getSnapshot().vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: [],
			version: 1,
		});
		kernel.dispose();
	});

	test('a narrowed bulk action decides a vendor whose condition the selected categories settle together', async () => {
		// Experience stays outside the selection, so this is not the
		// full-scope clear and the vendor has to be decided on its own.
		const rule = matchedResolution(
			optInRule({ categories: ['experience', 'marketing', 'measurement'] })
		);
		const kernel = createKernel({
			initialPolicyResolution: rule,
			initialRecords: {
				...choiceRecords(
					{ experience: true, marketing: true, measurement: true },
					{ fingerprint: rule.fingerprints.choice }
				),
				vendorChoice: {
					confirmedAt: NOW - 500,
					denied: ['contextual'],
					version: 1,
				},
			},
			initialVendors: {
				declared: [
					...vendors.declared,
					{
						// Rejecting measurement blocks it and rejecting marketing
						// enables it, so flipping the selection as a whole leaves
						// the outcome false either way. Rejecting both still
						// settles it: no value of experience can load it.
						category: { and: ['measurement', { not: 'marketing' }] },
						id: 'contextual',
						presentable: false,
						source: 'script',
					},
				],
				listVersion: null,
			},
		});
		await kernel.commands.save('none', {
			categories: ['marketing', 'measurement'],
		});
		expect(kernel.getSnapshot().vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: [],
			version: 1,
		});
		kernel.dispose();
	});

	test('a bulk action covering the whole choice scope clears every denial, negated conditions included', async () => {
		const rule = matchedResolution(
			optInRule({ categories: ['marketing', 'measurement'] })
		);
		const kernel = createKernel({
			initialRecords: {
				...choiceRecords(
					{ marketing: true, measurement: true },
					{ fingerprint: rule.fingerprints.choice }
				),
				vendorChoice: {
					confirmedAt: NOW - 500,
					denied: ['contextual'],
					version: 1,
				},
			},
			initialVendors: {
				declared: [
					...vendors.declared,
					{
						// False whether the selected categories are all on or all
						// off, so a per-vendor decision test cannot settle it.
						category: { and: ['marketing', { not: 'measurement' }] },
						id: 'contextual',
						presentable: false,
						source: 'script',
					},
				],
				listVersion: null,
			},
		});
		// The preference center sends the displayed scope with every bulk
		// action. Covering the whole scope is the stock accept all, which
		// clears the list outright rather than deciding vendor by vendor.
		await kernel.commands.save('all', {
			categories: ['marketing', 'measurement'],
		});
		expect(kernel.getSnapshot().vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: [],
			version: 1,
		});
		kernel.dispose();
	});

	test('an explicit grant over an empty decision renews its time', async () => {
		const kernel = createKernel({
			initialRecords: {
				...choiceRecords({ marketing: true, measurement: true }),
				vendorChoice: { confirmedAt: NOW - 500, denied: [], version: 1 },
			},
		});
		// The list is unchanged, but the visitor just reaffirmed it: a server
		// denial older than now must lose the merge to this act.
		await kernel.commands.save({}, { vendors: { 'meta-pixel': true } });
		expect(kernel.getSnapshot().vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: [],
			version: 1,
		});
		kernel.dispose();
	});

	test('an explicit grant over no prior decision records a timestamped empty list', async () => {
		const save = vi.fn<NonNullable<KernelTransport['save']>>(() =>
			Promise.resolve({ ok: true })
		);
		const kernel = createKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
			transport: { save },
		});
		await kernel.commands.save({}, { vendors: { 'meta-pixel': true } });
		// A decision, even one that denies nothing: an older server denial
		// arriving afterwards must lose the merge to it.
		expect(kernel.getSnapshot().vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: [],
			version: 1,
		});
		const payload = save.mock.calls[0]?.[0] as SavePayload;
		expect(payload.vendorChoice?.grants).toEqual({
			cdn: true,
			'google-analytics': true,
			'meta-pixel': true,
		});
		kernel.dispose();
	});

	test('a stored denial for a vendor nothing declares travels in the grant map', async () => {
		const save = vi.fn<NonNullable<KernelTransport['save']>>(() =>
			Promise.resolve({ ok: true })
		);
		const kernel = createKernel({
			initialRecords: {
				...choiceRecords({ marketing: true, measurement: true }),
				vendorChoice: {
					confirmedAt: NOW - 500,
					denied: ['meta-pixel', 'retired-vendor'],
					version: 1,
				},
			},
			transport: { save },
		});
		// An unrelated category save: the backend reads the map as the whole
		// decision, so the retired vendor's denial has to be in it or another
		// device will read it as granted.
		await kernel.commands.save({ marketing: true, measurement: false });
		const payload = save.mock.calls[0]?.[0] as SavePayload;
		expect(payload.vendorChoice?.grants).toEqual({
			cdn: true,
			'google-analytics': true,
			'meta-pixel': false,
			'retired-vendor': false,
		});
		kernel.dispose();
	});

	test('a category save with no vendor decision sends no vendor map', async () => {
		const save = vi.fn<NonNullable<KernelTransport['save']>>(() =>
			Promise.resolve({ ok: true })
		);
		const kernel = createKernel({ transport: { save } });
		await kernel.commands.save({ marketing: true, measurement: true });
		expect(kernel.getSnapshot().vendorChoice).toBeNull();
		const payload = save.mock.calls[0]?.[0] as SavePayload;
		// Claiming every vendor was granted now would let an older server
		// denial still in flight win locally while the backend held the newer
		// map. No decision, no map.
		expect(payload.vendorChoice).toBeUndefined();
		kernel.dispose();
	});

	test('a bulk action over an empty choice scope is not the full clear', async () => {
		// The configured categories share nothing with the rule's scope, so
		// the visitor decides nothing here and `choiceScope` is empty. A
		// narrowed action then covers it vacuously, and must not clear the
		// denials of vendors under categories it never named.
		const kernel = createKernel({
			consentCategories: ['functionality'],
			initialRecords: {
				...choiceRecords({ marketing: true, measurement: true }),
				vendorChoice: {
					confirmedAt: NOW - 500,
					denied: ['google-analytics', 'meta-pixel'],
					version: 1,
				},
			},
		});
		expect(kernel.getSnapshot().evaluationPolicy.choiceScope).toEqual([]);
		await kernel.commands.save('none', { categories: ['functionality'] });
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual([
			'google-analytics',
			'meta-pixel',
		]);
		kernel.dispose();
	});

	test('a full bulk action clears a denial retained for a vendor no longer declared', async () => {
		// The backend list dropped the vendor, so nothing is declared, but the
		// stored denial is still there. Accept all is documented to clear
		// denials; if it did not, the vendor would return blocked.
		const kernel = createKernel({
			initialRecords: {
				...choiceRecords({ marketing: true, measurement: true }),
				vendorChoice: {
					confirmedAt: NOW - 500,
					denied: ['meta-pixel'],
					version: 1,
				},
			},
			initialVendors: { declared: [], listVersion: null },
		});
		await kernel.commands.save('all');
		expect(kernel.getSnapshot().vendorChoice).toEqual({
			confirmedAt: NOW,
			denied: [],
			version: 1,
		});
		kernel.dispose();
	});

	test('a full bulk action with nothing declared still sends the cleared map', async () => {
		const save = vi.fn<NonNullable<KernelTransport['save']>>(() =>
			Promise.resolve({ ok: true })
		);
		const kernel = createKernel({
			initialRecords: {
				...choiceRecords({ marketing: true, measurement: true }),
				vendorChoice: {
					confirmedAt: NOW - 500,
					denied: ['meta-pixel'],
					version: 1,
				},
			},
			initialVendors: { declared: [], listVersion: null },
			transport: { save },
		});
		await kernel.commands.save('all');
		// The clear is a newer decision, and it names the vendor it lifted:
		// the backend keeps an earlier decision for a vendor a later map
		// omits, so an empty map would leave the old denial in place and
		// another device would restore it when the vendor is redeclared.
		const payload = save.mock.calls[0]?.[0] as SavePayload;
		expect(payload.vendorChoice).toEqual({
			confirmedAt: NOW,
			grants: { 'meta-pixel': true },
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

	test('a replacement list without a version drops the previous label', () => {
		const current = buildInitialSnapshot({
			initialVendors: { declared: [], listVersion: '1' },
			now: NOW,
		});
		const replaced = applyInitResponse(
			current,
			{
				policyResolution: undefined,
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
		// The old label described the old list.
		expect(replaced.patch.vendors?.listVersion).toBeNull();
		// A version-only response relabels the current declarations.
		const relabelled = applyInitResponse(
			current,
			{ policyResolution: undefined, vendorListVersion: '2' },
			NOW
		);
		expect(relabelled.patch.vendors?.listVersion).toBe('2');
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
	test('a narrowed replay keeps the vendor grant map for its caller to judge', () => {
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
		// Narrowing the receipts says nothing about the map: it was the
		// visitor's whole vendor decision and only a newer map supersedes it.
		expect(narrowed?.vendorChoice).toEqual(payload.vendorChoice);
		expect(Object.keys(narrowed?.confirmed.categories ?? {})).toEqual([
			'marketing',
		]);
		expect(selectSavePayload(payload, () => true)).toBe(payload);
	});
});

describe('in-flight saves', () => {
	test('a failed save queues its vendor map when only a category was superseded', async () => {
		// One combined action: categories plus a vendor denial. While it is
		// in flight a subject read supersedes one category, and the request
		// then fails. The queued replay must still carry the vendor map,
		// since no newer action ever carried one; dropping it would lose
		// the denial on the backend.
		let fail: ((error: Error) => void) | undefined;
		const save = vi
			.fn<NonNullable<KernelTransport['save']>>()
			.mockImplementationOnce(
				() =>
					new Promise((_resolve, reject) => {
						fail = reject;
					})
			)
			.mockResolvedValue({ ok: true });
		// The queue lives in `window.localStorage`; the kernel suite runs in
		// Node, so a minimal window stands in for it.
		const values = new Map<string, string>();
		const events = new EventTarget();
		vi.stubGlobal('window', {
			addEventListener: events.addEventListener.bind(events),
			localStorage: {
				getItem: (key: string) => values.get(key) ?? null,
				key: (index: number) => [...values.keys()][index] ?? null,
				get length() {
					return values.size;
				},
				removeItem: (key: string) => values.delete(key),
				setItem: (key: string, value: string) => values.set(key, value),
			},
			removeEventListener: events.removeEventListener.bind(events),
		});
		const enqueued: SavePayload[] = [];
		const kernel = createKernel({ transport: { save } });
		const pending = kernel.commands.save(
			{ marketing: true, measurement: true },
			{ vendors: { 'meta-pixel': false } }
		);
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(save).toHaveBeenCalledTimes(1);
		// A newer action for measurement only, with no vendor decision of its
		// own, lands while the first request is out.
		await kernel.commands.save({ measurement: false });
		fail?.(new Error('offline'));
		await pending;
		for (const entry of JSON.parse(
			values.get(PENDING_SAVES_STORAGE_KEY) ?? '[]'
		) as { payload: SavePayload }[]) {
			enqueued.push(entry.payload);
		}
		expect(enqueued).toHaveLength(1);
		expect(Object.keys(enqueued[0]?.confirmed.categories ?? {})).toEqual([
			'marketing',
		]);
		expect(enqueued[0]?.vendorChoice?.grants['meta-pixel']).toBe(false);
		vi.unstubAllGlobals();
		kernel.dispose();
	});

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
