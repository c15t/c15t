import { describe, expect, test } from 'vitest';
import { applyInitResponse } from '../apply-init-response';
import { buildInitialSnapshot } from '../snapshot';

describe('applyInitResponse', () => {
	test('returns null for an empty response (no-op)', () => {
		const snap = buildInitialSnapshot({});
		expect(applyInitResponse(snap, {})).toBeNull();
	});

	test('folds resolvedOverrides over current overrides', () => {
		const snap = buildInitialSnapshot({
			initialOverrides: { language: 'en' },
		});
		const patch = applyInitResponse(snap, {
			resolvedOverrides: { country: 'US' },
		});
		expect(patch?.overrides).toEqual({ language: 'en', country: 'US' });
	});

	test('gvl: null disables IAB even if previously enabled', () => {
		const snap = buildInitialSnapshot({
			initialIab: { enabled: true, cmpId: 7 },
		});
		const patch = applyInitResponse(snap, { gvl: null });
		expect(patch?.iab).not.toBeNull();
		expect(patch?.iab?.enabled).toBe(false);
		expect(patch?.iab?.gvl).toBeNull();
		expect(patch?.iab?.cmpId).toBe(7);
	});

	test('partial response.consents merges only changed boolean fields', () => {
		const snap = buildInitialSnapshot({});
		const patch = applyInitResponse(snap, {
			consents: { marketing: true },
		});
		expect(patch?.consents?.marketing).toBe(true);
		expect(patch?.consents?.necessary).toBe(true);
	});

	test('hasConsented from response is preserved on the patch', () => {
		const snap = buildInitialSnapshot({});
		const patch = applyInitResponse(snap, { hasConsented: true });
		expect(patch?.hasConsented).toBe(true);
	});

	test('policy carries banner/dialog UI hints onto the patch', () => {
		const snap = buildInitialSnapshot({});
		const patch = applyInitResponse(snap, {
			policy: {
				model: 'opt-in',
				ui: {
					mode: 'banner',
					banner: { theme: 'dark' },
					dialog: { theme: 'light' },
				},
				// biome-ignore lint/suspicious/noExplicitAny: minimal policy fixture
			} as any,
		});
		expect(patch?.policyBanner).toEqual({ theme: 'dark' });
		expect(patch?.policyDialog).toEqual({ theme: 'light' });
	});

	test('model + activeUI are derived after policy and IAB are folded', () => {
		const snap = buildInitialSnapshot({});
		const patch = applyInitResponse(snap, {
			policy: {
				model: 'opt-in',
				ui: { mode: 'banner' },
				// biome-ignore lint/suspicious/noExplicitAny: minimal policy fixture
			} as any,
		});
		expect(patch?.model).toBe('opt-in');
		expect(patch?.activeUI).toBe('banner');
	});

	test('policy categories + scope mode are populated in the patch', () => {
		const snap = buildInitialSnapshot({});
		const patch = applyInitResponse(snap, {
			policy: {
				model: 'opt-in',
				consent: {
					categories: ['necessary', 'marketing'],
					scopeMode: 'strict',
				},
				ui: { mode: 'banner' },
				// biome-ignore lint/suspicious/noExplicitAny: minimal policy fixture
			} as any,
		});
		expect(patch?.policyCategories).toEqual(['necessary', 'marketing']);
		expect(patch?.policyScopeMode).toBe('strict');
	});
});
