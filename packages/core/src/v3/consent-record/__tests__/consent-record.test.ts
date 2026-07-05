import type { InitOutput } from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	type Consent,
	deriveActiveConsentUi,
	interpretStoredConsent,
} from '../index';

const NOW = 1_800_000_000_000;

function makeConsent(overrides: Partial<Consent> = {}): Consent {
	return {
		policies: {},
		categories: {},
		...overrides,
	};
}

function makeInit(
	overrides: {
		model?: 'opt-in' | 'opt-out' | 'none' | 'iab';
		uiMode?: 'banner' | 'dialog' | 'none';
		fingerprint?: string;
		expiryDays?: number;
		gpc?: boolean;
		categories?: Array<'*' | keyof Consent['categories']>;
		scopeMode?: 'strict' | 'permissive';
	} = {}
): InitOutput {
	return {
		policy: {
			id: 'policy-1',
			model: overrides.model ?? 'opt-in',
			consent: {
				categories: overrides.categories ?? ['*'],
				expiryDays: overrides.expiryDays,
				gpc: overrides.gpc,
				scopeMode: overrides.scopeMode,
			},
			ui: {
				mode: overrides.uiMode ?? 'banner',
			},
		},
		policyDecision: {
			policyId: 'policy-1',
			fingerprint: overrides.fingerprint ?? 'fingerprint-1',
		},
	} as InitOutput;
}

describe('interpretStoredConsent', () => {
	it('treats opt-in silence as denied except necessary', () => {
		expect(interpretStoredConsent(makeConsent(), makeInit())).toEqual([
			'necessary',
		]);
	});

	it('treats opt-in out-of-policy silence as denied even in permissive scope', () => {
		expect(
			interpretStoredConsent(
				makeConsent(),
				makeInit({
					categories: ['necessary'],
					scopeMode: 'permissive',
				})
			)
		).toEqual(['necessary']);
	});

	it('treats opt-out silence as granted', () => {
		expect(
			interpretStoredConsent(makeConsent(), makeInit({ model: 'opt-out' }))
		).toEqual([
			'necessary',
			'functionality',
			'experience',
			'measurement',
			'marketing',
		]);
	});

	it('keeps opt-out permissive out-of-policy silence granted', () => {
		expect(
			interpretStoredConsent(
				makeConsent(),
				makeInit({
					model: 'opt-out',
					categories: ['necessary'],
					scopeMode: 'permissive',
				})
			)
		).toEqual([
			'necessary',
			'functionality',
			'experience',
			'measurement',
			'marketing',
		]);
	});

	it('honors GPC for opt-out tracking categories when the policy enables it', () => {
		expect(
			interpretStoredConsent(
				makeConsent(),
				makeInit({ model: 'opt-out', gpc: true }),
				true
			)
		).toEqual(['necessary', 'functionality', 'experience']);
	});
});

describe('deriveActiveConsentUi', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the configured surface when the stored fingerprint is stale', () => {
		const consent = makeConsent({
			policies: {
				'policy-1': {
					fingerprint: 'old-fingerprint',
					timestamp: String(NOW),
				},
			},
		});

		expect(deriveActiveConsentUi(consent, makeInit())).toBe('banner');
	});

	it('suppresses the surface for a fresh matching acknowledgement', () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);

		const consent = makeConsent({
			policies: {
				'policy-1': {
					fingerprint: 'fingerprint-1',
					timestamp: String(NOW - 2_000),
				},
			},
		});

		expect(deriveActiveConsentUi(consent, makeInit({ expiryDays: 1 }))).toBe(
			null
		);
	});

	it('shows the surface when expiryDays makes the acknowledgement stale', () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);

		const consent = makeConsent({
			policies: {
				'policy-1': {
					fingerprint: 'fingerprint-1',
					timestamp: String(NOW - 2 * 86_400_000),
				},
			},
		});

		expect(deriveActiveConsentUi(consent, makeInit({ expiryDays: 1 }))).toBe(
			'banner'
		);
	});

	it('suppresses opt-out prompts when GPC is present', () => {
		expect(
			deriveActiveConsentUi(makeConsent(), makeInit({ model: 'opt-out' }), true)
		).toBe(null);
	});
});
