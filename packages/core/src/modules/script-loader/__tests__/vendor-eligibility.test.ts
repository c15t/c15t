import { describe, expect, test } from 'vitest';

import {
	choiceRecords,
	iabRule,
	matchedResolution,
	NOW,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { buildCallbackInfo } from '../callbacks';
import { buildReconcilePass, hasScriptConsent } from '../eligibility';
import { createScriptLoader } from '../index';
import { normalizeScripts } from '../normalize';
import type { Script } from '../types';

/** The slugs these tests deny, declared so the gate honors the denial. */
const declaredVendors = (ids: readonly string[]) => ({
	declared: ids.map((id) => ({
		category: 'marketing' as const,
		id,
		presentable: false,
		source: 'script' as const,
	})),
	listVersion: null,
});

const snapshotFor = (denied: string[], iab = false) =>
	createConsentKernel({
		...(iab && {
			initialIab: { enabled: true },
			initialPolicyResolution: matchedResolution(iabRule()),
		}),
		initialRecords: {
			...choiceRecords({ marketing: true, measurement: true }),
			vendorChoice: { confirmedAt: NOW - 1, denied, version: 1 },
		},
		initialVendors: declaredVendors(denied),
		now: NOW,
	}).getSnapshot();

const script = (overrides: Partial<Script> = {}): Script => ({
	category: 'marketing',
	id: 'meta',
	src: 'https://connect.facebook.net/en_US/fbevents.js',
	vendor: 'meta-pixel',
	...overrides,
});

describe('script vendor eligibility', () => {
	test('normalization keeps a non-empty vendor slug', () => {
		const [withVendor, without] = normalizeScripts([
			script(),
			script({ id: 'b', vendor: '' }),
		]);
		expect(withVendor?.vendor).toBe('meta-pixel');
		expect(without?.vendor).toBeNull();
	});

	test('the pass carries the denial set only when something is denied', () => {
		expect(buildReconcilePass(snapshotFor([])).vendorDenied).toBeNull();
		expect(
			buildReconcilePass(snapshotFor(['meta-pixel'])).vendorDenied?.has(
				'meta-pixel'
			)
		).toBe(true);
	});

	test('a denied vendor blocks the simple-category fast path and the tree path', () => {
		const pass = buildReconcilePass(snapshotFor(['meta-pixel']));
		const [simple, tree, other] = normalizeScripts([
			script(),
			script({ category: { or: ['marketing', 'measurement'] }, id: 'tree' }),
			script({ id: 'other', vendor: 'other' }),
		]);
		if (!(simple && tree && other)) {
			throw new Error('expected three normalized scripts');
		}
		expect(hasScriptConsent(simple, pass)).toBe(false);
		expect(hasScriptConsent(tree, pass)).toBe(false);
		expect(hasScriptConsent(other, pass)).toBe(true);
	});

	test('the vendor slug is ignored in IAB mode', () => {
		const snap = snapshotFor(['meta-pixel'], true);
		const pass = buildReconcilePass(snap);
		const [entry] = normalizeScripts([script()]);
		if (!entry) {
			throw new Error('expected a normalized script');
		}
		expect(hasScriptConsent(entry, pass)).toBe(
			snap.effectivePermissions.marketing
		);
	});

	test('callback info reports the vendor grant outside IAB mode only', () => {
		const denied = buildCallbackInfo(
			script(),
			snapshotFor(['meta-pixel']),
			false,
			'el'
		);
		expect(denied.vendor).toEqual({ granted: false, id: 'meta-pixel' });
		const granted = buildCallbackInfo(script(), snapshotFor([]), true, 'el');
		expect(granted.vendor).toEqual({ granted: true, id: 'meta-pixel' });
		const iab = buildCallbackInfo(
			script(),
			snapshotFor(['meta-pixel'], true),
			true,
			'el'
		);
		expect(iab.vendor).toBeUndefined();
		const plain = buildCallbackInfo(
			script({ vendor: undefined }),
			snapshotFor([]),
			true,
			'el'
		);
		expect(plain.vendor).toBeUndefined();
	});
});

describe('script-owned vendor declarations', () => {
	test('a script list swapped in later declares its vendor slug', () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
			now: NOW,
		});
		const loader = createScriptLoader({ kernel, scripts: [] });
		expect(kernel.getSnapshot().vendors).toBeNull();
		// No DOM in this suite, so the script must not try to mount.
		loader.updateScripts([script({ callbackOnly: true })]);
		const declared = kernel.getSnapshot().vendors?.declared ?? [];
		expect(declared.map((vendor) => [vendor.id, vendor.source])).toEqual([
			['meta-pixel', 'script'],
		]);
		// The script moves category: the vendor moves with it.
		loader.updateScripts([
			script({ callbackOnly: true, category: 'measurement' }),
		]);
		expect(kernel.getSnapshot().vendors?.declared[0]?.category).toBe(
			'measurement'
		);
		loader.dispose();
		kernel.dispose();
	});

	test('a script with a nested condition does not get its config frozen', () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
			now: NOW,
		});
		const category: Script['category'] = {
			or: ['marketing', 'measurement'],
		};
		const loader = createScriptLoader({ kernel, scripts: [] });
		loader.updateScripts([script({ callbackOnly: true, category })]);
		expect(Object.isFrozen(category)).toBe(false);
		expect(Object.isFrozen(category.or)).toBe(false);
		loader.dispose();
		kernel.dispose();
	});
});
