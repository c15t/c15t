/**
 * What the save outbox stores, and the one supersession rule.
 *
 * Stored entries come back from storage another release or another tab
 * may have written, so every read validates them and drops what it cannot
 * replay: malformed entries, entries older than a week, and entries that
 * used up their attempts.
 */

import { OPTIONAL_CONSENT_CATEGORIES } from '../../consent-record/types';
import type { OptionalConsentCategory } from '../../consent-record/types';
import { validateExplicitChoice } from '../../consent-record/validation';
import { isExperimentAssignment } from '../../libs/experiment-record';
import type { ConsentSnapshot, SavePayload } from '../../types';
import type { OutboxTransaction } from './store';

export const MAX_PENDING_SAVE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_REPLAY_ATTEMPTS = 10;

/** A save waiting for a replay. */
export interface PendingSaveEntry {
	payload: SavePayload;
	queuedAt: number;
	attempts: number;
}

/** A subject id the backend refused, and the one this browser moved to. */
export interface SubjectReassignment {
	from: string;
	to: string;
	at: number;
}

// ---------------------------------------------------------------------------
// Supersession
// ---------------------------------------------------------------------------

/**
 * What newer state covers of an older save: the categories decided again
 * since, and whether a newer vendor map replaced the save's own.
 */
export interface Supersession {
	category: (category: OptionalConsentCategory) => boolean;
	vendors: boolean;
}

const NOTHING_SUPERSEDED: Supersession = {
	category: () => false,
	vendors: false,
};

/**
 * The part of a save nothing newer covers, or `null` when nothing is left.
 *
 * Surviving categories keep their receipts and action time, so a replay
 * records when the visitor decided. A narrowed save is a `custom` action
 * and cannot replay the full TC string. The vendor map is a whole decision
 * of its own: narrowing the categories says nothing about it, and it goes
 * only when a newer map replaced it, taking with it a save that has no
 * category left.
 *
 * Every caller that asks "is this save superseded?" asks it here: the
 * kernel for a send in flight ({@link liveSupersession}) and the queue for
 * stored entries ({@link supersededBy}).
 */
export const withoutSuperseded = function withoutSuperseded(
	payload: SavePayload,
	by: Supersession
): SavePayload | null {
	const keys = OPTIONAL_CONSENT_CATEGORIES.filter((category) =>
		Object.hasOwn(payload.confirmed.categories, category)
	);
	const kept = keys.filter((category) => !by.category(category));
	let selected = payload;
	if (kept.length === 0 && keys.length > 0) {
		return null;
	}
	if (kept.length < keys.length) {
		const categories: Partial<Record<OptionalConsentCategory, boolean>> = {};
		const receipts: SavePayload['choice']['categories'] = {};
		const consents = {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		};
		for (const category of kept) {
			const receipt = payload.choice.categories[category];
			if (receipt) {
				categories[category] = receipt.value;
				receipts[category] = receipt;
				consents[category] = payload.consents[category];
			}
		}
		selected = {
			...payload,
			choice: { categories: receipts, version: 3 },
			confirmed: { ...payload.confirmed, categories },
			consentAction: 'custom',
			consents,
			tcString: null,
		};
	}
	if (selected.vendorChoice === undefined || !by.vendors) {
		return selected;
	}
	const { vendorChoice: _superseded, ...remaining } = selected;
	return Object.keys(remaining.confirmed.categories).length > 0
		? remaining
		: null;
};

/**
 * What `newer` covers of `older`: the categories it confirmed and, when it
 * carried one, the vendor map. Nothing when it belongs to another subject
 * or acted before `older`.
 */
export const supersededBy = function supersededBy(
	older: SavePayload,
	newer: SavePayload
): Supersession {
	if (
		older.subjectId !== newer.subjectId ||
		older.confirmed.actionAt > newer.confirmed.actionAt
	) {
		return NOTHING_SUPERSEDED;
	}
	return {
		category: (category) => Object.hasOwn(newer.confirmed.categories, category),
		vendors: newer.vendorChoice !== undefined,
	};
};

/**
 * What the live state covers of a save sent from `action`, the snapshot the
 * save committed: every category whose receipt changed since, and the
 * vendor map once another one replaced it.
 */
export const liveSupersession = function liveSupersession(
	action: ConsentSnapshot,
	current: ConsentSnapshot
): Supersession {
	return {
		category: (category) =>
			current.explicitChoice?.categories[category] !==
			action.explicitChoice?.categories[category],
		vendors: current.vendorChoice !== action.vendorChoice,
	};
};

