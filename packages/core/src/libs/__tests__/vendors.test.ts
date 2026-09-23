import type { VendorCategoryCondition } from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import { choiceRecords, NOW } from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../kernel';
import type { ResolvedVendor } from '../../types';
import {
	declareOwnedVendors,
	forgetOwnedVendors,
	mergeDeclaredVendors,
	resolveVendors,
	vendorRenders,
	vendorsListedUnder,
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
	const kernelFor = () =>
		createConsentKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
			now: NOW,
		});

	test('a slug two modules share keeps both conditions whichever declares last', () => {
		const kernel = kernelFor();
		declareOwnedVendors(
			kernel,
			[{ category: 'measurement', vendor: 'ga' }],
			Symbol('script')
		);
		declareOwnedVendors(
			kernel,
			[{ category: 'marketing', vendor: 'ga' }],
			Symbol('rule')
		);
		expect(declared(kernel)).toEqual([
			['ga', { or: ['measurement', 'marketing'] }],
		]);
		kernel.dispose();
	});

	test('a module that moves its slug takes only its own condition with it', () => {
		const kernel = kernelFor();
		const script = Symbol('script');
		const rule = Symbol('rule');
		declareOwnedVendors(
			kernel,
			[{ category: 'measurement', vendor: 'ga' }],
			rule
		);
		declareOwnedVendors(
			kernel,
			[{ category: 'marketing', vendor: 'ga' }],
			script
		);
		declareOwnedVendors(
			kernel,
			[{ category: 'functionality', vendor: 'ga' }],
			script
		);
		expect(declared(kernel)).toEqual([
			['ga', { or: ['measurement', 'functionality'] }],
		]);
		kernel.dispose();
	});

	test('a sole owner that moves away from an or condition takes all of it along', () => {
		const kernel = kernelFor();
		const rule = Symbol('rule');
		declareOwnedVendors(
			kernel,
			[{ category: { or: ['measurement', 'marketing'] }, vendor: 'ga' }],
			rule
		);
		expect(declared(kernel)).toEqual([
			['ga', { or: ['measurement', 'marketing'] }],
		]);
		declareOwnedVendors(
			kernel,
			[{ category: 'functionality', vendor: 'ga' }],
			rule
		);
		expect(declared(kernel)).toEqual([['ga', 'functionality']]);
		kernel.dispose();
	});

	test('two modules owning a slug under the same condition keep it when one moves', () => {
		const kernel = kernelFor();
		const script = Symbol('script');
		const rule = Symbol('rule');
		declareOwnedVendors(
			kernel,
			[{ category: 'measurement', vendor: 'ga' }],
			script
		);
		declareOwnedVendors(
			kernel,
			[{ category: 'measurement', vendor: 'ga' }],
			rule
		);
		expect(declared(kernel)).toEqual([['ga', 'measurement']]);
		declareOwnedVendors(
			kernel,
			[{ category: 'marketing', vendor: 'ga' }],
			script
		);
		// The rule still owns it under measurement.
		expect(declared(kernel)).toEqual([
			['ga', { or: ['marketing', 'measurement'] }],
		]);
		kernel.dispose();
	});

	test('a slug nothing names any more loses its script entry', () => {
		const kernel = kernelFor();
		const script = Symbol('script');
		declareOwnedVendors(
			kernel,
			[{ category: 'marketing', vendor: 'ga' }],
			script
		);
		declareOwnedVendors(kernel, [], script);
		expect(kernel.getSnapshot().vendors).toBeNull();
		kernel.dispose();
	});

	test('a forgotten module drops out of a shared slug at once', () => {
		const kernel = kernelFor();
		const script = Symbol('script');
		const rule = Symbol('rule');
		declareOwnedVendors(
			kernel,
			[{ category: 'measurement', vendor: 'ga' }],
			script
		);
		declareOwnedVendors(
			kernel,
			[{ category: 'marketing', vendor: 'ga' }],
			rule
		);
		// A disposed module's declarations are not evidence any more, so the
		// slug it shared is rebuilt from the survivor without waiting for
		// another update.
		forgetOwnedVendors(kernel, script);
		expect(declared(kernel)).toEqual([['ga', 'marketing']]);
		kernel.dispose();
	});

	test('a disposed module takes the slug only it named with it', () => {
		// A standalone loader disposed while the kernel lives on: nothing
		// else names its slug, so it must stop being toggleable rather than
		// keep influencing vendor saves from a module that is gone.
		const kernel = kernelFor();
		const script = Symbol('script');
		const rule = Symbol('rule');
		declareOwnedVendors(
			kernel,
			[{ category: 'marketing', vendor: 'hotjar' }],
			script
		);
		declareOwnedVendors(
			kernel,
			[{ category: 'measurement', vendor: 'ga' }],
			rule
		);
		forgetOwnedVendors(kernel, script);
		expect(declared(kernel)).toEqual([['ga', 'measurement']]);
		// Forgetting a module that never declared commits nothing.
		const before = kernel.getSnapshot().vendors;
		forgetOwnedVendors(kernel, Symbol('never'));
		expect(kernel.getSnapshot().vendors).toBe(before);
		kernel.dispose();
	});

	test('set.vendors copies a declaration so the caller can keep mutating it', () => {
		const kernel = kernelFor();
		const declaration: ResolvedVendor = {
			category: { or: ['marketing', 'measurement'] },
			id: 'meta-pixel',
			name: 'Meta Pixel',
			presentable: true,
			privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
			source: 'config',
		};
		kernel.set.vendors({ declared: [declaration] });
		// The snapshot is frozen; the caller's own object must not be.
		expect(() => {
			declaration.name = 'Meta (renamed)';
			(declaration.category as { or: string[] }).or.push('experience');
		}).not.toThrow();
		expect(kernel.getSnapshot().vendors?.declared[0]?.name).toBe('Meta Pixel');
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
		declareOwnedVendors(
			kernel,
			[{ category: 'measurement', vendor: 'meta-pixel' }],
			Symbol('script')
		);
		declareOwnedVendors(
			kernel,
			[{ category: 'marketing', vendor: 'meta-pixel' }],
			Symbol('rule')
		);
		expect(declared(kernel)).toEqual([
			['meta-pixel', { or: ['measurement', 'marketing'] }],
		]);
		kernel.dispose();
	});
});

