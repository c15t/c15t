import { describe, expect, test } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { applyInitResponse, readInitResolution } from '../apply-init-response';
import { applyPatch } from '../patch';
import { buildInitialSnapshot } from '../snapshot';

const LEGACY_OPT_OUT = {
	consent: { categories: ['*'] as ['*'], scopeMode: 'permissive' as const },
	id: 'legacy-opt-out',
	model: 'opt-out' as const,
	ui: { mode: 'banner' as const },
};

describe('readInitResolution', () => {
	test('an own policyResolution field is read strictly', () => {
		const matched = matchedResolution(optInRule());
		expect(
			readInitResolution({ policyResolution: { ...matched, version: 1 } })
		).toMatchObject({ policyId: 'test-opt-in', status: 'matched' });
		expect(
			readInitResolution({ policyResolution: { ...matched, version: 2 } })
		).toEqual({
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
		});
		expect(readInitResolution({ policyResolution: null })).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});
		expect(readInitResolution({ policyResolution: undefined })).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});
	});

	test('a legacy policy field is lifted, the no_banner sentinel is no-match', () => {
		expect(readInitResolution({ policy: LEGACY_OPT_OUT })).toMatchObject({
			policyId: 'legacy-opt-out',
			status: 'matched',
		});
		expect(
			readInitResolution({
				policy: { id: 'no_banner', model: 'none', ui: { mode: 'none' } },
			})
		).toEqual({ policy: null, status: 'no-match' });
	});

	test('a response without any policy field is a malformed complete init', () => {
		expect(readInitResolution({})).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});
	});
});

describe('applyInitResponse', () => {
	test('an empty response is a complete init: finalizes and fails safely', () => {
		const snap = buildInitialSnapshot({ now: NOW });
		const { patch } = applyInitResponse(snap, {}, NOW);
		expect(patch.policyProvisional).toBe(false);
		expect(patch.resolution).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});
		expect(patch.policy).toBeNull();
	});

	test('a complete response replaces a prior matched resolution', () => {
		const snap = applyPatch(buildInitialSnapshot({ now: NOW }), {
			policySnapshotToken: 'tok',
			resolution: matchedResolution(optOutRule({ prompt: 'none' })),
		});
		expect(snap.effectivePermissions.marketing).toBe(true);
		const { patch } = applyInitResponse(snap, {}, NOW);
		const next = applyPatch(snap, patch);
		expect(next.resolution.status).toBe('failed');
		expect(next.policySnapshotToken).toBeNull();
		expect(next.effectivePermissions.marketing).toBe(false);
		expect(next.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
	});

	test('folds resolvedOverrides over current overrides', () => {
		const snap = buildInitialSnapshot({
			initialOverrides: { language: 'en' },
			now: NOW,
		});
		const { patch } = applyInitResponse(
			snap,
			{ resolvedOverrides: { country: 'US' } },
			NOW
		);
		expect(patch.overrides).toEqual({ country: 'US', language: 'en' });
	});

	test('gvl: null disables IAB even if previously enabled', () => {
		const snap = buildInitialSnapshot({
			initialIab: { cmpId: 7, enabled: true },
			now: NOW,
		});
		const { patch } = applyInitResponse(snap, { gvl: null }, NOW);
		expect(patch.iab?.enabled).toBe(false);
		expect(patch.iab?.gvl).toBeNull();
		expect(patch.iab?.cmpId).toBe(7);
	});

	test('a non-matched resolution clears policy-derived IAB enablement', () => {
		const snap = buildInitialSnapshot({
			initialIab: { enabled: true },
			now: NOW,
		});
		const { patch } = applyInitResponse(
			snap,
			{ policyResolution: { policy: null, status: 'no-match', version: 1 } },
			NOW
		);
		expect(patch.resolution).toEqual({ policy: null, status: 'no-match' });
		expect(patch.iab?.enabled).toBe(false);
	});

	test('consents seed the draft, hasConsented is ignored, records hydrate', () => {
		const snap = buildInitialSnapshot({ now: NOW });
		const applied = applyInitResponse(
			snap,
			{
				consents: { marketing: true },
				hasConsented: true,
				records: choiceRecords({ measurement: true }),
				subjectId: 'sub_server',
			},
			NOW
		);
		expect(applied.draft).toEqual({ marketing: true });
		expect(applied.patch.explicitChoice?.categories.measurement?.value).toBe(
			true
		);
		expect(applied.patch.subject).toEqual({ subjectId: 'sub_server' });
		expect(applied.recordIssues).toBeNull();
		const next = applyPatch(snap, applied.patch);
		expect(next.effectivePermissions.measurement).toBe(true);
		expect(next.effectivePermissions.marketing).toBe(false);
	});

	test('invalid records are reported and not applied', () => {
		const snap = buildInitialSnapshot({ now: NOW });
		const applied = applyInitResponse(
			snap,
			{ records: choiceRecords({ marketing: true }, { confirmedAt: NOW + 1 }) },
			NOW
		);
		expect(applied.recordIssues?.[0]?.code).toBe('future-timestamp');
		expect(applied.patch.explicitChoice).toBeUndefined();
	});

	test('detected GPC from the response is separate from overrides', () => {
		const snap = buildInitialSnapshot({ now: NOW });
		const { patch } = applyInitResponse(
			snap,
			{ resolvedPrivacySignals: { gpc: true } },
			NOW
		);
		expect(patch.privacyDetected).toBe(true);
		expect(patch.overrides).toBeUndefined();
	});

	test('legacy policy carries banner/dialog UI hints and the token', () => {
		const snap = buildInitialSnapshot({ now: NOW });
		const { patch } = applyInitResponse(
			snap,
			{
				policy: {
					...LEGACY_OPT_OUT,
					ui: {
						banner: { theme: 'dark' },
						dialog: { theme: 'light' },
						mode: 'banner',
					},
					// oxlint-disable-next-line typescript/no-explicit-any -- minimal policy fixture
				} as any,
				policySnapshotToken: 'tok-1',
			},
			NOW
		);
		const next = applyPatch(snap, patch);
		expect(next.policyBanner).toEqual({ theme: 'dark' });
		expect(next.policyDialog).toEqual({ theme: 'light' });
		expect(next.policySnapshotToken).toBe('tok-1');
		expect(next.model).toBe('opt-out');
		expect(next.resolution.status).toBe('matched');
	});

	test('same-language partial translations deep-merge over current copy', () => {
		const snap = buildInitialSnapshot({
			initialTranslations: {
				language: 'en',
				translations: {
					common: { acceptAll: 'Accept', securedBy: 'Secured by' },
				} as never,
			},
			now: NOW,
		});
		const { patch } = applyInitResponse(
			snap,
			{
				translations: {
					language: 'en',
					translations: { common: { acceptAll: 'Yes' } } as never,
				},
			},
			NOW
		);
		expect(patch.translations?.translations).toMatchObject({
			common: { acceptAll: 'Yes', securedBy: 'Secured by' },
		});
	});

	test('language switch replaces translations outright', () => {
		const snap = buildInitialSnapshot({
			initialTranslations: {
				language: 'en',
				translations: { common: { securedBy: 'Secured by' } } as never,
			},
			now: NOW,
		});
		const { patch } = applyInitResponse(
			snap,
			{
				translations: {
					language: 'de',
					translations: { common: { acceptAll: 'Ja' } } as never,
				},
			},
			NOW
		);
		expect(patch.translations?.translations).toEqual({
			common: { acceptAll: 'Ja' },
		});
	});
});
