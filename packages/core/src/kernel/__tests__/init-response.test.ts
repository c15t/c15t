/**
 * How `init()` folds a complete `/init` response into the snapshot, seen
 * through the kernel interface.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import type { InitResponse, KernelConfig } from '../../types';
import { createConsentKernel } from '../index';

const LEGACY_OPT_OUT = {
	consent: { categories: ['*'] as ['*'], scopeMode: 'permissive' as const },
	id: 'legacy-opt-out',
	model: 'opt-out' as const,
	ui: { mode: 'banner' as const },
};

beforeEach(() => {
	vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
	vi.restoreAllMocks();
});

/** The snapshot after one `init()` the transport answers with `response`. */
const initWith = async function initWith(
	response: InitResponse,
	config: KernelConfig = {}
) {
	const kernel = createConsentKernel({
		now: NOW,
		...config,
		initRetry: false,
		transport: { init: () => Promise.resolve(response) },
	});
	await kernel.commands.init();
	kernel.dispose();
	return kernel.getSnapshot();
};

describe('the policy contract', () => {
	test('an own policyResolution field is read strictly', async () => {
		const matched = matchedResolution(optInRule());
		expect(
			(await initWith({ policyResolution: { ...matched, version: 1 } }))
				.resolution
		).toMatchObject({ policyId: 'test-opt-in', status: 'matched' });
		expect(
			(await initWith({ policyResolution: { ...matched, version: 2 } }))
				.resolution
		).toEqual({
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
		});
		expect((await initWith({ policyResolution: null })).resolution).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});
		expect(
			(await initWith({ policyResolution: undefined })).resolution
		).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});
	});

	test('a legacy policy field cannot establish authority without the versioned contract', async () => {
		const snapshot = await initWith({
			policy: LEGACY_OPT_OUT,
			policySnapshotToken: 'old-token',
		} as InitResponse);
		expect(snapshot.resolution).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});
		expect(snapshot.policySnapshotToken).toBeNull();
	});

	test('an empty response is a complete init: finalizes and fails safely', async () => {
		const snapshot = await initWith({}, { initialPolicyPending: true });
		expect(snapshot.policyPending).toBe(false);
		expect(snapshot.resolution).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});
		expect(snapshot.policySnapshotToken).toBeNull();
	});

	test('a complete response replaces a prior matched resolution', async () => {
		const initialPolicyResolution = matchedResolution(
			optOutRule({ prompt: 'none' })
		);
		expect(
			createConsentKernel({ initialPolicyResolution, now: NOW }).getSnapshot()
				.effectivePermissions.marketing
		).toBe(true);
		const next = await initWith({}, { initialPolicyResolution });
		expect(next.resolution.status).toBe('failed');
		expect(next.policySnapshotToken).toBeNull();
		expect(next.effectivePermissions.marketing).toBe(false);
		expect(next.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
	});

	test('a matched policy contract carries its token', async () => {
		const resolution = matchedResolution(optOutRule());
		const next = await initWith({
			policyResolution: { ...resolution, version: 1 },
			policySnapshotToken: 'tok-1',
		});
		expect(next.policySnapshotToken).toBe('tok-1');
		expect(next.policyRule).toEqual(resolution.policy);
		expect(next.model).toBe('opt-out');
	});
});

