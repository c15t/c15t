/**
 * Fold an `InitResponse` from a transport onto a snapshot.
 *
 * Pure: takes the current snapshot, the response, the staged legacy policy
 * and the evaluation time, and returns the patch plus the draft seed. A
 * transport response is a complete init, not an internal patch: the policy
 * resolution is always replaced, never preserved from a previous init.
 *
 * Resolution precedence:
 * 1. An own `policyResolution` field is read with the strict schema
 *    reader. Anything the client cannot represent fails safely.
 * 2. Otherwise an own legacy `policy` field is lifted through the
 *    versioned legacy producer bridge (`readLegacyPolicyWire`).
 * 3. Otherwise the response is malformed: `failed` with `invalid-payload`.
 *    A transport that answered is a producer; a legacy policy staged from
 *    config never rescues its malformed response. Only the no-transport
 *    init path lifts the staged policy or reports `unconfigured`.
 *
 * Every non-matched outcome clears the legacy policy, decision, token and
 * the policy-derived IAB enablement before the safe fallback applies.
 */
import type { PolicyResolution } from '@c15t/schema/types';
import {
	readLegacyPolicyWire,
	readPolicyResolutionWire,
} from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';
import { deepMergeTranslations } from '@c15t/translations';

import type { RecordIssue } from '../consent-record/validation';
import type { PresentedSelection } from '../policy';
import type {
	ConsentSnapshot,
	InitResponse,
	KernelIABState,
	KernelTranslations,
} from '../types';
import type { SnapshotPatch } from './patch';
import { mergeNewestChoice, validateHydrationRecords } from './records';
import { mergeServerPatch } from './server-records';
import { buildDraft, DEFAULT_IAB } from './snapshot';

/**
 * Merge incoming init translations over the snapshot's current ones.
 * Same-language responses deep-merge so omitted keys keep their copy; a
 * language switch replaces outright.
 */
const mergeInitTranslations = function mergeInitTranslations(
	current: Readonly<KernelTranslations> | null,
	incoming: KernelTranslations
): KernelTranslations {
	if (
		!current?.translations ||
		!incoming?.translations ||
		current.language !== incoming.language
	) {
		return incoming;
	}
	return {
		...incoming,
		translations: deepMergeTranslations(
			current.translations as Translations,
			incoming.translations as Partial<Translations>
		) as KernelTranslations['translations'],
	};
};

/** Resolve the policy outcome a complete transport response carries. */
export const readInitResolution = function readInitResolution(
	response: InitResponse
): PolicyResolution {
	if (Object.hasOwn(response, 'policyResolution')) {
		return readPolicyResolutionWire(response.policyResolution);
	}
	if (Object.hasOwn(response, 'policy')) {
		return readLegacyPolicyWire({
			policy: response.policy,
			policyDecision: response.policyDecision,
		});
	}
	return { policy: null, reason: 'invalid-payload', status: 'failed' };
};

export interface AppliedInitResponse {
	patch: SnapshotPatch;
	/** Draft seed from the BRIDGE `consents` field, if any. */
	draft: PresentedSelection | null;
	/** Issues found in `response.records`; the records were not applied. */
	recordIssues: RecordIssue[] | null;
}

/**
 * Build the patch for an init response. Always returns a patch: a complete
 * init at least finalizes the resolution and the provisional flag.
 */
// oxlint-disable-next-line complexity -- One pass over every response field keeps the fold order visible.
export const applyInitResponse = function applyInitResponse(
	current: ConsentSnapshot,
	response: InitResponse,
	now: number
): AppliedInitResponse {
	const patch: SnapshotPatch = { now, policyProvisional: false };

	if (response.resolvedOverrides) {
		patch.overrides = {
			...current.overrides,
			...response.resolvedOverrides,
		};
	}
	if (response.location !== undefined) {
		patch.location = response.location;
	}
	if (response.translations !== undefined) {
		patch.translations = response.translations
			? mergeInitTranslations(current.translations, response.translations)
			: response.translations;
	}
	if (response.branding !== undefined) {
		patch.branding = response.branding;
	}

	const resolution = readInitResolution(response);
	patch.resolution = resolution;
	if (resolution.status === 'matched') {
		patch.policy = response.policy ?? null;
		patch.policyDecision = response.policyDecision ?? null;
		patch.policySnapshotToken = response.policySnapshotToken ?? null;
	} else {
		patch.policy = null;
		patch.policyDecision = null;
		patch.policySnapshotToken = null;
	}

	// IAB passthrough: fold gvl / customVendors / cmpId into the iab slice.
	let nextIab: KernelIABState | null | undefined;
	if (
		response.gvl !== undefined ||
		response.customVendors !== undefined ||
		response.cmpId !== undefined
	) {
		const baseline = current.iab ?? DEFAULT_IAB;
		nextIab = {
			...baseline,
			cmpId: response.cmpId === undefined ? baseline.cmpId : response.cmpId,
			customVendors:
				response.customVendors === undefined
					? baseline.customVendors
					: response.customVendors,
			gvl: response.gvl === undefined ? baseline.gvl : response.gvl,
		};
		// Server explicitly returned `gvl: null` → IAB disabled for this request.
		if (response.gvl === null) {
			nextIab.enabled = false;
		}
	}
	if (resolution.status !== 'matched') {
		const baseline = nextIab ?? current.iab;
		if (baseline?.enabled) {
			nextIab = { ...baseline, enabled: false };
		}
	}
	if (nextIab !== undefined) {
		patch.iab = nextIab;
	}

	if (response.resolvedPrivacySignals?.gpc !== undefined) {
		patch.privacyDetected = response.resolvedPrivacySignals.gpc === true;
	}

	let recordIssues: RecordIssue[] | null = null;
	if (response.records) {
		const validated = validateHydrationRecords(response.records, now);
		if (validated.ok === true) {
			if (validated.records.choice !== undefined) {
				// Server receipts merge by newest confirmation per category so
				// a local action made before init resolved is never overwritten.
				patch.explicitChoice = mergeNewestChoice(
					current.explicitChoice,
					validated.records.choice
				);
			}
			Object.assign(patch, mergeServerPatch(current, validated.records, now));
		} else {
			recordIssues = validated.issues;
		}
	}
	if (response.subjectId !== undefined) {
		const subject =
			patch.subject === undefined ? current.subject : patch.subject;
		patch.subject = { ...subject, subjectId: response.subjectId };
	}

	return {
		draft: buildDraft(response.consents),
		patch,
		recordIssues,
	};
};
