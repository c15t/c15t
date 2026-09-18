import { describe, expect, test, vi } from 'vitest';

import type { ResolvedVendor } from '../../types';
import { mergeDeclaredVendors, resolveVendors } from '../vendors';

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

	test('a vendor whose category is only necessary is disabled', () => {
		const resolved = resolveVendors({
			config: [{ ...meta, category: 'necessary', id: 'cdn' }],
		});
		expect(resolved[0]?.disabled).toBe(true);
	});

	test('an explicit disabled flag is kept', () => {
		const resolved = resolveVendors({
			config: [{ ...meta, disabled: true }],
		});
		expect(resolved[0]?.disabled).toBe(true);
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
		const current = [config];
		expect(mergeDeclaredVendors(current, [])).toBe(current);
		expect(mergeDeclaredVendors(current, [manifest])).toBe(current);
	});

	test('a higher-priority source replaces a lower one', () => {
		const merged = mergeDeclaredVendors([manifest], [config]);
		expect(merged[0]?.name).toBe('Meta Pixel');
		expect(merged[0]?.source).toBe('config');
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
