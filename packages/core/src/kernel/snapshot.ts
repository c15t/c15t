/**
 * Snapshot construction and freezing.
 *
 * Pure: no DOM, no window, no network, no hashing, no timers. The initial
 * snapshot evaluates the supplied records against the supplied (or
 * precomputed) policy resolution at `config.now`, so a server render and a
 * client construction with the same inputs produce the same revision-0
 * snapshot.
 */

import type { PolicyResolution } from '@c15t/schema/types';

import { evaluateConsentRecord } from '../consent-record/evaluate';
import { OPTIONAL_CONSENT_CATEGORIES } from '../consent-record/types';
import type {
	ConsentSubject,
	ExplicitChoice,
	OptionalConsentCategory,
} from '../consent-record/types';
import { allConsentNames } from '../consent/consent-types';
import {
	buildEvaluationPolicy,
	deriveActiveUI,
	deriveModel,
	derivePolicyCategories,
	legacyPolicyForRule,
	resolveEffectivePolicy,
} from '../policy';
import type { PresentedSelection } from '../policy';
import type {
	ConsentSnapshot,
	ConsentState,
	KernelConfig,
	KernelIABState,
} from '../types';
import { validateHydrationRecords } from './records';

/**
 * Default effective permissions before any evaluation. `necessary` is
 * always granted; everything else starts denied.
 */
export const DEFAULT_CONSENTS: ConsentState = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

/**
 * Default IAB slice. Used as the base when constructing the initial IAB
 * state and when folding partial IAB patches onto a previously-null slice.
 */
export const DEFAULT_IAB: KernelIABState = {
	cmpId: null,
	customVendors: [],
	enabled: false,
	gvl: null,
	purposeConsents: {},
	purposeLegitimateInterests: {},
	specialFeatureOptIns: {},
	tcString: null,
	vendorConsents: {},
	vendorLegitimateInterests: {},
};

const UNCONFIGURED: PolicyResolution = { policy: null, status: 'unconfigured' };

/**
 * Staged draft values from a `Partial<ConsentState>`. Only own boolean
 * values for optional categories are kept; `necessary` and unknown keys
 * are dropped. Returns `null` when nothing usable was supplied.
 */
export const buildDraft = function buildDraft(
	input: Partial<ConsentState> | undefined
): PresentedSelection | null {
	if (!input || typeof input !== 'object') {
		return null;
	}
	const draft: PresentedSelection = {};
	let any = false;
	for (const category of OPTIONAL_CONSENT_CATEGORIES) {
		if (
			Object.hasOwn(input, category) &&
			typeof input[category] === 'boolean'
		) {
			draft[category] = input[category];
			any = true;
		}
	}
	return any ? draft : null;
};

/**
 * BRIDGE: merge user-supplied booleans over the default state. Only used
 * to seed drafts; permissions are never built from it.
 */
export const buildInitialConsents = function buildInitialConsents(
	initial: Partial<ConsentState> | undefined
): ConsentState {
	const merged: ConsentState = { ...DEFAULT_CONSENTS };
	if (!initial) {
		return merged;
	}
	for (const name of allConsentNames) {
		if (Object.hasOwn(initial, name) && typeof initial[name] === 'boolean') {
			merged[name] = initial[name] as boolean;
		}
	}
	merged.necessary = true;
	return merged;
};

/**
 * Merge a user-supplied initial IAB slice over the IAB defaults. Returns
 * `null` when no IAB seed was provided.
 */
export const buildInitialIab = function buildInitialIab(
	initial: Partial<KernelIABState> | undefined
): KernelIABState | null {
	if (!initial) {
		return null;
	}
	return {
		...DEFAULT_IAB,
		...initial,
	};
};

/** Freeze plain data recursively. Already-frozen values are left alone. */
const deepFreeze = function deepFreeze(value: unknown): void {
	if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
		return;
	}
	Object.freeze(value);
	for (const nested of Object.values(value as Record<string, unknown>)) {
		deepFreeze(nested);
	}
};

const freezeChoice = function freezeChoice(
	choice: ExplicitChoice | null
): void {
	if (!choice || Object.isFrozen(choice)) {
		return;
	}
	for (const category of Object.keys(
		choice.categories
	) as OptionalConsentCategory[]) {
		const decision = choice.categories[category];
		if (decision) {
			Object.freeze(decision.basis);
			Object.freeze(decision);
		}
	}
	Object.freeze(choice.categories);
	Object.freeze(choice);
};

/**
 * Deep-freeze a snapshot in place and return it typed as `ConsentSnapshot`.
 * Nested objects are frozen so subscribers can trust `===` at any depth.
 */
export const freezeSnapshot = function freezeSnapshot(
	snapshot: ConsentSnapshot
): ConsentSnapshot {
	Object.freeze(snapshot.effectivePermissions);
	Object.freeze(snapshot.overrides);
	Object.freeze(snapshot.promptRequirement);
	for (const reasons of Object.values(snapshot.restrictions)) {
		Object.freeze(reasons);
	}
	Object.freeze(snapshot.restrictions);
	for (const directive of snapshot.optOutDirectives) {
		Object.freeze(directive.categories);
		Object.freeze(directive);
	}
	Object.freeze(snapshot.optOutDirectives);
	Object.freeze(snapshot.privacySignals.gpc);
	Object.freeze(snapshot.privacySignals);
	deepFreeze(snapshot.resolution);
	deepFreeze(snapshot.policyRule);
	deepFreeze(snapshot.evaluationPolicy);
	Object.freeze(snapshot.policyCategories);
	freezeChoice(snapshot.explicitChoice as ExplicitChoice | null);
	for (const nested of [
		snapshot.noticeDismissal,
		snapshot.subject,
		snapshot.user,
		snapshot.translations,
		snapshot.policy,
		snapshot.policyDecision,
		snapshot.policyBanner,
		snapshot.policyDialog,
		snapshot.iab,
		snapshot.location,
	]) {
		if (nested) {
			Object.freeze(nested);
		}
	}
	return Object.freeze(snapshot) as ConsentSnapshot;
};