// ---------------------------------------------------------------------------
// Stored entry validation
// ---------------------------------------------------------------------------

const isRecord = function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isBooleanRecord = function isBooleanRecord(value: unknown): boolean {
	return (
		isRecord(value) &&
		Object.values(value).every((item) => typeof item === 'boolean')
	);
};

const isScalarRecord = function isScalarRecord(value: unknown): boolean {
	return (
		isRecord(value) &&
		Object.values(value).every(
			(item) =>
				typeof item === 'string' ||
				typeof item === 'number' ||
				typeof item === 'boolean'
		)
	);
};

const isOptionalString = function isOptionalString(value: unknown): boolean {
	return value === undefined || typeof value === 'string';
};

const isOptionalFiniteNumber = function isOptionalFiniteNumber(
	value: unknown
): boolean {
	return (
		value === undefined || (typeof value === 'number' && Number.isFinite(value))
	);
};

const isSaveUser = function isSaveUser(value: unknown): boolean {
	if (value === null) {
		return true;
	}
	if (!isRecord(value) || typeof value.externalId !== 'string') {
		return false;
	}
	return (
		isOptionalString(value.externalIdType) &&
		isOptionalString(value.identityProvider) &&
		(value.properties === undefined || isScalarRecord(value.properties))
	);
};

const isSubject = function isSubject(value: unknown): boolean {
	return (
		isRecord(value) &&
		isOptionalString(value.subjectId) &&
		isOptionalString(value.externalId) &&
		isOptionalString(value.identityProvider)
	);
};

const isConfirmedCoverage = function isConfirmedCoverage(
	value: unknown
): boolean {
	if (!isRecord(value) || !isRecord(value.categories)) {
		return false;
	}
	if (
		typeof value.actionAt !== 'number' ||
		!Number.isSafeInteger(value.actionAt) ||
		value.actionAt < 0
	) {
		return false;
	}
	const known = new Set<string>(OPTIONAL_CONSENT_CATEGORIES);
	return Object.entries(value.categories).every(
		([key, item]) => known.has(key) && typeof item === 'boolean'
	);
};

const isDecisionInputs = (value: unknown): boolean =>
	value === undefined ||
	(isRecord(value) &&
		(value.policyId === null ||
			(typeof value.policyId === 'string' &&
				value.policyId.length > 0 &&
				typeof value.fingerprint === 'string' &&
				value.fingerprint.length > 0)) &&
		(value.country === null || typeof value.country === 'string') &&
		(value.region === null || typeof value.region === 'string') &&
		typeof value.language === 'string' &&
		typeof value.gpc === 'boolean');

const isVendorChoicePayload = function isVendorChoicePayload(
	value: unknown
): boolean {
	return (
		value === undefined ||
		(isRecord(value) &&
			value.version === 1 &&
			typeof value.confirmedAt === 'number' &&
			Number.isSafeInteger(value.confirmedAt) &&
			value.confirmedAt >= 0 &&
			isBooleanRecord(value.grants))
	);
};

// Validate every persisted payload field before replaying it.
// oxlint-disable-next-line complexity
const isSavePayload = function isSavePayload(
	value: unknown
): value is SavePayload {
	if (!isRecord(value)) {
		return false;
	}
	if (
		!isSubject(value.subject) ||
		!isDecisionInputs(value.decisionInputs) ||
		!isConfirmedCoverage(value.confirmed) ||
		!validateExplicitChoice(value.choice, Date.now()).ok
	) {
		return false;
	}

	const validModel =
		value.model === null ||
		value.model === 'opt-in' ||
		value.model === 'opt-out' ||
		value.model === 'iab' ||
		value.model === 'none';
	const validUiSource =
		value.uiSource === null ||
		value.uiSource === 'none' ||
		value.uiSource === 'banner' ||
		value.uiSource === 'dialog' ||
		value.uiSource === 'widget';
	const validAction =
		value.consentAction === 'all' ||
		value.consentAction === 'necessary' ||
		value.consentAction === 'custom';

	return (
		typeof value.subjectId === 'string' &&
		isBooleanRecord(value.consents) &&
		isRecord(value.overrides) &&
		isSaveUser(value.user) &&
		validModel &&
		validUiSource &&
		validAction &&
		isOptionalFiniteNumber(value.givenAt) &&
		isOptionalFiniteNumber(value.timeToDecisionMs) &&
		(value.experiment === undefined ||
			isExperimentAssignment(value.experiment)) &&
		(value.policySnapshotToken === null ||
			typeof value.policySnapshotToken === 'string') &&
		(value.tcString === undefined ||
			value.tcString === null ||
			typeof value.tcString === 'string') &&
		isVendorChoicePayload(value.vendorChoice)
	);
};

