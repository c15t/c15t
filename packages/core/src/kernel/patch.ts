/**
 * Snapshot patching.
 *
 * Callers describe which input fields change; `buildNextSnapshot` merges
 * the patch, re-runs the pure evaluator and re-derives every dependent
 * field. Derived fields keep their previous reference when their value did
 * not change, so subscribers can rely on `===`.
 *
 * Pure: takes the current snapshot + a patch, returns the next snapshot.
 * Does not notify subscribers.
 */
import type { LocationResponse, PolicyResolution } from '@c15t/schema/types';

import { evaluateConsentRecord } from '../consent-record/evaluate';
import { OPTIONAL_CONSENT_CATEGORIES } from '../consent-record/types';
import type {
	ConsentSubject,
	ExplicitChoice,
	NoticeDismissal,
	OptionalConsentCategory,
	PrivacyOptOut,
	PromptRequirement,
	RestrictionReason,
} from '../consent-record/types';
import {
	buildEvaluationPolicy,
	deriveActiveUI,
	deriveModel,
	resolveEffectivePolicy,
} from '../policy';
import type {
	ConsentSnapshot,
	ConsentState,
	KernelActiveUI,
	KernelBranding,
	KernelIABState,
	KernelOverrides,
	KernelPrivacySignals,
	KernelTranslations,
	KernelUser,
} from '../types';
import { freezeSnapshot } from './snapshot';

/**
 * Partial update applied to a snapshot. Only input fields are patchable;
 * permissions, prompt, restrictions, deadline and model are always derived.
 *
 * Nullable fields: `undefined` (omitted) preserves, `null` clears.
 */
export interface SnapshotPatch {
	explicitChoice?: ExplicitChoice | null;
	noticeDismissal?: NoticeDismissal | null;
	optOutDirectives?: readonly PrivacyOptOut[];
	resolution?: PolicyResolution;
	subject?: ConsentSubject | null;
	/** Detected user-agent GPC signal. */
	privacyDetected?: boolean;
	overrides?: KernelOverrides;
	user?: KernelUser | null;
	location?: LocationResponse | null;
	translations?: KernelTranslations | null;
	branding?: KernelBranding | null;

	policySnapshotToken?: string | null;
	activeUI?: KernelActiveUI;
	policyPending?: boolean;
	iab?: KernelIABState | null;
	/** Evaluation time. Defaults to the current `evaluatedAt`. */
	now?: number;
}

const pick = function pick<Value>(
	patched: Value | undefined,
	current: Value
): Value {
	return patched === undefined ? current : patched;
};

const samePermissions = function samePermissions(
	left: Readonly<ConsentState>,
	right: Readonly<ConsentState>
): boolean {
	if (left === right) {
		return true;
	}
	for (const key of Object.keys(right) as (keyof ConsentState)[]) {
		if (left[key] !== right[key]) {
			return false;
		}
	}
	return Object.keys(left).length === Object.keys(right).length;
};

const samePrompt = function samePrompt(
	left: PromptRequirement,
	right: PromptRequirement
): boolean {
	if (left.kind !== right.kind) {
		return false;
	}
	return left.kind === 'none' || right.kind === 'none'
		? true
		: left.reason === right.reason;
};

type Restrictions = Readonly<
	Partial<Record<OptionalConsentCategory, readonly RestrictionReason[]>>
>;

const sameRestrictions = function sameRestrictions(
	left: Restrictions,
	right: Restrictions
): boolean {
	if (left === right) {
		return true;
	}
	for (const category of OPTIONAL_CONSENT_CATEGORIES) {
		const a = left[category];
		const b = right[category];
		if (a === b) {
			continue;
		}
		if (!a || !b || a.length !== b.length) {
			return false;
		}
		if (a.some((reason, index) => reason !== b[index])) {
			return false;
		}
	}
	return true;
};

