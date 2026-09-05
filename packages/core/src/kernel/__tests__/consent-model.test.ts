/**
 * Behavioral coverage for the consolidated consent model, driven through
 * the public kernel boundaries (config, hydrate, commands, events, refresh)
 * and the shared conformance fixtures.
 */
import { normalizePolicyRule } from '@c15t/schema/types';
import type { PolicyResolution, PolicyRule } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	CHOICE_FINGERPRINT,
	LEGACY_FINGERPRINT,
	NOTICE_FINGERPRINT,
	POLICY_EXPIRED,
	POLICY_MAX_AGE,
	POLICY_NOW,
	POLICY_RECENT,
	POLICY_RECORDS,
	POLICY_SCOPE,
} from '../../../../../internals/conformance/src/fixtures/policy-records';
import type { PolicyRecordId } from '../../../../../internals/conformance/src/fixtures/policy-records';
import {
	choiceRecords,
	DAY,
	matchedResolution,
	noticeRule,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../kernel';
import { readStoredRecordsFromCookieHeader } from '../../modules/persistence/hydrate';
import type { HydrationRecords, InitResponse, KernelConfig } from '../../types';

/**
 * The fixture policy: opt-in, strict scope over marketing and measurement,
 * one-day validity, opaque fixture fingerprints. Built once per test file;
 * nothing hashes inside the kernel.
 */
const fixtureResolution = function fixtureResolution(
	overrides: Partial<PolicyRule> = {}
): PolicyResolution {
	const policy = normalizePolicyRule({
		categories: [...POLICY_SCOPE],
		id: 'fixture-policy',
		match: { isDefault: true },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'strict',
		validity: {
			choiceDays: POLICY_MAX_AGE / DAY,
			noticeDays: POLICY_MAX_AGE / DAY,
		},
		...overrides,
	});
	return {
		fingerprints: {
			choice: CHOICE_FINGERPRINT,
			legacyMaterial: LEGACY_FINGERPRINT,
			notice: NOTICE_FINGERPRINT,
			policy: 'policy-v1:current',
		},
		matchedBy: 'default',
		policy,
		policyId: policy.id,
		status: 'matched',
	};
};

/** Read a raw shared fixture the way a server would read the cookie. */
const recordsFor = function recordsFor(id: PolicyRecordId): HydrationRecords {
	return readStoredRecordsFromCookieHeader(
		`c15t=${POLICY_RECORDS[id].raw}`,
		undefined,
		POLICY_NOW
	);
};

const kernelFor = function kernelFor(
	id: PolicyRecordId,
	config: KernelConfig = {}
) {
	return createConsentKernel({
		initialPolicyResolution: fixtureResolution(),
		initialRecords: recordsFor(id),
		now: POLICY_NOW,
		...config,
	});
};

describe('shared fixtures: structural reading', () => {
	const ids = Object.keys(POLICY_RECORDS) as PolicyRecordId[];

	test.each(ids)('%s decodes to its expected choice', (id) => {
		const fixture = POLICY_RECORDS[id];
		const records = recordsFor(id);
		if (fixture.expected.valid) {
			expect(records.choice).toEqual(fixture.expected.choice);
			expect(records.subject).toEqual(fixture.expected.subject);
		} else {
			expect(records.choice).toBeNull();
		}
	});
});

describe('opt-in evaluation on shared records', () => {
	test('a fresh full legacy grant needs no prompt and grants both categories', () => {
		const snap = kernelFor('legacy-identified-grant').getSnapshot();
		expect(snap.effectivePermissions).toMatchObject({
			marketing: true,
			measurement: true,
		});
		expect(snap.promptRequirement).toEqual({ kind: 'none' });
		expect(snap.subject).toEqual({
			externalId: 'customer-1025',
			identityProvider: 'fixture-idp',
			subjectId: 'subject-1025',
		});
		expect(Object.keys(snap.explicitChoice?.categories ?? {})).not.toHaveLength(
			0
		);
	});

	test('an expired legacy grant is not effective and prompts with reason expired', () => {
		const snap = kernelFor('legacy-expired-grant').getSnapshot();
		expect(snap.effectivePermissions.marketing).toBe(false);
		expect(snap.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
		expect(Object.keys(snap.explicitChoice?.categories ?? {})).not.toHaveLength(
			0
		);
		expect(snap.explicitChoice?.categories.marketing?.confirmedAt).toBe(
			POLICY_EXPIRED
		);
	});

	test('an expired denial stays effective and needs no expiry prompt', () => {
		const snap = kernelFor('legacy-expired-denial').getSnapshot();
		expect(snap.effectivePermissions.marketing).toBe(false);
		expect(snap.restrictions.marketing).toEqual(['explicit-denial']);
		expect(snap.promptRequirement).toEqual({ kind: 'none' });
	});

	test('a legacy material mismatch invalidates positive authority and prompts policy-changed', () => {
		const snap = kernelFor('legacy-material-mismatch').getSnapshot();
		expect(snap.effectivePermissions.marketing).toBe(false);
		expect(snap.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'policy-changed',
		});
	});

	test('a legacy record without a material hash is grandfathered', () => {
		const snap = kernelFor('legacy-no-hash').getSnapshot();
		expect(snap.effectivePermissions.marketing).toBe(true);
		expect(snap.promptRequirement).toEqual({ kind: 'none' });
	});

	test('partial JSON coverage prompts missing while compact omission is a historical denial', () => {
		const partial = kernelFor('legacy-partial-json').getSnapshot();
		expect(partial.effectivePermissions.marketing).toBe(true);
		expect(partial.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});

		const compact = kernelFor('legacy-compact-omitted-false').getSnapshot();
		expect(compact.effectivePermissions.marketing).toBe(true);
		expect(compact.effectivePermissions.measurement).toBe(false);
		expect(compact.promptRequirement).toEqual({ kind: 'none' });
	});

	test('independent receipt times expire independently', () => {
		const kernel = kernelFor('v3-independent-times');
		const snap = kernel.getSnapshot();
		expect(snap.effectivePermissions.marketing).toBe(false);
		expect(snap.effectivePermissions.measurement).toBe(true);
		expect(snap.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
		expect(snap.nextDeadline).toBe(POLICY_RECENT + POLICY_MAX_AGE);
	});

	test('mixed bases keep the legacy denial effective beyond its lifetime', () => {
		const snap = kernelFor('v3-mixed-bases').getSnapshot();
		expect(snap.effectivePermissions.marketing).toBe(true);
		expect(snap.effectivePermissions.measurement).toBe(false);
		expect(snap.promptRequirement).toEqual({ kind: 'none' });
	});

	test('invalid records never salvage a grant', () => {
		for (const id of [
			'future-time',
			'string-time',
			'unsupported-v1-identity',
			'unsupported-version',
			'unknown-v3-category',
			'invalid-json',
		] as const) {
			const snap = kernelFor(id).getSnapshot();
			expect(snap.explicitChoice).toBeNull();
			expect(snap.effectivePermissions.marketing).toBe(false);
			expect(snap.promptRequirement).toEqual({
				kind: 'choice',
				reason: 'missing',
			});
		}
	});

	test('numeric-looking legacy identifiers survive as strings', () => {
		const snap = kernelFor('legacy-numeric-string-identity').getSnapshot();
		expect(snap.subject).toEqual({
			externalId: '1',
			identityProvider: '0',
			subjectId: '0',
		});
	});
});

describe('opt-out evaluation', () => {
	test('an expired grant falls back to the model default without touching the receipt', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution({ model: 'opt-out' }),
			initialRecords: recordsFor('legacy-expired-grant'),
			now: POLICY_NOW,
		});
		const snap = kernel.getSnapshot();
		expect(snap.effectivePermissions.marketing).toBe(true);
		expect(snap.explicitChoice?.categories.marketing?.confirmedAt).toBe(
			POLICY_EXPIRED
		);
		expect(snap.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
	});

	test('strict scope denies out-of-scope categories, permissive allows them', () => {
		const strict = createConsentKernel({
			initialPolicyResolution: fixtureResolution({
				model: 'opt-out',
				prompt: 'none',
			}),
			now: POLICY_NOW,
		}).getSnapshot();
		expect(strict.effectivePermissions.functionality).toBe(false);
		expect(strict.restrictions.functionality).toEqual(['strict-scope']);

		const permissive = createConsentKernel({
			initialPolicyResolution: fixtureResolution({
				model: 'opt-out',
				prompt: 'none',
				scopeMode: 'permissive',
			}),
			now: POLICY_NOW,
		}).getSnapshot();
		expect(permissive.effectivePermissions.functionality).toBe(true);
	});
});

