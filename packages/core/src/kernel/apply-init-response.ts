/**
 * Fold a complete transport response through the versioned policy reader.
 * Missing or invalid policy contracts fail safely and clear policy proof.
 */
import type { PolicyResolution } from '@c15t/schema/types';
import { readPolicyResolutionWire } from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';
import { deepMergeTranslations } from '@c15t/translations';

import type { RecordIssue } from '../consent-record/validation';
import type {
	ConsentSnapshot,
	InitResponse,
	KernelIABState,
	KernelTranslations,
} from '../types';
import type { SnapshotPatch } from './patch';
import { mergeNewestChoice, validateHydrationRecords } from './records';
import { mergeServerPatch } from './server-records';
import { DEFAULT_IAB } from './snapshot';

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
	return { policy: null, reason: 'invalid-payload', status: 'failed' };
};

export interface AppliedInitResponse {
	patch: SnapshotPatch;
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
	const patch: SnapshotPatch = { now, policyPending: false };

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
		patch.policySnapshotToken = response.policySnapshotToken ?? null;
	} else {
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
		patch,
		recordIssues,
	};
};
