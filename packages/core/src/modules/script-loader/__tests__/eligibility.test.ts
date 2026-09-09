import { describe, expect, test } from 'vitest';

import {
	choiceRecords,
	iabRule,
	matchedResolution,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import {
	buildReconcilePass,
	hasScriptConsent,
	isEligible,
} from '../eligibility';
import { normalizeScripts } from '../normalize';
import type { Script } from '../types';

const snapshotForKernel = function snapshotForKernel(
	opts: Parameters<typeof createConsentKernel>[0]
) {
	return createConsentKernel(opts).getSnapshot();
};

describe('buildReconcilePass', () => {
	test('marks isIabMode true when snapshot.model is iab', () => {
		const snap = snapshotForKernel({
			initialIab: { enabled: true },
			initialPolicyResolution: matchedResolution(iabRule()),
		});
		const pass = buildReconcilePass(snap);
		expect(pass.isIabMode).toBe(true);
	});

	test('forwards consents directly when no policy scope is in play', () => {
		const snap = snapshotForKernel({});
		const pass = buildReconcilePass(snap);
		expect(pass.consents).toBe(snap.effectivePermissions);
	});
});

describe('isEligible', () => {
	const kernelOpts = {} as const;

	test('alwaysLoad short-circuits to true', () => {
		const snap = snapshotForKernel(kernelOpts);
		const pass = buildReconcilePass(snap);
		const [entry] = normalizeScripts([
			{
				alwaysLoad: true,
				category: 'marketing',
				id: 's',
				src: 'https://x.example/s.js',
			},
		]);
		if (!entry) {
			throw new Error('entry');
		}
		expect(isEligible(entry, pass)).toBe(true);
		expect(hasScriptConsent(entry, pass)).toBe(false);
	});

	test('IAB mode + missing iab slice denies a script with iab metadata', () => {
		// IAB mode with iab=null is not a real runtime state (the IAB
		// module would have set the slice), but we exercise the guard.
		const snap = snapshotForKernel({});
		const pass = { ...buildReconcilePass(snap), iab: null, isIabMode: true };
		const [entry] = normalizeScripts([
			{
				category: 'marketing',
				id: 's',
				src: 'https://x.example/s.js',
				vendorId: 'v1',
			},
		]);
		if (!entry) {
			throw new Error('entry');
		}
		expect(isEligible(entry, pass)).toBe(false);
	});

	test('simpleCategory grants when consent is true', () => {
		const snap = snapshotForKernel({
			initialRecords: choiceRecords({ marketing: true }),
		});
		const pass = buildReconcilePass(snap);
		const [entry] = normalizeScripts([
			{ category: 'marketing', id: 's', src: 'https://x.example/s.js' },
		]);
		if (!entry) {
			throw new Error('entry');
		}
		expect(isEligible(entry, pass)).toBe(true);
	});

	test('simpleCategory denies when consent is false', () => {
		const snap = snapshotForKernel({});
		const pass = buildReconcilePass(snap);
		const [entry] = normalizeScripts([
			{ category: 'marketing', id: 's', src: 'https://x.example/s.js' },
		]);
		if (!entry) {
			throw new Error('entry');
		}
		expect(isEligible(entry, pass)).toBe(false);
	});

	test('throws when simpleCategory references an unknown consent name', () => {
		const snap = snapshotForKernel({});
		const pass = buildReconcilePass(snap);
		const script = {
			category: 'analytics' as Script['category'],
			id: 's',
			src: 'https://x.example/s.js',
		};
		const entry = {
			hasIabMeta: false,
			script: script as Script,
			simpleCategory: 'analytics' as never,
		};
		expect(() => isEligible(entry, pass)).toThrow(/not found/u);
	});
});