describe('explicit saves', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(POLICY_NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('accept confirms exactly the active scope and records one choice event', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			now: POLICY_NOW,
		});
		const events: string[] = [];
		kernel.events.on('choice:recorded', () => events.push('choice'));
		kernel.events.on('permissions:changed', () => events.push('permissions'));

		const result = await kernel.commands.save('all');
		expect(result.confirmed).toEqual(['marketing', 'measurement']);
		const snap = kernel.getSnapshot();
		expect(Object.keys(snap.explicitChoice?.categories ?? {})).toEqual([
			'marketing',
			'measurement',
		]);
		expect(snap.explicitChoice?.categories.marketing?.basis).toEqual({
			fingerprint: CHOICE_FINGERPRINT,
			kind: 'choice-v1',
		});
		expect(snap.effectivePermissions.functionality).toBe(false);
		expect(events).toEqual(['permissions', 'choice']);
	});

	test('a positive value outside the active scope rejects atomically', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			now: POLICY_NOW,
		});
		const before = kernel.getSnapshot();
		const choice = vi.fn();
		kernel.events.on('choice:recorded', choice);
		const result = await kernel.commands.save({
			functionality: true,
			marketing: true,
		});
		expect(result.ok).toBe(false);
		expect(result.issues?.[0]).toEqual({
			code: 'out-of-scope',
			path: 'functionality',
		});
		expect(kernel.getSnapshot()).toBe(before);
		expect(choice).not.toHaveBeenCalled();
	});

	test('necessary true is inert and necessary false rejects', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			now: POLICY_NOW,
		});
		expect(
			(await kernel.commands.save({ marketing: true, necessary: true })).ok
		).toBe(true);
		expect((await kernel.commands.save({ necessary: false })).ok).toBe(false);
	});

	test('a denial outside the scope is accepted and stays effective', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution({ scopeMode: 'permissive' }),
			now: POLICY_NOW,
		});
		expect(kernel.getSnapshot().effectivePermissions.functionality).toBe(true);
		await kernel.commands.save({ functionality: false });
		expect(kernel.getSnapshot().effectivePermissions.functionality).toBe(false);
		expect(kernel.getSnapshot().restrictions.functionality).toEqual([
			'explicit-denial',
		]);
	});

	test('the same value saved again renews only the supplied receipt', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			initialRecords: recordsFor('v3-grant'),
			now: POLICY_NOW,
		});
		vi.setSystemTime(POLICY_NOW + 1000);
		await kernel.commands.save({ marketing: true });
		const categories = kernel.getSnapshot().explicitChoice?.categories ?? {};
		expect(categories.marketing?.confirmedAt).toBe(POLICY_NOW + 1000);
		expect(categories.measurement?.confirmedAt).toBe(POLICY_RECENT);
	});

	test('a save after a material change stamps the new basis only on confirmed keys', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			initialRecords: recordsFor('legacy-identified-grant'),
			now: POLICY_NOW,
		});
		await kernel.commands.save({ measurement: false });
		const categories = kernel.getSnapshot().explicitChoice?.categories ?? {};
		expect(categories.measurement?.basis).toEqual({
			fingerprint: CHOICE_FINGERPRINT,
			kind: 'choice-v1',
		});
		expect(categories.marketing?.basis).toEqual({
			kind: 'legacy-v2',
			materialFingerprint: LEGACY_FINGERPRINT,
		});
		expect(categories.marketing?.confirmedAt).toBe(POLICY_RECENT);
	});

	test('a failed remote save keeps the receipt and replays the identical payload', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const save = vi
			.fn()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			now: POLICY_NOW,
			transport: { save },
		});
		const pending = kernel.commands.save({ marketing: true });
		await vi.advanceTimersByTimeAsync(1);
		expect((await pending).ok).toBe(false);
		const first = save.mock.calls[0]?.[0];
		expect(first.confirmed).toEqual({
			actionAt: POLICY_NOW,
			categories: { marketing: true },
		});

		vi.setSystemTime(POLICY_NOW + 5000);
		await kernel.commands.init();
		await vi.advanceTimersByTimeAsync(1);
		expect(save).toHaveBeenCalledTimes(2);
		expect(save.mock.calls[1]?.[0]).toEqual(first);
		expect(save.mock.calls[1]?.[0].givenAt).toBe(POLICY_NOW);
	});
});