describe('init folds the response', () => {
	test('folds resolvedOverrides over current overrides', async () => {
		const snapshot = await initWith(
			{ resolvedOverrides: { country: 'US' } },
			{ initialOverrides: { language: 'en' } }
		);
		expect(snapshot.overrides).toEqual({ country: 'US', language: 'en' });
	});

	test('gvl: null disables IAB even if previously enabled', async () => {
		const snapshot = await initWith(
			{ gvl: null },
			{ initialIab: { cmpId: 7, enabled: true } }
		);
		expect(snapshot.iab?.enabled).toBe(false);
		expect(snapshot.iab?.gvl).toBeNull();
		expect(snapshot.iab?.cmpId).toBe(7);
	});

	test('a non-matched resolution clears policy-derived IAB enablement', async () => {
		const snapshot = await initWith(
			{ policyResolution: { policy: null, status: 'no-match', version: 1 } },
			{ initialIab: { enabled: true } }
		);
		expect(snapshot.resolution).toEqual({ policy: null, status: 'no-match' });
		expect(snapshot.iab?.enabled).toBe(false);
	});

	test('client init accepts a reference without a redundant gvl field', async () => {
		const gvlReference = {
			language: 'en',
			summary: { items: ['Storage'], vendorCount: 2 },
			url: '/api/c15t/init?c15t-gvl=1',
			vendorListVersion: 1,
		};
		const snapshot = await initWith({
			gvlReference,
			policyResolution: { ...matchedResolution(optInRule()), version: 1 },
		});
		expect(snapshot.iab).toMatchObject({
			enabled: true,
			gvl: null,
			gvlReference,
		});
	});

	test('records apply as receipts with the server subject', async () => {
		// No policy contract: the safe fallback, whose choice fingerprint the
		// fixture records carry.
		const snapshot = await initWith({
			records: choiceRecords({ measurement: true }),
			subjectId: 'sub_server',
		});
		expect(snapshot.explicitChoice?.categories.measurement?.value).toBe(true);
		expect(snapshot.subject).toEqual({ subjectId: 'sub_server' });
		expect(snapshot.effectivePermissions.measurement).toBe(true);
		expect(snapshot.effectivePermissions.marketing).toBe(false);
	});

	test('invalid records are reported and not applied', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const snapshot = await initWith({
			records: choiceRecords({ marketing: true }, { confirmedAt: NOW + 1 }),
		});
		expect(snapshot.explicitChoice).toBeNull();
		expect(warn).toHaveBeenCalledWith(
			'[c15t] Ignored invalid server records on init.',
			[expect.objectContaining({ code: 'future-timestamp' })]
		);
	});

	test('detected GPC from the response is separate from overrides', async () => {
		const snapshot = await initWith({ resolvedPrivacySignals: { gpc: true } });
		expect(snapshot.privacySignals.gpc.detected).toBe(true);
		expect(snapshot.overrides).toEqual({});
	});
});

describe('init folds translations', () => {
	test('same-language partial translations deep-merge over current copy', async () => {
		const snapshot = await initWith(
			{
				translations: {
					language: 'en',
					translations: { common: { acceptAll: 'Yes' } } as never,
				},
			},
			{
				initialTranslations: {
					language: 'en',
					translations: {
						common: { acceptAll: 'Accept', securedBy: 'Secured by' },
					} as never,
				},
			}
		);
		expect(snapshot.translations?.translations).toMatchObject({
			common: { acceptAll: 'Yes', securedBy: 'Secured by' },
		});
	});

	test('initial copy and app overrides under frame read as consentGate', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const snapshot = createConsentKernel({
			initialTranslations: {
				language: 'en',
				translations: { frame: { title: 'Stored title' } } as never,
			},
			now: NOW,
			translationOverrides: {
				en: { frame: { actionButton: 'App button' } },
			},
		}).getSnapshot();
		expect(snapshot.translations?.translations).toMatchObject({
			consentGate: { actionButton: 'App button', title: 'Stored title' },
		});
		expect(snapshot.translations?.translations).not.toHaveProperty('frame');
	});

	test('language switch replaces translations outright', async () => {
		const snapshot = await initWith(
			{
				translations: {
					language: 'de',
					translations: { common: { acceptAll: 'Ja' } } as never,
				},
			},
			{
				initialTranslations: {
					language: 'en',
					translations: { common: { securedBy: 'Secured by' } } as never,
				},
			}
		);
		expect(snapshot.translations?.translations).toEqual({
			common: { acceptAll: 'Ja' },
		});
	});
});
