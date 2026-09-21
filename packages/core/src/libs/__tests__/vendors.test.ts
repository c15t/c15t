import type { VendorCategoryCondition } from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import { choiceRecords, NOW } from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../kernel';
import type { ResolvedVendor } from '../../types';
import type { VendorOwner } from '../vendors';
import {
	declareOwnedVendors,
	mergeDeclaredVendors,
	resolveVendors,
	withoutManifestVendors,
	withoutSourceVendors,
} from '../vendors';

const meta = {
	category: 'marketing' as const,
	id: 'meta-pixel',
	name: 'Meta Pixel',
	privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
};

describe('resolveVendors', () => {
	test('config presentation wins over manifest for the same id', () => {
		const resolved = resolveVendors({
			config: [{ ...meta, name: 'Meta (config)' }],
			manifest: [{ ...meta, name: 'Meta (manifest)' }],
		});
		expect(resolved).toHaveLength(1);
		expect(resolved[0]?.name).toBe('Meta (config)');
		expect(resolved[0]?.source).toBe('config');
		expect(resolved[0]?.presentable).toBe(true);
	});

	test('manifest fills in vendors config does not declare', () => {
		const resolved = resolveVendors({
			config: [meta],
			manifest: [
				{
					category: 'measurement',
					id: 'google-analytics',
					name: 'Google Analytics',
					privacyPolicyUrl: 'https://policies.google.com/privacy',
				},
			],
		});
		expect(resolved.map((vendor) => vendor.id)).toEqual([
			'google-analytics',
			'meta-pixel',
		]);
		expect(resolved[0]?.source).toBe('manifest');
	});

	test('a slug only referenced by scripts becomes a hidden vendor and warns', () => {
		const onWarn = vi.fn();
		const resolved = resolveVendors({
			onWarn,
			owners: [
				{ category: 'marketing', vendor: 'hotjar' },
				{ category: 'measurement', vendor: 'hotjar' },
				{ category: 'marketing' },
			],
		});
		expect(resolved).toEqual([
			{
				category: { or: ['marketing', 'measurement'] },
				disabled: undefined,
				id: 'hotjar',
				presentable: false,
				source: 'script',
			},
		]);
		expect(onWarn).toHaveBeenCalledOnce();
		expect(onWarn.mock.calls[0]?.[0]).toContain('hotjar');
	});

	test('a script fallback follows its script to a new category', () => {
		const first = resolveVendors({
			owners: [{ category: 'marketing', vendor: 'hotjar' }],
		});
		const moved = resolveVendors({
			existing: first,
			owners: [{ category: 'measurement', vendor: 'hotjar' }],
		});
		expect(moved[0]?.category).toBe('measurement');
		expect(moved[0]?.source).toBe('script');
	});

	test('owner conditions are copied so freezing the snapshot leaves the script alone', () => {
		const category: VendorCategoryCondition = {
			or: ['marketing', 'measurement'],
		};
		const resolved = resolveVendors({
			owners: [{ category, vendor: 'hotjar' }],
		});
		expect(resolved[0]?.category).toEqual(category);
		expect(resolved[0]?.category).not.toBe(category);
	});

	test('a declared vendor silences the script warning and keeps its own category', () => {
		const onWarn = vi.fn();
		const resolved = resolveVendors({
			config: [meta],
			onWarn,
			owners: [{ category: 'measurement', vendor: 'meta-pixel' }],
		});
		expect(resolved[0]?.category).toBe('marketing');
		expect(onWarn).not.toHaveBeenCalled();
	});

	test('a vendor whose category is only necessary is disabled, even when declared otherwise', () => {
		const resolved = resolveVendors({
			config: [{ ...meta, category: 'necessary', disabled: false, id: 'cdn' }],
		});
		expect(resolved[0]?.disabled).toBe(true);
	});

	test('a script slug that is not a valid wire id is dropped with a warning', () => {
		const onWarn = vi.fn();
		const resolved = resolveVendors({
			onWarn,
			owners: [
				{ category: 'marketing', vendor: 'Meta Pixel' },
				{ category: 'marketing', vendor: 'ok-slug' },
			],
		});
		expect(resolved.map((vendor) => vendor.id)).toEqual(['ok-slug']);
		expect(
			onWarn.mock.calls.some(([m]) => String(m).includes('Meta Pixel'))
		).toBe(true);
	});

	test('a configured vendor whose id is not a valid wire id is dropped with a warning', () => {
		const onWarn = vi.fn();
		const resolved = resolveVendors({
			config: [{ ...meta, id: 'Meta Pixel' }, meta],
			onWarn,
		});
		expect(resolved.map((vendor) => vendor.id)).toEqual(['meta-pixel']);
		expect(onWarn).toHaveBeenCalledOnce();
	});

	test('a newer declaration of the same source replaces the existing entry', () => {
		const resolved = resolveVendors({
			existing: [
				{ ...meta, name: 'Old name', presentable: true, source: 'manifest' },
			],
			manifest: [{ ...meta, name: 'New name' }],
		});
		expect(resolved).toHaveLength(1);
		expect(resolved[0]?.name).toBe('New name');
	});

	test('an explicit disabled flag is kept', () => {
		const resolved = resolveVendors({
			config: [{ ...meta, disabled: true }],
		});
		expect(resolved[0]?.disabled).toBe(true);
	});
});