describe('notice prompts', () => {
	test('dismissal is local, independent from saves, and expires on its own', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution({
				model: 'opt-out',
				prompt: 'notice',
			}),
			now: POLICY_NOW,
		});
		expect(kernel.getSnapshot().promptRequirement).toEqual({
			kind: 'notice',
			reason: 'missing',
		});

		await kernel.commands.save({ marketing: false });
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('notice');
		expect(kernel.getSnapshot().activeUI).toBe('banner');

		const permissions = vi.fn();
		kernel.events.on('permissions:changed', permissions);
		const result = await kernel.commands.dismissNotice();
		expect(result.ok).toBe(true);
		expect(kernel.getSnapshot().promptRequirement).toEqual({ kind: 'none' });
		expect(kernel.getSnapshot().activeUI).toBe('none');
		expect(kernel.getSnapshot().noticeDismissal?.fingerprint).toBe(
			NOTICE_FINGERPRINT
		);
		expect(permissions).not.toHaveBeenCalled();
		expect(await kernel.commands.dismissNotice()).toEqual({
			ok: false,
			reason: 'not-required',
		});

		kernel.refresh(POLICY_NOW + POLICY_MAX_AGE);
		expect(kernel.getSnapshot().promptRequirement).toEqual({
			kind: 'notice',
			reason: 'expired',
		});
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
	});

	test('a dismissal against another notice fingerprint is policy-changed', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(noticeRule()),
			initialRecords: {
				noticeDismissal: {
					dismissedAt: POLICY_RECENT,
					fingerprint: NOTICE_FINGERPRINT,
					version: 1,
				},
				now: POLICY_NOW,
			},
			now: POLICY_NOW,
		});
		expect(kernel.getSnapshot().promptRequirement).toEqual({
			kind: 'notice',
			reason: 'policy-changed',
		});
	});
});

