import { describe, expect, test } from 'vitest';
import { createConsentKernel } from '../../../kernel';
import { buildReconcilePass, isEligible } from '../eligibility';
import { normalizeScripts } from '../normalize';
import type { Script } from '../types';

function snapshotForKernel(opts: Parameters<typeof createConsentKernel>[0]) {
	return createConsentKernel(opts).getSnapshot();
}

describe('buildReconcilePass', () => {
	test('marks isIabMode true when snapshot.model is iab', () => {
		const snap = snapshotForKernel({
			initialPolicy: {
				model: 'iab',
				ui: { mode: 'banner' },
				// biome-ignore lint/suspicious/noExplicitAny: minimal policy fixture
			} as any,
			initialIab: { enabled: true },
		});
		const pass = buildReconcilePass(snap);
		expect(pass.isIabMode).toBe(true);
	});

	test('forwards consents directly when no policy scope is in play', () => {
		const snap = snapshotForKernel({});
		const pass = buildReconcilePass(snap);
		expect(pass.consents).toBe(snap.consents);
	});
});

describe('isEligible', () => {
	const kernelOpts = {} as const;

	test('alwaysLoad short-circuits to true', () => {
		const snap = snapshotForKernel(kernelOpts);
		const pass = buildReconcilePass(snap);
		const [entry] = normalizeScripts([
			{
				id: 's',
				src: 'https://x.example/s.js',
				category: 'marketing',
				alwaysLoad: true,
			},
		]);
		if (!entry) throw new Error('entry');
		expect(isEligible(entry, pass)).toBe(true);
	});

	test('IAB mode + missing iab slice denies a script with iab metadata', () => {
		// IAB mode with iab=null is not a real runtime state (the IAB
		// module would have set the slice), but we exercise the guard.
		const snap = snapshotForKernel({});
		const pass = { ...buildReconcilePass(snap), isIabMode: true, iab: null };
		const [entry] = normalizeScripts([
			{
				id: 's',
				src: 'https://x.example/s.js',
				category: 'marketing',
				vendorId: 'v1',
			},
		]);
		if (!entry) throw new Error('entry');
		expect(isEligible(entry, pass)).toBe(false);
	});

	test('simpleCategory grants when consent is true', () => {
		const snap = snapshotForKernel({
			initialConsents: { marketing: true },
		});
		const pass = buildReconcilePass(snap);
		const [entry] = normalizeScripts([
			{ id: 's', src: 'https://x.example/s.js', category: 'marketing' },
		]);
		if (!entry) throw new Error('entry');
		expect(isEligible(entry, pass)).toBe(true);
	});

	test('simpleCategory denies when consent is false', () => {
		const snap = snapshotForKernel({});
		const pass = buildReconcilePass(snap);
		const [entry] = normalizeScripts([
			{ id: 's', src: 'https://x.example/s.js', category: 'marketing' },
		]);
		if (!entry) throw new Error('entry');
		expect(isEligible(entry, pass)).toBe(false);
	});

	test('throws when simpleCategory references an unknown consent name', () => {
		const snap = snapshotForKernel({});
		const pass = buildReconcilePass(snap);
		const script = {
			id: 's',
			src: 'https://x.example/s.js',
			category: 'analytics' as Script['category'],
		};
		const entry = {
			script: script as Script,
			hasIabMeta: false,
			simpleCategory: 'analytics' as never,
		};
		expect(() => isEligible(entry, pass)).toThrow(/not found/);
	});
});
