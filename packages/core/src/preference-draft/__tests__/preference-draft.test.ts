import type { PolicyRule } from '@c15t/schema/types';
/**
 * The preference draft at its interface. Every framework adapter wraps this
 * module, so the rules where the old per-framework copies disagreed are
 * pinned here: vendor-surface order, the stale rule, the baseline merge, the
 * displayed categories and bulk actions.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	iabRule,
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../kernel';
import type {
	ConsentKernel,
	KernelConfig,
	ResolvedVendor,
	SavePayload,
} from '../../types';
import { createPreferenceDraft } from '../index';

afterEach(() => {
	vi.restoreAllMocks();
});

const vendor = function vendor(
	id: string,
	overrides: Partial<ResolvedVendor> = {}
): ResolvedVendor {
	return {
		category: 'marketing',
		id,
		name: id,
		presentable: true,
		privacyPolicyUrl: `https://${id}.example/privacy`,
		source: 'config',
		...overrides,
	};
};

const DECLARED = [
	vendor('meta-pixel'),
	vendor('google-analytics', { category: 'measurement' }),
	vendor('cdn', { category: 'necessary', disabled: true }),
];

const RULE = optInRule({ categories: ['marketing', 'measurement'] });

/**
 * A kernel whose policy can change through `/init`, recording every save
 * payload it sends.
 */
const setup = function setup(config: KernelConfig = {}, rule = RULE) {
	vi.spyOn(Date, 'now').mockReturnValue(NOW);
	let next = matchedResolution(rule);
	const sent: SavePayload[] = [];
	const kernel = createConsentKernel({
		// A permissive policy offers only what the site declares.
		consentCategories: ['marketing', 'measurement'],
		initialPolicyResolution: matchedResolution(rule),
		initialVendors: { declared: DECLARED, listVersion: '1' },
		now: NOW,
		transport: {
			init: () =>
				Promise.resolve({ policyResolution: { ...next, version: 1 } }),
			save: (payload) => {
				sent.push(payload);
				return Promise.resolve({ ok: true });
			},
		},
		...config,
	});
	const changePolicy = async (nextRule: PolicyRule) => {
		next = matchedResolution(nextRule);
		await kernel.commands.init();
	};
	return { changePolicy, kernel, sent };
};

const recorded = function recorded(kernel: ConsentKernel) {
	return Object.fromEntries(
		Object.entries(kernel.getSnapshot().explicitChoice?.categories ?? {}).map(
			([category, decision]) => [category, decision?.value]
		)
	);
};

describe('seeding', () => {
	test('values come from the record, then presentation defaults, then the policy', () => {
		const { kernel } = setup(
			{
				consentCategories: ['experience', 'marketing', 'measurement'],
				initialRecords: choiceRecords({ measurement: true }),
			},
			optOutRule({
				categories: ['experience', 'marketing', 'measurement'],
			})
		);
		const draft = createPreferenceDraft(kernel, {
			defaults: { experience: false, measurement: false },
		});
		expect(draft.getState()).toMatchObject({
			isDirty: false,
			isStale: false,
			values: {
				experience: false,
				functionality: false,
				marketing: true,
				measurement: true,
				necessary: true,
			},
		});
	});

	test('displayed categories are necessary plus the choice scope in consentTypes order, not the policy or configured order', () => {
		// The rule lists its categories in display order and the site
		// configures another; resolving the rule sorts its scope.
		const { kernel } = setup(
			{
				consentCategories: [
					'marketing',
					'experience',
					'measurement',
					'functionality',
				],
			},
			optInRule({
				categories: ['functionality', 'measurement', 'experience', 'marketing'],
			})
		);
		const { choiceScope } = kernel.getSnapshot().evaluationPolicy;
		expect(choiceScope).toEqual([
			'experience',
			'functionality',
			'marketing',
			'measurement',
		]);
		const expected = [
			'necessary',
			'functionality',
			'measurement',
			'experience',
			'marketing',
		];
		expect(
			createPreferenceDraft(kernel).getState().displayedCategories
		).toEqual(expected);
	});

	test('a configured list narrows the displayed categories to the choice scope', () => {
		const { kernel } = setup({ consentCategories: ['necessary', 'marketing'] });
		expect(
			createPreferenceDraft(kernel).getState().displayedCategories
		).toEqual(['necessary', 'marketing']);
	});

	test('vendors read granted unless the gate honors a denial; a disabled vendor reads granted', async () => {
		const { kernel } = setup();
		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		// A denial recorded for a vendor later declared `disabled` no longer
		// counts, so the draft never shows it off while every gate allows it.
		kernel.set.vendors(
			{
				declared: [
					vendor('meta-pixel', { disabled: true }),
					...DECLARED.slice(1),
				],
			},
			{ replaceSource: 'config' }
		);
		expect(createPreferenceDraft(kernel).getState().vendors).toEqual({
			cdn: true,
			'google-analytics': true,
			'meta-pixel': true,
		});
	});

	test('an iab policy shows no vendors', () => {
		const { kernel } = setup({}, iabRule());
		kernel.set.iab({ enabled: true });
		expect(kernel.getSnapshot().model).toBe('iab');
		expect(createPreferenceDraft(kernel).getState().vendors).toEqual({});
	});
});