describe('privacy signals', () => {
	test('a detected signal masks a stored grant and records a standing directive after lifecycle start', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution({
				model: 'opt-out',
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
				prompt: 'none',
			}),
			initialPrivacySignals: { gpc: true },
			initialRecords: recordsFor('legacy-identified-grant'),
			now: POLICY_NOW,
		});
		const privacy = vi.fn();
		const choice = vi.fn();
		kernel.events.on('privacy:opt-out', privacy);
		kernel.events.on('choice:recorded', choice);

		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().restrictions.marketing).toEqual(['gpc']);
		expect(kernel.getSnapshot().optOutDirectives).toEqual([]);
		expect(
			kernel.getSnapshot().explicitChoice?.categories.marketing?.value
		).toBe(true);

		await kernel.commands.init();
		expect(privacy).toHaveBeenCalledTimes(1);
		expect(kernel.getSnapshot().optOutDirectives).toEqual([
			{
				categories: ['marketing'],
				recordedAt: expect.any(Number),
				source: 'gpc',
			},
		]);
		expect(choice).not.toHaveBeenCalled();

		kernel.set.privacySignals({ gpc: false });
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().restrictions.marketing).toEqual([
			'opt-out-directive',
		]);

		await kernel.commands.save({ marketing: true });
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().promptRequirement).toEqual({ kind: 'none' });
	});

	test('a signal under a policy without a mapping changes nothing', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution({
				model: 'opt-out',
				prompt: 'none',
			}),
			initialPrivacySignals: { gpc: true },
			now: POLICY_NOW,
		});
		await kernel.commands.init();
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(kernel.getSnapshot().optOutDirectives).toEqual([]);
	});

	test('an identified subject forwards the directive through the transport', async () => {
		const recordPrivacyOptOut = vi.fn().mockResolvedValue(undefined);
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution({
				model: 'opt-out',
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
				prompt: 'none',
			}),
			initialRecords: { subject: { subjectId: 'sub_1' } },
			initialUser: { externalId: 'user-1' },
			now: POLICY_NOW,
			transport: { recordPrivacyOptOut },
		});
		await kernel.commands.init();
		kernel.set.privacySignals({ gpc: true });
		expect(recordPrivacyOptOut).toHaveBeenCalledWith(
			{
				categories: ['marketing'],
				recordedAt: expect.any(Number),
				source: 'gpc',
			},
			'sub_1'
		);
	});
});