describe('owner fallback across manifest replacement', () => {
	test('a backend vendor that scripts also name falls back to a script entry when the backend drops it', () => {
		const first = resolveVendors({
			manifest: [meta],
			owners: [{ category: 'measurement', vendor: 'meta-pixel' }],
		});
		expect(first[0]?.source).toBe('manifest');
		expect(first[0]?.ownerCategory).toBe('measurement');
		const afterRemoval = resolveVendors({
			existing: withoutManifestVendors(first),
			manifest: [],
		});
		expect(afterRemoval).toEqual([
			{
				category: 'measurement',
				disabled: undefined,
				id: 'meta-pixel',
				presentable: false,
				source: 'script',
			},
		]);
	});

	test('a manifest entry that replaces a script fallback remembers its owner category', () => {
		// Re-initialisation resolves the backend list against the existing
		// declarations without the owners, so the manifest entry has to pick
		// the owner category up from the fallback it replaces.
		const fromOwners = resolveVendors({
			manifest: [meta],
			owners: [{ category: 'measurement', vendor: 'meta-pixel' }],
		});
		const stillDeclared = resolveVendors({
			existing: withoutManifestVendors(fromOwners),
			manifest: [meta],
		});
		expect(stillDeclared[0]?.source).toBe('manifest');
		expect(stillDeclared[0]?.ownerCategory).toBe('measurement');
		const afterRemoval = resolveVendors({
			existing: withoutManifestVendors(stillDeclared),
			manifest: [],
		});
		expect(
			afterRemoval.map((vendor) => [vendor.source, vendor.category])
		).toEqual([['script', 'measurement']]);
	});

	test('a config entry that shadows a backend copy restores it when config drops the vendor', () => {
		const first = resolveVendors({
			config: [{ ...meta, name: 'Meta (config)' }],
			manifest: [{ ...meta, name: 'Meta (backend)' }],
			owners: [{ category: 'measurement', vendor: 'meta-pixel' }],
		});
		expect(first[0]?.source).toBe('config');
		expect(first[0]?.shadowed?.source).toBe('manifest');
		const afterRemoval = resolveVendors({
			config: [],
			existing: withoutSourceVendors(first, 'config'),
		});
		expect(afterRemoval).toHaveLength(1);
		expect(afterRemoval[0]?.source).toBe('manifest');
		expect(afterRemoval[0]?.name).toBe('Meta (backend)');
		// The owners travel with the restored copy, so dropping the backend
		// entry later still leaves the script fallback.
		expect(afterRemoval[0]?.ownerCategory).toBe('measurement');
		expect(
			withoutSourceVendors(afterRemoval, 'manifest').map((v) => v.source)
		).toEqual(['script']);
	});

	test('a refreshed shadow keeps the owners the config entry knows', () => {
		const first = resolveVendors({
			config: [{ ...meta, name: 'Meta (config)' }],
			manifest: [{ ...meta, name: 'Meta (backend)' }],
			owners: [{ category: 'measurement', vendor: 'meta-pixel' }],
		});
		// A later init refreshes the backend copy while config still wins.
		const refreshed = resolveVendors({
			existing: withoutManifestVendors(first),
			manifest: [{ ...meta, name: 'Meta (backend v2)' }],
		});
		expect(refreshed[0]?.shadowed?.name).toBe('Meta (backend v2)');
		expect(refreshed[0]?.shadowed?.ownerCategory).toBe('measurement');
		// Config goes, then the backend: the script fallback is still there.
		const backendOnly = withoutSourceVendors(refreshed, 'config');
		expect(backendOnly[0]?.source).toBe('manifest');
		expect(
			withoutSourceVendors(backendOnly, 'manifest').map((v) => v.source)
		).toEqual(['script']);
	});

	test('a same-source refresh without owners forgets the old owners', () => {
		const owned = resolveVendors({
			manifest: [meta],
			owners: [{ category: 'measurement', vendor: 'meta-pixel' }],
		});
		expect(owned[0]?.ownerCategory).toBe('measurement');
		// The script went away: a host re-resolves against the current owners.
		const refreshed = mergeDeclaredVendors(owned, [
			{ ...meta, presentable: true, source: 'manifest' },
		]);
		expect(refreshed[0]?.ownerCategory).toBeUndefined();
	});

	test('a backend list that drops a shadowed vendor drops the shadow too', () => {
		const first = resolveVendors({
			config: [{ ...meta, name: 'Meta (config)' }],
			manifest: [{ ...meta, name: 'Meta (backend)' }],
		});
		const afterBackendDrop = resolveVendors({
			existing: withoutManifestVendors(first),
			manifest: [],
		});
		expect(afterBackendDrop[0]?.shadowed).toBeUndefined();
		expect(
			resolveVendors({
				config: [],
				existing: withoutSourceVendors(afterBackendDrop, 'config'),
			})
		).toEqual([]);
	});

	test('a backend vendor with no owners disappears when the backend drops it', () => {
		const first = resolveVendors({ manifest: [meta] });
		expect(
			resolveVendors({ existing: withoutManifestVendors(first), manifest: [] })
		).toEqual([]);
	});
});