describe('staging', () => {
	test('set stages without touching the record; moving it back is clean again', () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.set('marketing', true);
		expect(draft.getState()).toMatchObject({
			isDirty: true,
			values: { marketing: true },
		});
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		draft.set('marketing', false);
		expect(draft.getState().isDirty).toBe(false);
	});

	test('necessary and undisplayed categories cannot be staged', () => {
		const { kernel } = setup({ consentCategories: ['marketing'] });
		const draft = createPreferenceDraft(kernel);
		draft.update({ measurement: true, necessary: false });
		expect(draft.getState()).toMatchObject({
			isDirty: false,
			values: { measurement: false, necessary: true },
		});
	});

	test('setVendor ignores undeclared and disabled vendors', () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.setVendor('cdn', false);
		draft.setVendor('nobody', false);
		expect(draft.getState().isDirty).toBe(false);
		draft.setVendor('meta-pixel', false);
		expect(draft.getState()).toMatchObject({
			isDirty: true,
			vendors: { 'meta-pixel': false },
		});
	});

	test('a `__proto__` vendor id stages and saves like any other', async () => {
		const { kernel } = setup({
			initialVendors: {
				declared: [vendor('__proto__')],
				listVersion: '1',
			},
		});
		const draft = createPreferenceDraft(kernel);
		draft.setVendor('__proto__', false);
		expect(Object.hasOwn(draft.getState().vendors, '__proto__')).toBe(true);
		expect(draft.getState().isDirty).toBe(true);
		await draft.save();
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual(['__proto__']);
	});

	test('acceptAll stages every category and vendor on; rejectAll every category off with vendors on', async () => {
		const { kernel } = setup();
		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		const draft = createPreferenceDraft(kernel);
		draft.acceptAll();
		expect(draft.getState()).toMatchObject({
			values: { marketing: true, measurement: true },
			vendors: { 'meta-pixel': true },
		});
		draft.rejectAll();
		expect(draft.getState()).toMatchObject({
			values: { marketing: false, measurement: false },
			vendors: { 'meta-pixel': true },
		});
	});

	test('new defaults show at once on a clean draft', () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.setDefaults({ marketing: true });
		expect(draft.getState().values.marketing).toBe(true);
	});

	test('new defaults wait until a dirty draft is clean', async () => {
		// An experiment arm assigned after the visitor started editing must
		// not flip a switch they left alone and save a grant they never saw.
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.set('measurement', true);
		draft.setDefaults({ marketing: true });
		expect(draft.getState().values.marketing).toBe(false);
		expect(draft.toSaveInput()).toMatchObject({ marketing: false });
		await draft.save();
		// Saved and clean, the draft now shows the record.
		expect(draft.getState().values).toMatchObject({
			marketing: false,
			measurement: true,
		});
		draft.reset();
		expect(draft.getState().values.marketing).toBe(false);
	});

	test('a dirty draft that turns clean picks up the new defaults', () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.set('measurement', true);
		draft.setDefaults({ experience: true, marketing: true });
		draft.set('measurement', false);
		expect(draft.getState().values.marketing).toBe(true);
	});

	test('state keeps its identity until something changes, and unchanged slices keep theirs', () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		const first = draft.getState();
		kernel.set.activeUI('dialog');
		expect(draft.getState()).toBe(first);
		draft.set('marketing', true);
		const second = draft.getState();
		expect(second).not.toBe(first);
		expect(second.vendors).toBe(first.vendors);
		expect(second.displayedCategories).toBe(first.displayedCategories);
	});

	test('a subscriber hears edits and record changes', async () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		const listener = vi.fn();
		const stop = draft.subscribe(listener);
		draft.set('marketing', true);
		expect(listener).toHaveBeenCalledTimes(1);
		await kernel.commands.save({ measurement: true });
		expect(listener).toHaveBeenCalledTimes(2);
		expect(draft.getState().values.measurement).toBe(true);
		stop();
		draft.set('marketing', false);
		expect(listener).toHaveBeenCalledTimes(2);
	});
});