describe('policy resolution outcomes', () => {
	test('an explicit null clears every policy-derived field before the fallback applies', async () => {
		const first = fixtureResolution({ model: 'opt-out', prompt: 'none' });
		const kernel = createConsentKernel({
			initialIab: { enabled: true },
			initialPolicyResolution: first,
			initialPolicySnapshotToken: 'tok',
			now: POLICY_NOW,
			transport: {
				init: () =>
					Promise.resolve({
						policyResolution: { policy: null, status: 'no-match', version: 1 },
					}),
			},
		});
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		await kernel.commands.init();
		const snap = kernel.getSnapshot();
		expect(snap.resolution).toEqual({ policy: null, status: 'no-match' });
		expect(snap.policyRule.id).toBe('c15t_safe_fallback');
		expect(snap.policySnapshotToken).toBeNull();
		expect(snap).not.toHaveProperty('policyDecision');
		expect(snap.iab?.enabled).toBe(false);
		expect(snap.model).toBe('opt-in');
		expect(snap.effectivePermissions.marketing).toBe(false);
		expect(snap.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
		expect(snap.activeUI).toBe('banner');
	});

	test.each([
		['unknown contract version', { ...fixtureResolution(), version: 99 }],
		['incomplete matched payload', { status: 'matched', version: 1 }],
		['null payload', null],
	])('%s fails safely and stays observable', async (_label, wire) => {
		const kernel = createConsentKernel({
			initRetry: false,
			now: POLICY_NOW,
			transport: { init: () => Promise.resolve({ policyResolution: wire }) },
		});
		await kernel.commands.init();
		expect(kernel.getSnapshot().resolution.status).toBe('failed');
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});

	test('a stale init response cannot apply after a newer init started', async () => {
		const second = fixtureResolution({ id: 'second' });
		const firstAttempt = Promise.withResolvers<InitResponse>();
		let calls = 0;
		const kernel = createConsentKernel({
			now: POLICY_NOW,
			transport: {
				init: () => {
					calls += 1;
					if (calls === 1) {
						return firstAttempt.promise;
					}
					return Promise.resolve({
						policyResolution: { ...second, version: 1 },
					});
				},
			},
		});
		const first = kernel.commands.init();
		await kernel.commands.init();
		expect(kernel.getSnapshot().policyRule.id).toBe('second');
		firstAttempt.resolve({
			policyResolution: { ...fixtureResolution({ id: 'stale' }), version: 1 },
		});
		expect((await first).ok).toBe(false);
		expect(kernel.getSnapshot().policyRule.id).toBe('second');
	});

	test('no-transport init preserves the precomputed policy resolution', async () => {
		const resolution = fixtureResolution({ model: 'opt-out' });
		const kernel = createConsentKernel({
			initialPolicyPending: true,
			initialPolicyResolution: resolution,
			now: POLICY_NOW,
		});
		expect(kernel.getSnapshot().activeUI).toBe('none');
		await kernel.commands.init();
		expect(kernel.getSnapshot().resolution).toEqual(resolution);
		expect(kernel.getSnapshot().policyPending).toBe(false);
		expect(kernel.getSnapshot().model).toBe('opt-out');
		kernel.dispose();
	});
});

describe('lifecycle: timers, refresh, dispose, rearm', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(POLICY_NOW);
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	test('construction and hydration schedule nothing; init installs the deadline timer', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			initialRecords: recordsFor('v3-grant'),
			now: POLICY_NOW,
		});
		expect(vi.getTimerCount()).toBe(0);
		expect(kernel.getSnapshot().nextDeadline).toBe(
			POLICY_RECENT + POLICY_MAX_AGE
		);
		void kernel.commands.init();
		expect(vi.getTimerCount()).toBe(1);
		const permissions = vi.fn();
		kernel.events.on('permissions:changed', permissions);
		vi.advanceTimersByTime(POLICY_MAX_AGE);
		expect(permissions).toHaveBeenCalledTimes(1);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
		expect(vi.getTimerCount()).toBe(0);
	});

	test('refresh denies an elapsed grant before a delayed timer fires', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			initialRecords: recordsFor('v3-grant'),
			now: POLICY_NOW,
		});
		await kernel.commands.init();
		vi.setSystemTime(POLICY_RECENT + POLICY_MAX_AGE);
		const before = kernel.getSnapshot();
		const snap = kernel.refresh();
		expect(snap).not.toBe(before);
		expect(snap.effectivePermissions.marketing).toBe(false);
		expect(kernel.refresh()).toBe(snap);
	});

	test('dispose stops the timer and init re-arms it', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			initialRecords: recordsFor('v3-grant'),
			now: POLICY_NOW,
		});
		await kernel.commands.init();
		expect(vi.getTimerCount()).toBe(1);
		kernel.dispose();
		expect(vi.getTimerCount()).toBe(0);
		await kernel.commands.init();
		expect(vi.getTimerCount()).toBe(1);
		kernel.dispose();
	});

	test('a distant deadline is clamped and re-armed instead of overflowing', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				optInRule({ validity: { choiceDays: 40 } })
			),
			now: POLICY_NOW,
		});
		await kernel.commands.init();
		await kernel.commands.save('all');
		expect(vi.getTimerCount()).toBe(1);
		await vi.advanceTimersByTimeAsync(2_147_483_647);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(vi.getTimerCount()).toBe(1);
		await vi.advanceTimersByTimeAsync(40 * DAY - 2_147_483_647);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});

	test('a full rejection under opt-out schedules no timer', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(optOutRule()),
			now: POLICY_NOW,
		});
		await kernel.commands.init();
		await kernel.commands.save('none');
		expect(kernel.getSnapshot().nextDeadline).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe('server snapshot and reference stability', () => {
	test('getServerSnapshot stays at revision 0 and derived fields keep references', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			initialRecords: recordsFor('v3-grant'),
			now: POLICY_NOW,
		});
		const server = kernel.getServerSnapshot();
		const beforeRefresh = kernel.getSnapshot();
		kernel.refresh(POLICY_NOW + 1);
		expect(kernel.getSnapshot()).toBe(beforeRefresh);
		await kernel.commands.save({ marketing: true });
		const after = kernel.getSnapshot();
		expect(after.effectivePermissions).toBe(beforeRefresh.effectivePermissions);
		expect(after.promptRequirement).toBe(beforeRefresh.promptRequirement);
		expect(after.explicitChoice).not.toBe(beforeRefresh.explicitChoice);
		expect(kernel.getServerSnapshot()).toBe(server);
		expect(server.revision).toBe(0);
	});

	test('the same records and clock produce the same initial snapshot on server and client', () => {
		const records = choiceRecords(
			{ marketing: true, measurement: false },
			{ fingerprint: CHOICE_FINGERPRINT, now: POLICY_NOW }
		);
		const server = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			initialRecords: records,
			now: POLICY_NOW,
		}).getServerSnapshot();
		const client = createConsentKernel({
			initialPolicyResolution: fixtureResolution(),
			initialRecords: records,
			now: POLICY_NOW,
		}).getSnapshot();
		expect(client.effectivePermissions).toEqual(server.effectivePermissions);
		expect(client.promptRequirement).toEqual(server.promptRequirement);
		expect(client.activeUI).toBe(server.activeUI);
		expect(client.evaluatedAt).toBe(server.evaluatedAt);
	});
});