describe('mergeDeclaredVendors', () => {
	const config: ResolvedVendor = {
		...meta,
		presentable: true,
		source: 'config',
	};
	const manifest: ResolvedVendor = {
		...meta,
		name: 'Meta (manifest)',
		presentable: true,
		source: 'manifest',
	};

	test('returns the current list when nothing new arrives', () => {
		const current = [{ ...config, shadowed: manifest }];
		expect(mergeDeclaredVendors(current, [])).toBe(current);
		expect(mergeDeclaredVendors(current, [manifest])).toBe(current);
	});

	test('a backend copy arriving under a config entry becomes its shadow', () => {
		const merged = mergeDeclaredVendors([config], [manifest]);
		expect(merged[0]?.source).toBe('config');
		expect(merged[0]?.name).toBe('Meta Pixel');
		expect(merged[0]?.shadowed).toEqual(manifest);
	});

	test('a higher-priority source replaces a lower one and shadows it', () => {
		const merged = mergeDeclaredVendors([manifest], [config]);
		expect(merged[0]?.name).toBe('Meta Pixel');
		expect(merged[0]?.source).toBe('config');
		expect(merged[0]?.shadowed).toEqual(manifest);
	});

	test('a new id is appended and the result is sorted by id', () => {
		const merged = mergeDeclaredVendors(
			[config],
			[{ ...manifest, id: 'aaa-vendor' }]
		);
		expect(merged.map((vendor) => vendor.id)).toEqual([
			'aaa-vendor',
			'meta-pixel',
		]);
	});
});

describe('declareOwnedVendors', () => {
	const declared = (kernel: ReturnType<typeof createConsentKernel>) =>
		kernel
			.getSnapshot()
			.vendors?.declared.map((vendor) => [
				vendor.id,
				vendor.source === 'script' ? vendor.category : vendor.ownerCategory,
			]);

	test('a slug two modules share keeps both conditions whichever declares last', () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
			now: NOW,
		});
		declareOwnedVendors(kernel, [{ category: 'measurement', vendor: 'ga' }]);
		declareOwnedVendors(kernel, [{ category: 'marketing', vendor: 'ga' }]);
		expect(declared(kernel)).toEqual([
			['ga', { or: ['measurement', 'marketing'] }],
		]);
		kernel.dispose();
	});

	test('a module that moves its slug takes its old condition with it', () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
			now: NOW,
		});
		const rule = { category: 'marketing' as const, vendor: 'ga' };
		declareOwnedVendors(kernel, [{ category: 'measurement', vendor: 'ga' }]);
		declareOwnedVendors(kernel, [rule]);
		declareOwnedVendors(
			kernel,
			[{ ...rule, category: 'functionality' }],
			[rule]
		);
		expect(declared(kernel)).toEqual([
			['ga', { or: ['measurement', 'functionality'] }],
		]);
		kernel.dispose();
	});

	test('a sole owner that moves away from an or condition takes all of it along', () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
			now: NOW,
		});
		const rule: VendorOwner = {
			category: { or: ['measurement', 'marketing'] },
			vendor: 'ga',
		};
		declareOwnedVendors(kernel, [rule]);
		expect(declared(kernel)).toEqual([
			['ga', { or: ['measurement', 'marketing'] }],
		]);
		declareOwnedVendors(
			kernel,
			[{ ...rule, category: 'functionality' }],
			[rule]
		);
		expect(declared(kernel)).toEqual([['ga', 'functionality']]);
		kernel.dispose();
	});

	test('a declared vendor remembers every module that names it', () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
			initialVendors: {
				declared: [{ ...meta, presentable: true, source: 'config' }],
				listVersion: null,
			},
			now: NOW,
		});
		declareOwnedVendors(kernel, [
			{ category: 'measurement', vendor: 'meta-pixel' },
		]);
		declareOwnedVendors(kernel, [
			{ category: 'marketing', vendor: 'meta-pixel' },
		]);
		expect(declared(kernel)).toEqual([
			['meta-pixel', { or: ['measurement', 'marketing'] }],
		]);
		kernel.dispose();
	});
});