describe('vendorsListedUnder', () => {
	const listed = (category: 'marketing' | 'measurement') =>
		vendorsListedUnder(
			[
				{ ...meta, presentable: true, source: 'config' },
				{
					category: { or: ['marketing', 'measurement'] },
					id: 'shared',
					name: 'Shared',
					presentable: true,
					privacyPolicyUrl: 'https://example.com/privacy',
					source: 'config',
				},
				{
					category: { not: 'marketing' },
					id: 'contextual',
					name: 'Contextual',
					presentable: true,
					privacyPolicyUrl: 'https://example.com/privacy',
					source: 'config',
				},
				{
					category: 'marketing',
					id: 'slug-only',
					presentable: false,
					source: 'script',
				},
				{
					category: 'marketing',
					disabled: true,
					id: 'fixed',
					name: 'Fixed',
					presentable: true,
					privacyPolicyUrl: 'https://example.com/privacy',
					source: 'config',
				},
			],
			category
		).map((vendor) => vendor.id);

	test('lists presentable vendors naming the category, negations and slug-only excluded', () => {
		// A shared condition sits under both rows; a negated one under
		// neither; a `disabled` vendor is still listed, without a switch.
		expect(listed('marketing')).toEqual(['meta-pixel', 'shared', 'fixed']);
		expect(listed('measurement')).toEqual(['shared']);
	});
});

test('vendorRenders is false for a slug-only or negated declaration', () => {
	const base = {
		category: 'marketing' as const,
		id: 'v',
		name: 'V',
		presentable: true,
		privacyPolicyUrl: '',
		source: 'config' as const,
	};
	expect(vendorRenders(base)).toBe(true);
	expect(vendorRenders({ ...base, presentable: false })).toBe(false);
	expect(vendorRenders({ ...base, category: { not: 'marketing' } })).toBe(
		false
	);
	expect(
		vendorRenders({ ...base, category: { or: ['marketing', 'measurement'] } })
	).toBe(true);
});
