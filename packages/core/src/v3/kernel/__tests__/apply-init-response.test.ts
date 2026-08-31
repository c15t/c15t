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
		expect(patch?.overrides).toEqual({ country: 'US', language: 'en' });
	});

	test('gvl: null disables IAB even if previously enabled', () => {
		const snap = buildInitialSnapshot({
			initialIab: { cmpId: 7, enabled: true },
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
					banner: { theme: 'dark' },
					dialog: { theme: 'light' },
					mode: 'banner',
				},
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
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
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
		});
		expect(patch?.model).toBe('opt-in');
		expect(patch?.activeUI).toBe('banner');
	});

	test('keeps activeUI none when hydrated consent already exists', () => {
		const snap = buildInitialSnapshot({});
		const hydrated = {
			...snap,
			activeUI: 'none' as const,
			hasConsented: true,
		};
		const patch = applyInitResponse(hydrated, {
			policy: {
				model: 'opt-in',
				ui: { mode: 'banner' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
		});
		expect(patch?.model).toBe('opt-in');
		expect(patch?.activeUI).toBe('none');
	});

	test('policy categories + scope mode are populated in the patch', () => {
		const snap = buildInitialSnapshot({});
		const patch = applyInitResponse(snap, {
			policy: {
				consent: {
					categories: ['necessary', 'marketing'],
					scopeMode: 'strict',
				},
				model: 'opt-in',
				ui: { mode: 'banner' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
		});
		expect(patch?.policyCategories).toEqual(['necessary', 'marketing']);
		expect(patch?.policyScopeMode).toBe('strict');
	});

	test('fresh opt-in init keeps preselected optional categories denied', () => {
		const snap = buildInitialSnapshot({});
		const patch = applyInitResponse(snap, {
			policy: {
				consent: {
					categories: ['necessary', 'marketing', 'measurement'],
					preselectedCategories: ['necessary', 'marketing', 'measurement'],
					scopeMode: 'strict',
				},
				model: 'opt-in',
				ui: { mode: 'banner' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
		});

		expect(patch?.hasConsented).toBeUndefined();
		expect(patch?.consents).toMatchObject({
			marketing: false,
			measurement: false,
			necessary: true,
		});
	});

	test('fresh opt-in permissive init denies out-of-policy optional categories', () => {
		const snap = buildInitialSnapshot({});
		const patch = applyInitResponse(snap, {
			policy: {
				consent: {
					categories: ['necessary'],
					preselectedCategories: ['necessary'],
					scopeMode: 'permissive',
				},
				model: 'opt-in',
				ui: { mode: 'banner' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
		});

		expect(patch?.hasConsented).toBeUndefined();
		expect(patch?.consents).toMatchObject({
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		});
	});

	test('provisional policy: empty response still finalizes and derives activeUI', () => {
		const snap = buildInitialSnapshot({
			initialPolicy: {
				id: 'placeholder',
				model: 'opt-in',
				ui: { mode: 'banner' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
			initialPolicyProvisional: true,
		});
		expect(snap.activeUI).toBe('none');
		expect(snap.policyProvisional).toBe(true);

		const patch = applyInitResponse(snap, {});
		expect(patch).not.toBeNull();
		expect(patch?.policyProvisional).toBe(false);
		expect(patch?.activeUI).toBe('banner');
	});

	test('provisional policy: applied response finalizes with the resolved policy', () => {
		const snap = buildInitialSnapshot({
			initialPolicy: {
				id: 'placeholder',
				model: 'opt-in',
				ui: { mode: 'banner' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
			initialPolicyProvisional: true,
		});
		const patch = applyInitResponse(snap, {
			policy: {
				id: 'resolved',
				model: 'none',
				ui: { mode: 'none' },
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
		});
		expect(patch?.policyProvisional).toBe(false);
		// The resolved policy says no banner — the placeholder never showed one.
		expect(patch?.activeUI).toBe('none');
	});

	test('same-language partial translations deep-merge over current copy', () => {
		const snap = buildInitialSnapshot({
			initialTranslations: {
				language: 'en',
				translations: {
					common: { acceptAll: 'Accept All', securedBy: 'Secured by' },
					cookieBanner: {
						description: 'Default description',
						title: 'We value your privacy',
					},
					// oxlint-disable-next-line typescript/no-explicit-any -- minimal fixture
				} as any,
			},
		});
		const patch = applyInitResponse(snap, {
			translations: {
				language: 'en',
				translations: {
					cookieBanner: { title: 'Custom title' },
					// oxlint-disable-next-line typescript/no-explicit-any -- partial payload
				} as any,
			},
		});

		// oxlint-disable-next-line typescript/no-explicit-any -- fixture shape
		const merged = patch?.translations?.translations as any;
		expect(merged.cookieBanner.title).toBe('Custom title');
		// Omitted keys must keep their current values, not vanish.
		expect(merged.cookieBanner.description).toBe('Default description');
		expect(merged.common.securedBy).toBe('Secured by');
	});

	test('language switch replaces translations outright (no cross-language merge)', () => {
		const snap = buildInitialSnapshot({
			initialTranslations: {
				language: 'en',
				translations: {
					common: { securedBy: 'Secured by' },
					// oxlint-disable-next-line typescript/no-explicit-any -- minimal fixture
				} as any,
			},
		});
		const patch = applyInitResponse(snap, {
			translations: {
				language: 'de',
				translations: {
					cookieBanner: { title: 'Wir schätzen Ihre Privatsphäre' },
					// oxlint-disable-next-line typescript/no-explicit-any -- partial payload
				} as any,
			},
		});

		// oxlint-disable-next-line typescript/no-explicit-any -- fixture shape
		const replaced = patch?.translations?.translations as any;
		expect(patch?.translations?.language).toBe('de');
		expect(replaced.common?.securedBy).toBeUndefined();
	});
});