describe('saving', () => {
	test('save records every displayed category and only the vendors the visitor moved', async () => {
		const { kernel, sent } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.set('measurement', true);
		draft.setVendor('meta-pixel', false);
		expect(draft.toSaveInput()).toEqual({
			marketing: false,
			measurement: true,
			vendors: { 'meta-pixel': false },
		});
		const result = await draft.save({ uiSource: 'dialog' });
		expect(result.ok).toBe(true);
		expect(recorded(kernel)).toEqual({ marketing: false, measurement: true });
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual(['meta-pixel']);
		expect(sent.at(-1)?.uiSource).toBe('dialog');
		// The draft follows what it just recorded.
		expect(draft.getState().isDirty).toBe(false);
	});

	test('save narrows to the given categories', () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		expect(draft.toSaveInput(['necessary', 'marketing'])).toEqual({
			marketing: false,
		});
	});

	test('an edit made while the save request runs stays staged', async () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.set('marketing', true);
		const pending = draft.save();
		draft.set('measurement', true);
		await pending;
		expect(recorded(kernel)).toEqual({ marketing: true, measurement: false });
		expect(draft.getState()).toMatchObject({
			isDirty: true,
			values: { marketing: true, measurement: true },
		});
	});

	test('a bulk save discards staged edits', async () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.set('marketing', true);
		draft.setVendor('google-analytics', false);
		await draft.save({ input: 'none' });
		expect(recorded(kernel)).toEqual({ marketing: false, measurement: false });
		expect(draft.getState()).toMatchObject({
			isDirty: false,
			vendors: { 'google-analytics': true },
		});
	});
});

describe('following the record', () => {
	test('a clean draft follows a record another surface saved', async () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		await kernel.commands.save({ marketing: true });
		expect(draft.getState()).toMatchObject({
			isDirty: false,
			values: { marketing: true },
		});
	});

	test('a dirty draft merges a newer record: untouched values follow it, staged ones stay', async () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.set('marketing', true);
		await kernel.commands.save({ marketing: false, measurement: true });
		expect(draft.getState()).toMatchObject({
			isDirty: true,
			isStale: false,
			values: { marketing: true, measurement: true },
		});
		// Saving now writes the other surface's measurement grant, not the
		// value the draft was seeded with.
		await draft.save();
		expect(recorded(kernel)).toEqual({ marketing: true, measurement: true });
	});

	test('a staged value the newer record holds is no longer an edit', async () => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.set('marketing', true);
		draft.setVendor('meta-pixel', false);
		await kernel.commands.save(
			{ marketing: true },
			{ vendors: { 'meta-pixel': false } }
		);
		expect(draft.getState().isDirty).toBe(false);
	});
});

