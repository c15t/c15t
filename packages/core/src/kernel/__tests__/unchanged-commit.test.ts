import { enTranslations } from '@c15t/translations';
import { afterEach, expect, test, vi } from 'vitest';

import { createConsentKernel } from '..';
import {
	choiceRecords,
	explicitChoice,
	matchedResolution,
	noticeRule,
	NOW,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { evaluateConsentRecord } from '../../consent-record/evaluate';
import type { ConsentSnapshot } from '../../types';
import { buildNextSnapshot, snapshotChanged } from '../patch';
import type { SnapshotPatch } from '../patch';
import { createRuntime } from '../runtime';
import { buildInitialSnapshot, DEFAULT_IAB, freezeSnapshot } from '../snapshot';

afterEach(() => vi.restoreAllMocks());

const checkCommit = (initial: ConsentSnapshot, patch: SnapshotPatch) => {
	const emit = vi.fn();
	const listener = vi.fn();
	const runtime = createRuntime({
		emit,
		initialDraft: null,
		initialSnapshot: initial,
		transport: undefined,
	});
	runtime.subscribe(listener);
	const candidate = buildNextSnapshot(initial, patch);
	const changed = snapshotChanged(initial, candidate);
	const expected = changed ? freezeSnapshot(candidate) : initial;
	expect(runtime.commit(patch)).toBe(changed);
	const actual = runtime.getSnapshot();
	expect(actual).toEqual(expected);
	if (!changed) {
		expect(actual).toBe(initial);
	}
	expect(listener).toHaveBeenCalledTimes(changed ? 1 : 0);
	expect(emit).toHaveBeenCalledTimes(
		expected.effectivePermissions === initial.effectivePermissions ? 0 : 1
	);
	const evaluation = evaluateConsentRecord({
		choice: actual.explicitChoice,
		gpc: actual.privacySignals.gpc.active,
		noticeDismissal: actual.noticeDismissal,
		now: patch.now ?? initial.evaluatedAt,
		optOuts: actual.optOutDirectives,
		policy: actual.evaluationPolicy,
	});
	expect(actual.effectivePermissions).toEqual(evaluation.permissions);
	expect(actual.promptRequirement).toEqual(evaluation.promptRequirement);
	expect(actual.restrictions).toEqual(evaluation.restrictions);
	expect(actual.nextDeadline).toBe(evaluation.nextDeadline);
	return actual;
};

test('every patch input agrees with full snapshot derivation', () => {
	const initial = buildInitialSnapshot({ now: NOW });
	const patches: Record<keyof SnapshotPatch, SnapshotPatch> = {
		activeUI: { activeUI: 'dialog' },
		branding: { branding: 'consent' },
		explicitChoice: { explicitChoice: explicitChoice({ marketing: true }) },
		iab: { iab: { ...DEFAULT_IAB, enabled: true } },
		location: { location: { countryCode: 'DE', regionCode: null } },
		noticeDismissal: {
			noticeDismissal: {
				dismissedAt: NOW,
				fingerprint: initial.evaluationPolicy.notice.fingerprint,
				version: 1,
			},
		},
		now: { now: NOW + 1000 },
		optOutDirectives: {
			optOutDirectives: [
				{ categories: ['marketing'], recordedAt: NOW, source: 'gpc' },
			],
		},
		overrides: { overrides: { gpc: true } },
		policyPending: { policyPending: true },
		policySnapshotToken: { policySnapshotToken: 'token' },
		privacyDetected: { privacyDetected: true },
		resolution: { resolution: matchedResolution(optOutRule()) },
		subject: { subject: { subjectId: 'sub_test' } },
		translations: {
			translations: { language: 'en', translations: enTranslations },
		},
		user: { user: { externalId: 'visitor' } },
	};
	for (const patch of Object.values(patches)) {
		const next = checkCommit(initial, patch);
		checkCommit(next, patch);
	}
});

test('no-op init retains the initial time and snapshot but emits lifecycle events', async () => {
	vi.spyOn(Date, 'now').mockReturnValue(NOW + 1000);
	const kernel = createConsentKernel({ now: NOW });
	const initial = kernel.getSnapshot();
	const listener = vi.fn();
	const completed = vi.fn();
	kernel.subscribe(listener);
	kernel.events.on('command:init:completed', completed);
	try {
		await expect(kernel.commands.init()).resolves.toEqual({ ok: true });
		expect(kernel.getSnapshot()).toBe(initial);
		expect(kernel.getServerSnapshot()).toBe(initial);
		expect(initial.evaluatedAt).toBe(NOW);
		expect(listener).not.toHaveBeenCalled();
		expect(completed).toHaveBeenCalledOnce();
	} finally {
		kernel.dispose();
	}
});

test('choice expiry and backwards clocks always match the full evaluator', () => {
	const initial = buildInitialSnapshot({
		initialRecords: choiceRecords({
			experience: true,
			functionality: true,
			marketing: true,
			measurement: true,
		}),
		now: NOW,
	});
	const deadline = initial.nextDeadline;
	if (deadline === null) {
		throw new Error('Expected a choice expiry');
	}
	const before = checkCommit(initial, { now: deadline - 1 });
	expect(before).toBe(initial);
	const expired = checkCommit(before, { now: deadline });
	expect(expired.effectivePermissions.marketing).toBe(false);
	const rewound = checkCommit(expired, { now: deadline - 1 });
	expect(rewound.effectivePermissions.marketing).toBe(true);
});

test('notice expiry and clearing records keep their full derivation', () => {
	const resolution = matchedResolution(noticeRule());
	const initial = buildInitialSnapshot({
		initialPolicyResolution: resolution,
		initialRecords: {
			noticeDismissal: {
				dismissedAt: NOW,
				fingerprint: resolution.fingerprints.notice,
				version: 1,
			},
			subject: { subjectId: 'sub_test' },
		},
		now: NOW,
	});
	const deadline = initial.nextDeadline;
	if (deadline === null) {
		throw new Error('Expected a notice expiry');
	}
	checkCommit(initial, { noticeDismissal: undefined, subject: undefined });
	checkCommit(initial, { noticeDismissal: null, subject: null });
	const expired = checkCommit(initial, { now: deadline });
	expect(expired.promptRequirement.kind).toBe('notice');
	expect(checkCommit(expired, { now: NOW }).promptRequirement.kind).toBe(
		'none'
	);
});

test('reusing a mutable patch still observes changed privacy and record inputs', () => {
	const initial = buildInitialSnapshot({ now: NOW });
	const runtime = createRuntime({
		emit: vi.fn(),
		initialDraft: null,
		initialSnapshot: initial,
		transport: undefined,
	});
	const patch: SnapshotPatch = { privacyDetected: false };
	expect(runtime.commit(patch)).toBe(false);
	patch.privacyDetected = true;
	expect(runtime.commit(patch)).toBe(true);
	expect(runtime.getSnapshot().privacySignals.gpc.detected).toBe(true);
	patch.explicitChoice = explicitChoice({ marketing: true });
	const expected = checkCommit(runtime.getSnapshot(), patch);
	runtime.commit(patch);
	expect(runtime.getSnapshot()).toEqual(expected);
});

test('an unchanged patch still normalizes incompatible initial IAB authority', () => {
	const initial = buildInitialSnapshot({
		initialIab: {
			authority: {
				choiceFingerprint: 'choice-v1:stale',
				confirmedAt: NOW,
				expiresAt: NOW + 1000,
				purposeConsents: {},
				purposeLegitimateInterests: {},
				specialFeatureOptIns: {},
				tcString: 'stored-tc-string',
				vendorConsents: {},
				vendorLegitimateInterests: {},
			},
			enabled: true,
		},
		now: NOW,
	});
	expect(initial.iab?.authority).not.toBeNull();
	const next = checkCommit(initial, { now: NOW + 1, policyPending: false });
	expect(next.iab?.authority).toBeNull();
});