const isPendingSaveEntry = function isPendingSaveEntry(
	value: unknown
): value is PendingSaveEntry {
	return (
		isRecord(value) &&
		isSavePayload(value.payload) &&
		typeof value.queuedAt === 'number' &&
		Number.isFinite(value.queuedAt) &&
		value.queuedAt >= 0 &&
		typeof value.attempts === 'number' &&
		Number.isInteger(value.attempts) &&
		value.attempts >= 0
	);
};

const isSubjectReassignment = function isSubjectReassignment(
	value: unknown
): value is SubjectReassignment {
	return (
		isRecord(value) &&
		typeof value.from === 'string' &&
		typeof value.to === 'string' &&
		typeof value.at === 'number' &&
		Number.isFinite(value.at)
	);
};

// ---------------------------------------------------------------------------
// Stored lists
// ---------------------------------------------------------------------------

/**
 * The valid, live entries in action order, each narrowed by every later
 * entry so no stale category replays over a newer one.
 */
export const normalizePendingSaves = function normalizePendingSaves(
	value: unknown,
	now: number
): PendingSaveEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const cutoff = now - MAX_PENDING_SAVE_AGE_MS;
	const entries: PendingSaveEntry[] = [];
	for (const entry of value) {
		if (
			!isPendingSaveEntry(entry) ||
			entry.queuedAt < cutoff ||
			entry.attempts >= MAX_REPLAY_ATTEMPTS
		) {
			continue;
		}
		entries.push(entry);
	}
	entries.sort(
		(left, right) =>
			left.payload.confirmed.actionAt - right.payload.confirmed.actionAt ||
			left.queuedAt - right.queuedAt
	);
	return entries.flatMap((entry, index) => {
		let payload: SavePayload | null = entry.payload;
		for (const later of entries.slice(index + 1)) {
			if (payload) {
				payload = withoutSuperseded(
					payload,
					supersededBy(payload, later.payload)
				);
			}
		}
		return payload ? [{ ...entry, payload }] : [];
	});
};

/** The queued saves, rewriting the stored list when normalizing changed it. */
export const readPendingSaves = function readPendingSaves(
	tx: OutboxTransaction,
	now: number
): PendingSaveEntry[] {
	const stored = tx.read('saves');
	if (stored === undefined) {
		return [];
	}
	const normalized = normalizePendingSaves(stored, now);
	if (JSON.stringify(normalized) !== JSON.stringify(stored)) {
		tx.write('saves', normalized);
	}
	return normalized;
};

/**
 * Stored reassignments, dropping malformed ones and those no queued save can
 * still need: older than a queued save may live, and with no save left
 * queued under the old id. A tab still on the old id can queue a save days
 * after the reassignment, and that save needs the record for as long as it
 * waits.
 */
export const readReassignments = function readReassignments(
	tx: OutboxTransaction,
	now: number
): SubjectReassignment[] {
	const stored = tx.read('reassignments');
	if (!Array.isArray(stored)) {
		return [];
	}
	const cutoff = now - MAX_PENDING_SAVE_AGE_MS;
	const queued = new Set(
		readPendingSaves(tx, now).map((entry) => entry.payload.subjectId)
	);
	return stored.filter(
		(item): item is SubjectReassignment =>
			isSubjectReassignment(item) &&
			(item.at >= cutoff || queued.has(item.from))
	);
};

/**
 * The same save under another subject id. Keys keep their positions, so a
 * queued entry moved by a reassignment still serializes identically to one
 * rebuilt from the original payload.
 */
export const withSubjectId = function withSubjectId(
	payload: SavePayload,
	subjectId: string
): SavePayload {
	return {
		...payload,
		subject: { ...payload.subject, subjectId },
		subjectId,
	};
};

export const isSamePendingSave = function isSamePendingSave(
	left: PendingSaveEntry,
	right: PendingSaveEntry
): boolean {
	return (
		left.queuedAt === right.queuedAt &&
		left.attempts === right.attempts &&
		JSON.stringify(left.payload) === JSON.stringify(right.payload)
	);
};