const preservePrivacyDirectives = function preservePrivacyDirectives(
	current: readonly PrivacyOptOut[],
	patched: readonly PrivacyOptOut[] | undefined
): readonly PrivacyOptOut[] {
	if (patched === undefined || patched === current) {
		return current;
	}
	const unchanged =
		patched.length === current.length &&
		patched.every((directive, index) => {
			const previous = current[index];
			return (
				previous !== undefined &&
				directive.source === previous.source &&
				directive.recordedAt === previous.recordedAt &&
				directive.categories.length === previous.categories.length &&
				directive.categories.every(
					(category, categoryIndex) =>
						category === previous.categories[categoryIndex]
				)
			);
		});
	return unchanged ? current : patched;
};

const samePrivacySignals = function samePrivacySignals(
	left: KernelPrivacySignals,
	right: KernelPrivacySignals
): boolean {
	return (
		left.gpc.active === right.gpc.active &&
		left.gpc.detected === right.gpc.detected &&
		left.gpc.override === right.gpc.override
	);
};

/** Derive the privacy-signal view from the override and the detection. */
export const derivePrivacySignals = function derivePrivacySignals(
	override: boolean | undefined,
	detected: boolean
): KernelPrivacySignals {
	return {
		gpc: {
			active: override ?? detected,
			detected,
			override,
		},
	};
};

/** Whether a choice holds at least one receipt. */
export const hasChoicePresence = function hasChoicePresence(
	choice: ExplicitChoice | null
): boolean {
	return choice !== null && Object.keys(choice.categories).length > 0;
};

/**
 * Re-derive the surface only when the prompt or the visibility inputs
 * changed. An adapter that opened the dialog keeps it open across an
 * unrelated re-evaluation; an explicit patch always wins.
 */
const deriveNextActiveUI = function deriveNextActiveUI(input: {
	current: ConsentSnapshot;
	patch: SnapshotPatch;
	derive: boolean;
	policyRule: ConsentSnapshot['policyRule'];
	policyPending: boolean;
	promptRequirement: PromptRequirement;
	resolution: PolicyResolution;
}): KernelActiveUI {
	if (input.patch.activeUI !== undefined) {
		return input.patch.activeUI;
	}
	if (input.derive) {
		return deriveActiveUI({
			policyPending: input.policyPending,
			promptRequirement: input.promptRequirement,
			resolution: input.resolution,
		});
	}
	return input.current.activeUI;
};

/**
 * Merge a patch over the current snapshot and re-derive every dependent
 * field. Returns an unfrozen candidate at `revision + 1`; the kernel
 * decides whether anything changed before adopting it.
 */
