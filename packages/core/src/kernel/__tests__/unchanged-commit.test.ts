/**
 * Every way an input reaches the snapshot agrees with the full evaluator,
 * and an input that changes nothing keeps the snapshot reference and
 * notifies nobody. The kernel skips derivation for unchanged inputs; these
 * tests pin that the shortcut is never observable.
 */
import { enTranslations } from '@c15t/translations';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { createKernel as createConsentKernel } from '..';
import {
	choiceRecords,
	explicitChoice,
	matchedResolution,
	noneRule,
	noticeRule,
	NOW,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { evaluateConsentRecord } from '../../consent-record/evaluate';
import type { ConsentSnapshot, InitResponse, KernelConfig } from '../../types';
import type { InternalKernel } from '../internals';
import type { SnapshotPatch } from '../patch';

beforeEach(() => {
	vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => vi.restoreAllMocks());

/** Derived fields match a full evaluation of the snapshot's own inputs. */
const expectFullDerivation = function expectFullDerivation(
	snapshot: ConsentSnapshot
): void {
	if (snapshot.externalPermissions) {
		expect(snapshot.effectivePermissions).toEqual(snapshot.externalPermissions);
		expect(snapshot.promptRequirement).toEqual({ kind: 'none' });
		expect(snapshot.nextDeadline).toBeNull();
		return;
	}
	const evaluation = evaluateConsentRecord({
		choice: snapshot.explicitChoice,
		gpc: snapshot.privacySignals.gpc.active,
		noticeDismissal: snapshot.noticeDismissal,
		now: snapshot.evaluatedAt,
		policy: snapshot.evaluationPolicy,
	});
	expect(snapshot.effectivePermissions).toEqual(evaluation.permissions);
	expect(snapshot.promptRequirement).toEqual(evaluation.promptRequirement);
	expect(snapshot.restrictions).toEqual(evaluation.restrictions);
	expect(snapshot.nextDeadline).toBe(evaluation.nextDeadline);
};

/**
 * Run `operation` and check what subscribers saw: nothing when the
 * snapshot kept its reference, the resulting snapshot last otherwise.
 */
const observe = async function observe(
	kernel: InternalKernel,
	operation: (kernel: InternalKernel) => unknown
): Promise<{ before: ConsentSnapshot; after: ConsentSnapshot }> {
	const before = kernel.getSnapshot();
	const listener = vi.fn();
	const unsubscribe = kernel.subscribe(listener);
	await operation(kernel);
	unsubscribe();
	const after = kernel.getSnapshot();
	if (after === before) {
		expect(listener).not.toHaveBeenCalled();
	} else {
		expect(listener).toHaveBeenLastCalledWith(after);
		expect(Object.isFrozen(after)).toBe(true);
	}
	expectFullDerivation(after);
	return { after, before };
};

interface Operation {
	config?: KernelConfig;
	/** What the transport answers `init()` with. */
	response?: InitResponse;
	run: (kernel: InternalKernel) => unknown;
	/** Whether running it twice must leave the second run a no-op. */
	idempotent: boolean;
	/** The input leaves every derived field as it was. */
	unchanged?: true;
}

/** `init()` answered by `response`; the fold re-creates objects each time. */
const initWith = (response: InitResponse): Operation => ({
	idempotent: false,
	response,
	run: (kernel) => kernel.commands.init(),
});

const VENDORS = {
	declared: [
		{
			category: 'marketing' as const,
			id: 'meta-pixel',
			presentable: false,
			source: 'script' as const,
		},
	],
	listVersion: null,
};

/** One gate, so a repeated call is the same input. */
const SHOW_ARM = () => true;

const EXPERIMENT = {
	acknowledgedDiagnostics: false,
	arm: 'a',
	assignedBy: 'host' as const,
	id: 'exp',
};

test('every snapshot input agrees with the full evaluator', async () => {
	const resolution = matchedResolution(optOutRule());
	// One operation per patchable input, so a new input cannot go untested.
	const operations: Record<keyof SnapshotPatch, Operation> = {
		activeUI: { idempotent: true, run: (k) => k.set.activeUI('dialog') },
		branding: initWith({ branding: 'consent' }),
		consentCategories: {
			idempotent: true,
			run: (k) => k.set.consentCategories(['necessary', 'measurement']),
		},
		experiment: {
			idempotent: true,
			run: (k) => k.set.experiment(EXPERIMENT),
		},
		experimentPending: {
			config: {
				initialExperiment: EXPERIMENT,
				initialExperimentPending: true,
			},
			idempotent: true,
			run: (k) => k.set.experiment(EXPERIMENT, SHOW_ARM),
		},
		// Hydration validates into fresh records, so a repeat is a new input.
		explicitChoice: {
			idempotent: false,
			run: (k) => k.hydrate({ choice: explicitChoice({ marketing: true }) }),
		},
		externalPermissions: {
			config: { initialExternalPermissions: {} },
			idempotent: false,
			run: (k) => k.set.externalPermissions({ measurement: true }),
		},
		iab: { idempotent: true, run: (k) => k.set.iab({ enabled: true }) },
		location: initWith({ location: { countryCode: 'DE', regionCode: null } }),
		noticeDismissal: {
			config: { initialPolicyResolution: matchedResolution(noticeRule()) },
			idempotent: false,
			run: (k) =>
				k.hydrate({
					noticeDismissal: {
						dismissedAt: NOW,
						fingerprint: k.getSnapshot().evaluationPolicy.notice.fingerprint,
						version: 1,
					},
				}),
		},
		// Inside the current evaluation's interval: the snapshot is kept.
		now: {
			idempotent: true,
			run: (k) => k.refresh(NOW + 1000),
			unchanged: true,
		},
		overrides: {
			idempotent: false,
			run: (k) => k.set.overrides({ gpc: true }),
		},
		policyPending: {
			...initWith({}),
			config: { initialPolicyPending: true },
		},
		policySnapshotToken: initWith({
			policyResolution: { ...resolution, version: 1 },
			policySnapshotToken: 'token',
		}),
		privacyDetected: {
			idempotent: true,
			run: (k) => k.set.privacySignals({ gpc: true }),
		},
		resolution: initWith({ policyResolution: { ...resolution, version: 1 } }),
		subject: { idempotent: true, run: (k) => k.set.subjectId('sub_test') },
		translations: initWith({
			translations: { language: 'en', translations: enTranslations },
		}),
		user: {
			idempotent: false,
			run: (k) => k.commands.identify({ externalId: 'visitor' }),
		},
		vendorChoice: {
			idempotent: false,
			run: (k) =>
				k.hydrate({
					vendorChoice: {
						confirmedAt: NOW - 1,
						denied: ['meta-pixel'],
						version: 1,
					},
				}),
		},
		vendors: { idempotent: true, run: (k) => k.set.vendors(VENDORS) },
	};

	for (const [input, operation] of Object.entries(operations)) {
		const kernel = createConsentKernel({
			now: NOW,
			...operation.config,
			initRetry: false,
			transport: { init: () => Promise.resolve(operation.response ?? {}) },
		});
		try {
			// oxlint-disable-next-line no-await-in-loop -- one kernel at a time
			const first = await observe(kernel, operation.run);
			expect(first.after === first.before, input).toBe(
				operation.unchanged === true
			);
			// oxlint-disable-next-line no-await-in-loop -- one kernel at a time
			const second = await observe(kernel, operation.run);
			// A repeat of an idempotent input keeps the snapshot it produced.
			expect(operation.idempotent ? second.after : second.before, input).toBe(
				second.before
			);
		} finally {
			kernel.dispose();
		}
	}
});

test('no-op init retains the initial time and snapshot but emits lifecycle events', async () => {
	vi.spyOn(Date, 'now').mockReturnValue(NOW + 1000);
	// A rule without a prompt keeps every surface hidden, so init records no
	// impression and the snapshot can stay identical.
	const kernel = createConsentKernel({
		initialPolicyResolution: matchedResolution(noneRule()),
		now: NOW,
	});
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

test('choice expiry and backwards clocks always match the full evaluator', async () => {
	const kernel = createConsentKernel({
		initialRecords: choiceRecords({
			experience: true,
			functionality: true,
			marketing: true,
			measurement: true,
		}),
		now: NOW,
	});
	const initial = kernel.getSnapshot();
	const deadline = initial.nextDeadline;
	if (deadline === null) {
		throw new Error('Expected a choice expiry');
	}
	const before = await observe(kernel, (k) => k.refresh(deadline - 1));
	expect(before.after).toBe(initial);
	const expired = await observe(kernel, (k) => k.refresh(deadline));
	expect(expired.after.effectivePermissions.marketing).toBe(false);
	const rewound = await observe(kernel, (k) => k.refresh(deadline - 1));
	expect(rewound.after.effectivePermissions.marketing).toBe(true);
});

test('notice expiry and clearing records keep their full derivation', async () => {
	const resolution = matchedResolution(noticeRule());
	const config: KernelConfig = {
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
	};
	const omitted = createConsentKernel(config);
	const kept = await observe(omitted, (k) =>
		k.hydrate({ noticeDismissal: undefined, subject: undefined })
	);
	expect(kept.after).toBe(kept.before);
	omitted.dispose();

	const cleared = createConsentKernel(config);
	const reset = await observe(cleared, (k) =>
		k.hydrate({ noticeDismissal: null, subject: null })
	);
	expect(reset.after.promptRequirement.kind).toBe('notice');
	cleared.dispose();

	const kernel = createConsentKernel(config);
	const deadline = kernel.getSnapshot().nextDeadline;
	if (deadline === null) {
		throw new Error('Expected a notice expiry');
	}
	const expired = await observe(kernel, (k) => k.refresh(deadline));
	expect(expired.after.promptRequirement.kind).toBe('notice');
	const rewound = await observe(kernel, (k) => k.refresh(NOW));
	expect(rewound.after.promptRequirement.kind).toBe('none');
});

test('a repeated privacy signal is a no-op and a new one re-derives', async () => {
	const kernel = createConsentKernel({ now: NOW });
	const same = await observe(kernel, (k) =>
		k.set.privacySignals({ gpc: false })
	);
	expect(same.after).toBe(same.before);
	const changed = await observe(kernel, (k) =>
		k.set.privacySignals({ gpc: true })
	);
	expect(changed.after.privacySignals.gpc.detected).toBe(true);
	await observe(kernel, (k) =>
		k.hydrate({ choice: explicitChoice({ marketing: true }) })
	);
	kernel.dispose();
});

test('an unchanged refresh still normalizes incompatible initial IAB authority', async () => {
	const kernel = createConsentKernel({
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
	expect(kernel.getSnapshot().iab?.authority).not.toBeNull();
	const { after } = await observe(kernel, (k) => k.refresh(NOW + 1));
	expect(after.iab?.authority).toBeNull();
});

test('a live kernel stamps an unchanged snapshot like the full derivation', async () => {
	const kernel = createConsentKernel({ now: NOW });
	const initial = kernel.getSnapshot();
	expect(initial.activeUI).toBe('banner');
	const shown = vi.fn();
	kernel.events.on('surface:shown', shown);

	const { after } = await observe(kernel, (k) => k.markLive(NOW + 5));

	// Only the clock, the revision and the stamp move; `observe` checked the
	// derived fields against a full evaluation at the new time.
	expect(after).toEqual({
		...initial,
		evaluatedAt: NOW + 5,
		revision: initial.revision + 1,
		surfaceShownAt: { banner: NOW + 5, dialog: null },
	});
	expect(after.evaluatedAt).toBe(NOW + 5);
	expect(Object.isFrozen(after.surfaceShownAt)).toBe(true);
	expect(shown).toHaveBeenCalledExactlyOnceWith({
		shownAt: NOW + 5,
		snapshot: after,
		surface: 'banner',
		type: 'surface:shown',
	});

	// The impression is recorded; the same evaluation is a no-op afterwards.
	const repeat = await observe(kernel, (k) => k.refresh(NOW + 5));
	expect(repeat.after).toBe(after);
});