describe('stale drafts', () => {
	test('a policy change under a staged edit makes the draft stale; save refuses until reset', async () => {
		const { changePolicy, kernel, sent } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.set('marketing', true);
		await changePolicy({ ...RULE, copyRevision: 'updated' });
		expect(draft.getState().isStale).toBe(true);
		expect(draft.toSaveInput()).toBeNull();
		await expect(draft.save()).resolves.toEqual({ ok: false });
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(sent).toHaveLength(0);
		draft.reset();
		expect(draft.getState()).toMatchObject({
			isDirty: false,
			isStale: false,
			values: { marketing: false },
		});
	});

	test('a clean draft follows a policy change and is never stale', async () => {
		const { changePolicy, kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		await changePolicy({ ...RULE, copyRevision: 'updated' });
		expect(draft.getState().isStale).toBe(false);
		draft.set('marketing', true);
		expect(draft.getState().isStale).toBe(false);
	});

	test('a change of displayed categories under a staged edit makes the draft stale', () => {
		const { kernel } = setup({ consentCategories: ['measurement'] });
		const draft = createPreferenceDraft(kernel);
		draft.set('measurement', true);
		kernel.set.consentCategories(['measurement', 'marketing']);
		expect(draft.getState()).toMatchObject({
			displayedCategories: ['necessary', 'measurement', 'marketing'],
			isStale: true,
		});
	});

	test('a bulk save records under the current policy even when the draft is stale', async () => {
		const { changePolicy, kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.set('marketing', true);
		await changePolicy({ ...RULE, copyRevision: 'updated' });
		const result = await draft.save({ input: 'all' });
		expect(result.ok).toBe(true);
		expect(recorded(kernel)).toEqual({ marketing: true, measurement: true });
		expect(draft.getState()).toMatchObject({ isDirty: false, isStale: false });
	});

	test.each([
		['a vendor appears', [...DECLARED, vendor('tiktok-pixel')]],
		[
			'a vendor moves category',
			[vendor('meta-pixel', { category: 'measurement' }), ...DECLARED.slice(1)],
		],
		[
			'a vendor turns toggleable',
			[...DECLARED.slice(0, 2), vendor('cdn', { category: 'measurement' })],
		],
		[
			'a vendor loses its row while a script keeps its slug',
			[
				{
					category: 'marketing' as const,
					id: 'meta-pixel',
					presentable: false,
					source: 'script' as const,
				},
				...DECLARED.slice(1),
			],
		],
	])('a dirty draft goes stale when %s', (_label, declared) => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.setVendor('meta-pixel', false);
		kernel.set.vendors({ declared }, { replaceSource: 'config' });
		expect(draft.getState().isStale).toBe(true);
	});

	test.each([
		[
			'a script registers only its slug',
			[...DECLARED, vendor('ad-network', { presentable: false })],
		],
		[
			'a vendor under a negated condition is declared',
			[...DECLARED, vendor('negated', { category: { not: 'marketing' } })],
		],
	])('a dirty draft stays saveable when %s', (_label, declared) => {
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.setVendor('meta-pixel', false);
		kernel.set.vendors({ declared }, { replaceSource: 'config' });
		expect(draft.getState()).toMatchObject({ isDirty: true, isStale: false });
	});

	test('a dirty draft stays saveable when the same rows come back in another order', () => {
		// The kernel keeps a configured list in the order it was given and
		// sorts every merged one, so renaming one vendor reorders the rows.
		const { kernel } = setup();
		const draft = createPreferenceDraft(kernel);
		draft.setVendor('meta-pixel', false);
		kernel.set.vendors(
			{
				declared: [
					vendor('meta-pixel', { name: 'Meta' }),
					...DECLARED.slice(1),
				],
			},
			{ replaceSource: 'config' }
		);
		expect(
			kernel.getSnapshot().vendors?.declared.map((entry) => entry.id)
		).toEqual(['cdn', 'google-analytics', 'meta-pixel']);
		expect(draft.getState()).toMatchObject({ isDirty: true, isStale: false });
	});

	test('comparing vendor surfaces does not load the collator', () => {
		// The first `localeCompare` call in a page initialises ICU collation,
		// which is slow on the main thread.
		const { kernel } = setup();
		const localeCompare = vi.spyOn(String.prototype, 'localeCompare');
		const draft = createPreferenceDraft(kernel);
		draft.setVendor('meta-pixel', false);
		kernel.set.vendors(
			{ declared: [...DECLARED].reverse() },
			{ replaceSource: 'config' }
		);
		expect(draft.getState()).toMatchObject({ isDirty: true, isStale: false });
		expect(localeCompare).not.toHaveBeenCalled();
	});
});
