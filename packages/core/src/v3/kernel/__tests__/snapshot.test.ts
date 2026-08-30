import { describe, expect, test } from 'vitest';
import {
	buildInitialConsents,
	buildInitialIab,
	buildInitialSnapshot,
	DEFAULT_CONSENTS,
	DEFAULT_IAB,
} from '../snapshot';

describe('buildInitialConsents', () => {
	test('returns defaults when no overrides', () => {
		expect(buildInitialConsents(undefined)).toEqual(DEFAULT_CONSENTS);
	});

	test('does not return the same reference as DEFAULT_CONSENTS', () => {
		// Defensive copy: the kernel must never share the module-level
		// DEFAULT_CONSENTS reference, or one kernel mutation could leak
		// into the next kernel's defaults.
		expect(buildInitialConsents(undefined)).not.toBe(DEFAULT_CONSENTS);
	});

	test('merges boolean overrides', () => {
		const result = buildInitialConsents({ marketing: true });
		expect(result.marketing).toBe(true);
		expect(result.necessary).toBe(true);
		expect(result.functionality).toBe(false);
	});

	test('drops non-boolean overrides silently', () => {
		const result = buildInitialConsents({
			// oxlint-disable-next-line typescript/no-explicit-any -- deliberately invalid input
			marketing: 'yes' as any,
		});
		expect(result.marketing).toBe(false);
	});

	test('drops unknown keys silently', () => {
		const result = buildInitialConsents({
			// oxlint-disable-next-line typescript/no-explicit-any -- deliberately invalid input
			analytics: true as any,
		});
		expect('analytics' in result).toBe(false);
	});
});

describe('buildInitialIab', () => {
	test('returns null when no seed', () => {
		expect(buildInitialIab(undefined)).toBeNull();
	});

	test('merges over the IAB defaults when a seed is provided', () => {
		const result = buildInitialIab({ enabled: true, cmpId: 7 });
		expect(result).not.toBeNull();
		expect(result?.enabled).toBe(true);
		expect(result?.cmpId).toBe(7);
		expect(result?.gvl).toBeNull();
		expect(result?.tcString).toBeNull();
	});

	test('does not return the same reference as DEFAULT_IAB', () => {
		const result = buildInitialIab({ enabled: true });
		expect(result).not.toBe(DEFAULT_IAB);
	});
});

describe('freezeSnapshot', () => {
	test('freezes the top-level object and known nested objects', () => {
		const snap = buildInitialSnapshot({});
		expect(Object.isFrozen(snap)).toBe(true);
		expect(Object.isFrozen(snap.consents)).toBe(true);
		expect(Object.isFrozen(snap.overrides)).toBe(true);
		expect(Object.isFrozen(snap.policyCategories)).toBe(true);
	});
});

describe('buildInitialSnapshot', () => {
	test('returns a frozen snapshot at revision 0', () => {
		const snap = buildInitialSnapshot({});
		expect(snap.revision).toBe(0);
		expect(Object.isFrozen(snap)).toBe(true);
	});

	test('uses defaults for omitted config', () => {
		const snap = buildInitialSnapshot({});
		expect(snap.consents).toEqual(DEFAULT_CONSENTS);
		expect(snap.overrides).toEqual({});
		expect(snap.user).toBeNull();
		expect(snap.subjectId).toBeNull();
		expect(snap.hasConsented).toBe(false);
		expect(snap.translations).toBeNull();
		expect(snap.branding).toBeNull();
		expect(snap.policy).toBeNull();
		expect(snap.iab).toBeNull();
		expect(snap.model).toBeNull();
	});

	test('IAB-on seed produces a non-null IAB slice', () => {
		const snap = buildInitialSnapshot({ initialIab: { enabled: true } });
		expect(snap.iab).not.toBeNull();
		expect(snap.iab?.enabled).toBe(true);
	});

	test('initial subjectId is preserved', () => {
		const snap = buildInitialSnapshot({ initialSubjectId: 'sub_42' });
		expect(snap.subjectId).toBe('sub_42');
	});

	test('initialHasConsented hides active UI and preserves user consents', () => {
		const snap = buildInitialSnapshot({
			initialHasConsented: true,
			initialConsents: { marketing: true, measurement: true },
			initialPolicy: {
				model: 'opt-in',
				ui: {
					mode: 'banner',
				},
				consent: {
					categories: ['marketing'],
					scopeMode: 'strict',
				},
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
		});

		expect(snap.hasConsented).toBe(true);
		expect(snap.activeUI).toBe('none');
		expect(snap.consents.marketing).toBe(true);
		expect(snap.consents.measurement).toBe(true);
	});

	test('fresh opt-in policy denies optional consents even when preselected', () => {
		const snap = buildInitialSnapshot({
			initialPolicy: {
				model: 'opt-in',
				ui: { mode: 'banner' },
				consent: {
					categories: [
						'necessary',
						'functionality',
						'measurement',
						'marketing',
					],
					preselectedCategories: [
						'necessary',
						'functionality',
						'measurement',
						'marketing',
					],
					scopeMode: 'strict',
				},
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
		});

		expect(snap.hasConsented).toBe(false);
		expect(snap.consents).toMatchObject({
			necessary: true,
			functionality: false,
			marketing: false,
			measurement: false,
			experience: false,
		});
	});

	test('fresh opt-in permissive policy denies out-of-policy optional consents', () => {
		const snap = buildInitialSnapshot({
			initialPolicy: {
				model: 'opt-in',
				ui: { mode: 'banner' },
				consent: {
					categories: ['necessary'],
					preselectedCategories: ['necessary'],
					scopeMode: 'permissive',
				},
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
		});

		expect(snap.hasConsented).toBe(false);
		expect(snap.consents).toEqual({
			necessary: true,
			functionality: false,
			marketing: false,
			measurement: false,
			experience: false,
		});
	});

	test('fresh opt-out policy grants optional consents except GPC tracking categories', () => {
		const snap = buildInitialSnapshot({
			initialOverrides: { gpc: true },
			initialPolicy: {
				model: 'opt-out',
				ui: { mode: 'banner' },
				consent: {
					categories: [
						'necessary',
						'functionality',
						'experience',
						'measurement',
						'marketing',
					],
					gpc: true,
					scopeMode: 'strict',
				},
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
		});

		expect(snap.hasConsented).toBe(false);
		expect(snap.consents).toMatchObject({
			necessary: true,
			functionality: true,
			experience: true,
			measurement: false,
			marketing: false,
		});
	});

	test('initial banner/dialog UI hints are copied off the policy', () => {
		const snap = buildInitialSnapshot({
			initialPolicy: {
				model: 'opt-in',
				ui: {
					mode: 'banner',
					banner: { theme: 'dark' },
					dialog: { theme: 'light' },
				},
				// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
			} as any,
		});
		expect(snap.policyBanner).toEqual({ theme: 'dark' });
		expect(snap.policyDialog).toEqual({ theme: 'light' });
	});

	test('does not share user reference with config', () => {
		const user = { externalId: 'u1' };
		const snap = buildInitialSnapshot({ initialUser: user });
		expect(snap.user).toEqual(user);
		expect(snap.user).not.toBe(user);
	});
});