/**
 * Legacy policy input the kernel could not resolve at construction. It is
 * lifted during `commands.init()`, never during construction.
 */
export interface StagedLegacyPolicy {
	policy: NonNullable<KernelConfig['initialPolicy']>;
	policyDecision: KernelConfig['initialPolicyDecision'];
}

/**
 * Whether the config carries a legacy policy without a precomputed
 * resolution. Such a policy is staged for lifecycle init and keeps the
 * first layer hidden until then.
 */
export const stageLegacyPolicy = function stageLegacyPolicy(
	config: KernelConfig
): StagedLegacyPolicy | null {
	if (!config.initialPolicy || config.initialPolicyResolution) {
		return null;
	}
	return {
		policy: config.initialPolicy,
		policyDecision: config.initialPolicyDecision,
	};
};

const initialSubject = function initialSubject(
	config: KernelConfig,
	fromRecords: ConsentSubject | null | undefined
): ConsentSubject | null {
	if (fromRecords !== undefined) {
		return fromRecords;
	}
	return config.initialSubjectId
		? { subjectId: config.initialSubjectId }
		: null;
};

/**
 * Build the initial frozen snapshot from a kernel config.
 *
 * Pure. Evaluates once at `config.now` (default `Date.now()`), using the
 * precomputed resolution when supplied and the safe fallback otherwise.
 * A legacy `initialPolicy` without a resolution is staged: the snapshot is
 * provisional (first layer hidden) and permissions follow the fallback
 * until `commands.init()` lifts it.
 */
// oxlint-disable-next-line complexity -- Construction reads every config field once in a fixed order.
export const buildInitialSnapshot = function buildInitialSnapshot(
	config: KernelConfig
): ConsentSnapshot {
	// One clock for validation and evaluation: an explicit config clock, else
	// the clock the record seed was read with, else the wall clock.
	const now = config.now ?? config.initialRecords?.now ?? Date.now();
	const resolution = config.initialPolicyResolution ?? UNCONFIGURED;
	const effective = resolveEffectivePolicy(resolution);
	const evaluationPolicy = buildEvaluationPolicy(effective);
	const staged = stageLegacyPolicy(config);
	const policyProvisional =
		(config.initialPolicyProvisional ?? false) || staged !== null;

	const validated = config.initialRecords
		? validateHydrationRecords(config.initialRecords, now)
		: null;
	const records = validated?.ok === true ? validated.records : null;
	const explicitChoice = records?.choice ?? null;
	const noticeDismissal = records?.noticeDismissal ?? null;
	const optOutDirectives = records?.optOutDirectives ?? [];
	const subject = initialSubject(config, records?.subject);

	const iab = buildInitialIab(config.initialIab);
	const override = config.initialOverrides?.gpc;
	const detected = config.initialPrivacySignals?.gpc === true;
	const privacySignals = {
		gpc: { active: override ?? detected, detected, override },
	};

	const evaluation = evaluateConsentRecord({
		choice: explicitChoice,
		gpc: privacySignals.gpc.active,
		noticeDismissal,
		now,
		optOuts: optOutDirectives,
		policy: evaluationPolicy,
	});

	const policy = config.initialPolicy
		? { ...config.initialPolicy }
		: legacyPolicyForRule(effective.rule);

	return freezeSnapshot({
		activeUI: deriveActiveUI({
			policy,
			policyProvisional,
			promptRequirement: evaluation.promptRequirement,
			resolution,
		}),
		branding: config.initialBranding ?? null,
		consents: evaluation.permissions,
		effectivePermissions: evaluation.permissions,
		evaluatedAt: now,
		evaluationPolicy,
		explicitChoice,
		hasConsented:
			explicitChoice !== null &&
			Object.keys(explicitChoice.categories).length > 0,
		iab,
		location: config.initialLocation ? { ...config.initialLocation } : null,
		model: deriveModel(effective.rule, iab?.enabled ?? false),
		nextDeadline: evaluation.nextDeadline,
		noticeDismissal,
		optOutDirectives,
		overrides: { ...(config.initialOverrides ?? {}) },
		policy,
		policyBanner: policy.ui?.banner ? { ...policy.ui.banner } : null,
		policyCategories: derivePolicyCategories(effective.rule),
		policyDecision: config.initialPolicyDecision
			? { ...config.initialPolicyDecision }
			: null,
		policyDialog: policy.ui?.dialog ? { ...policy.ui.dialog } : null,
		policyProvisional,
		policyRule: effective.rule,
		policyScopeMode: effective.rule.scopeMode,
		policySnapshotToken: config.initialPolicySnapshotToken ?? null,
		privacySignals,
		promptRequirement: evaluation.promptRequirement,
		resolution,
		restrictions: evaluation.restrictions,
		revision: 0,
		subject,
		subjectId: subject?.subjectId ?? null,
		translations: config.initialTranslations
			? { ...config.initialTranslations }
			: null,
		user: config.initialUser ? { ...config.initialUser } : null,
	});
};