// oxlint-disable-next-line complexity -- One pass over every derived field keeps the derivation order visible.
export const buildNextSnapshot = function buildNextSnapshot(
	current: ConsentSnapshot,
	patch: SnapshotPatch
): ConsentSnapshot {
	const resolution = pick(patch.resolution, current.resolution);
	const resolutionChanged = resolution !== current.resolution;
	const effective = resolutionChanged
		? resolveEffectivePolicy(resolution)
		: null;
	const policyRule = effective ? effective.rule : current.policyRule;
	const evaluationPolicy = effective
		? buildEvaluationPolicy(effective)
		: current.evaluationPolicy;

	const explicitChoice = pick(patch.explicitChoice, current.explicitChoice);
	const noticeDismissal = pick(patch.noticeDismissal, current.noticeDismissal);
	const optOutDirectives = preservePrivacyDirectives(
		current.optOutDirectives,
		patch.optOutDirectives
	);
	const overrides = pick(patch.overrides, current.overrides);
	const detected = pick(
		patch.privacyDetected,
		current.privacySignals.gpc.detected
	);
	const privacyCandidate = derivePrivacySignals(overrides.gpc, detected);
	const privacySignals = samePrivacySignals(
		privacyCandidate,
		current.privacySignals
	)
		? current.privacySignals
		: privacyCandidate;
	const now = pick(patch.now, current.evaluatedAt);
	let iab = pick(patch.iab, current.iab);
	if (
		iab?.authority &&
		(!iab.enabled ||
			resolution.status !== 'matched' ||
			policyRule.model !== 'iab' ||
			iab.authority.choiceFingerprint !== evaluationPolicy.choice.fingerprint)
	) {
		iab = { ...iab, authority: null };
	}

	// Frozen evaluator inputs remain valid until their next deadline. Changes
	// to presentation, identity or metadata do not alter record authority.
	// A clock moving backwards must re-evaluate previously expired grants.
	const reuseEvaluation =
		evaluationPolicy === current.evaluationPolicy &&
		explicitChoice === current.explicitChoice &&
		noticeDismissal === current.noticeDismissal &&
		optOutDirectives === current.optOutDirectives &&
		privacySignals.gpc.active === current.privacySignals.gpc.active &&
		now >= current.evaluatedAt &&
		(current.nextDeadline === null || now < current.nextDeadline);
	const evaluation = reuseEvaluation
		? {
				nextDeadline: current.nextDeadline,
				permissions: current.effectivePermissions,
				promptRequirement: current.promptRequirement,
				restrictions: current.restrictions,
			}
		: evaluateConsentRecord({
				choice: explicitChoice,
				gpc: privacySignals.gpc.active,
				noticeDismissal,
				now,
				optOuts: optOutDirectives,
				policy: evaluationPolicy,
			});
	const effectivePermissions = samePermissions(
		current.effectivePermissions,
		evaluation.permissions
	)
		? current.effectivePermissions
		: evaluation.permissions;
	const promptRequirement = samePrompt(
		current.promptRequirement,
		evaluation.promptRequirement
	)
		? current.promptRequirement
		: evaluation.promptRequirement;
	const restrictions = sameRestrictions(
		current.restrictions,
		evaluation.restrictions
	)
		? current.restrictions
		: evaluation.restrictions;

	const policyPending = pick(patch.policyPending, current.policyPending);
	const promptChanged = promptRequirement !== current.promptRequirement;
	const visibilityChanged =
		resolutionChanged || policyPending !== current.policyPending;
	const activeUI = deriveNextActiveUI({
		current,
		derive: promptChanged || visibilityChanged,
		patch,
		policyPending,
		policyRule,
		promptRequirement,
		resolution,
	});

	const subject = pick(patch.subject, current.subject);

	return {
		activeUI,
		branding: pick(patch.branding, current.branding),
		effectivePermissions,
		evaluatedAt: now,
		evaluationPolicy,
		explicitChoice,
		hasConsented: hasChoicePresence(explicitChoice),
		iab,
		location: pick(patch.location, current.location),
		model: deriveModel(policyRule, iab?.enabled ?? false),
		nextDeadline: evaluation.nextDeadline,
		noticeDismissal,
		optOutDirectives,
		overrides,
		policyPending,
		policyRule,
		policySnapshotToken: pick(
			patch.policySnapshotToken,
			current.policySnapshotToken
		),
		privacySignals,
		promptRequirement,
		resolution,
		restrictions,
		revision: current.revision + 1,
		subject,
		translations: pick(patch.translations, current.translations),
		user: pick(patch.user, current.user),
	};
};

/**
 * Whether a candidate differs from the current snapshot in any field other
 * than `revision` and `evaluatedAt`. Derived fields are reference-stable,
 * so a shallow comparison is exact.
 */
export const snapshotChanged = function snapshotChanged(
	current: ConsentSnapshot,
	next: ConsentSnapshot
): boolean {
	for (const key of Object.keys(next) as (keyof ConsentSnapshot)[]) {
		if (key === 'revision' || key === 'evaluatedAt') {
			continue;
		}
		if (current[key] !== next[key]) {
			return true;
		}
	}
	return false;
};

/**
 * Produce the next frozen snapshot by applying a patch. Always bumps the
 * revision; use {@link snapshotChanged} first to skip no-op patches.
 */
export const applyPatch = function applyPatch(
	current: ConsentSnapshot,
	patch: SnapshotPatch
): ConsentSnapshot {
	return freezeSnapshot(buildNextSnapshot(current, patch));
};
