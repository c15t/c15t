/**
 * Ordering rules shared by storage writes and reconciliation.
 *
 * Several runtimes can share one browser's storage: two tabs, a tab and a
 * restored back/forward page, or two runtimes on one page. Each one writes
 * its own decisions and reads the others' back. These rules keep them from
 * undoing each other:
 *
 * - Category decisions merge per category. Each category keeps the decision
 *   with the newer `confirmedAt`, so a runtime that only decided marketing
 *   never reverts another runtime's newer measurement decision. This holds
 *   in both directions: a queued write stores the merge of what it carries
 *   and what storage holds, and reconciliation merges storage into memory.
 * - Privacy directives only restrict, so both directions keep the union of
 *   the two lists.
 * - The notice dismissal and the vendor record are single decisions: the
 *   one with the newer time (`dismissedAt`, `confirmedAt`) wins.
 * - On equal times, a record another runtime stored since this runtime
 *   last read or wrote it wins, in writes and reads alike, so two runtimes
 *   acting in the same millisecond converge on what storage holds. A
 *   record storage still holds from this runtime is its own, so its later
 *   action in the same millisecond wins.
 * - The stored subject is carried into a merged write unless this runtime
 *   identified a different user, and reconciliation adopts it on the same
 *   terms, so every runtime saves under one identity.
 * - Removing a record is the one way back. Readable storage that lost a
 *   record since this runtime last read or wrote it clears the in-memory
 *   record; storage that cannot be read, or bytes that do not decode, leave
 *   it as is. A record held only in memory (a receipt merged from the
 *   server, say) is never cleared for being absent from storage.
 *
 * Pure. Nothing here reads storage or evaluates expiry; the consent
 * evaluator judges the applied records at the reconciliation time.
 */
import type {
	ConsentSubject,
	ExplicitChoice,
	NoticeDismissal,
	PrivacyOptOut,
} from '../../consent-record/types';
import { mergeNewestChoice } from '../../kernel/records';
import type {
	ConsentSnapshot,
	HydrationRecords,
	VendorChoice,
} from '../../types';

const canonical = function canonical(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(canonical);
	}
	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value)
			.filter(([, entry]) => entry !== undefined)
			.sort(([left], [right]) => (left < right ? -1 : 1))
			.map(([key, entry]) => [key, canonical(entry)]);
		return Object.fromEntries(entries);
	}
	return value;
};

/** Structural equality for plain record data, ignoring key order. */
export const sameRecord = function sameRecord(
	left: unknown,
	right: unknown
): boolean {
	return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
};

/** Time of the newest category decision, or `-Infinity` without one. */
const latestDecisionAt = function latestDecisionAt(
	choice: ExplicitChoice | null | undefined
): number {
	let latest = Number.NEGATIVE_INFINITY;
	for (const decision of Object.values(choice?.categories ?? {})) {
		if (decision && decision.confirmedAt > latest) {
			latest = decision.confirmedAt;
		}
	}
	return latest;
};

const directiveKey = function directiveKey(directive: PrivacyOptOut): string {
	return JSON.stringify([
		directive.recordedAt,
		directive.source,
		[...directive.categories].sort(),
	]);
};

/**
 * Union of two directive lists, without duplicates, oldest first. Both
 * runtimes derive the same list from the same inputs, so they converge.
 */
const mergeDirectives = function mergeDirectives(
	left: readonly PrivacyOptOut[],
	right: readonly PrivacyOptOut[]
): PrivacyOptOut[] {
	const byKey = new Map<string, PrivacyOptOut>();
	for (const directive of [...left, ...right]) {
		const key = directiveKey(directive);
		if (!byKey.has(key)) {
			byKey.set(key, directive);
		}
	}
	return [...byKey.entries()]
		.sort(([leftKey], [rightKey]) => (leftKey < rightKey ? -1 : 1))
		.map(([, directive]) => directive);
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Whether a subject carries an identity the other lacks: an external id or
 * identity provider set by `identify()` in this runtime.
 */
const hasNewerIdentity = function hasNewerIdentity(
	subject: ConsentSubject | null | undefined,
	than: ConsentSubject | null | undefined
): boolean {
	return Boolean(
		(subject?.externalId && subject.externalId !== than?.externalId) ||
		(subject?.identityProvider &&
			subject.identityProvider !== than?.identityProvider)
	);
};

/**
 * The subject to store with a merged record. A runtime opened before
 * another one stored a subject generates its own id on its first save; the
 * stored identity is carried forward so a reload and later backend saves
 * keep one subject. The runtime's own subject wins only when it carries a
 * newer identity from `identify()`.
 *
 * @param ours - The subject in memory.
 * @param stored - The subject storage holds now, or `null`.
 * @returns The subject to write.
 */
export const subjectToWrite = function subjectToWrite(
	ours: ConsentSubject | null,
	stored: ConsentSubject | null | undefined
): ConsentSubject | null {
	if (!stored || Object.keys(stored).length === 0) {
		return ours;
	}
	if (!ours || hasNewerIdentity(ours, stored)) {
		return ours ?? { ...stored };
	}
	return { ...ours, ...stored };
};

/**
 * The choice to write over what storage holds, or `null` to skip the write.
 *
 * A write that follows a recorded choice stores the per-category merge of
 * this runtime's choice and the stored one, so a category another runtime
 * decided more recently keeps that decision. On equal times the stored
 * decision wins when another runtime stored it since this runtime last read
 * or wrote the record; otherwise the record is this runtime's own and its
 * later action in the same millisecond wins. A write that only acknowledges
 * the server's subject id carries no new decision, so it lands only on a
 * record that still holds exactly this runtime's decisions: it never
 * recreates a record another runtime cleared, and never replaces one
 * another runtime wrote.
 *
 * @param ours - The in-memory choice about to be written.
 * @param stored - The choice storage holds now, or `null`.
 * @param subjectOnly - Whether no choice was recorded since the last write.
 * @param storedWinsTies - Whether storage changed since this runtime last
 * read or wrote it.
 * @returns The choice to write, or `null` when nothing should be written.
 */
export const choiceToWrite = function choiceToWrite(
	ours: ExplicitChoice | null,
	stored: ExplicitChoice | null,
	subjectOnly: boolean,
	storedWinsTies: boolean
): ExplicitChoice | null {
	if (!ours) {
		return null;
	}
	if (subjectOnly) {
		return stored !== null && sameRecord(stored.categories, ours.categories)
			? ours
			: null;
	}
	if (!stored) {
		return ours;
	}
	return storedWinsTies
		? mergeNewestChoice(stored, ours)
		: mergeNewestChoice(ours, stored);
};

/** Whether `ours`, stamped at `oursAt`, may replace a record from `storedAt`. */
const isNewerThanStored = function isNewerThanStored(
	oursAt: number,
	storedAt: number,
	storedWinsTies: boolean
): boolean {
	return storedWinsTies ? oursAt > storedAt : oursAt >= storedAt;
};

/**
 * Whether the vendor record may be written over what storage holds. The
 * newer record wins, ties follow the rule of {@link choiceToWrite}, and a
 * subject-only rewrite lands only on this runtime's own record. An
 * in-memory `null` never deletes a stored record.
 */
export const mayWriteVendorChoice = function mayWriteVendorChoice(
	ours: VendorChoice | null,
	stored: VendorChoice | null,
	subjectOnly: boolean,
	storedWinsTies: boolean
): boolean {
	if (!stored) {
		return !subjectOnly;
	}
	if (!ours) {
		return false;
	}
	if (subjectOnly) {
		return (
			stored.confirmedAt === ours.confirmedAt &&
			sameRecord(stored.denied, ours.denied)
		);
	}
	return isNewerThanStored(
		ours.confirmedAt,
		stored.confirmedAt,
		storedWinsTies
	);
};

/**
 * Whether the notice dismissal may be written over what storage holds. The
 * newer dismissal wins; ties follow the rule of {@link choiceToWrite}.
 */
export const mayWriteNotice = function mayWriteNotice(
	ours: NoticeDismissal | null,
	stored: NoticeDismissal | null,
	storedWinsTies: boolean
): boolean {
	if (!(ours && stored)) {
		return true;
	}
	return isNewerThanStored(
		ours.dismissedAt,
		stored.dismissedAt,
		storedWinsTies
	);
};

/**
 * The privacy directives to write: this runtime's list plus every directive
 * another runtime already stored.
 */
export const directivesToWrite = function directivesToWrite(
	ours: readonly PrivacyOptOut[],
	stored: readonly PrivacyOptOut[] | null
): PrivacyOptOut[] {
	return mergeDirectives(stored ?? [], ours);
};

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

/** The stored records, each read and written on its own. */
export type StoredRecordKind = 'choice' | 'notice' | 'privacy' | 'vendors';

/**
 * What storage held for each record the last time this runtime read or
 * wrote it. A kind is missing until it was readable once.
 */
export type StorageFingerprints = Partial<Record<StoredRecordKind, string>>;

const fingerprint = function fingerprint(value: unknown): string {
	return JSON.stringify(canonical(value));
};

/**
 * Fingerprints of the readable records in a storage read. The subject is
 * part of the choice record: it is stored with the envelope, or with the
 * vendor record when no choice exists.
 *
 * @param stored - Records read from storage; omitted keys were unreadable.
 * @returns One fingerprint per readable record.
 */
export const fingerprintStoredRecords = function fingerprintStoredRecords(
	stored: HydrationRecords
): StorageFingerprints {
	const prints: StorageFingerprints = {};
	if (stored.choice !== undefined) {
		prints.choice = fingerprint([stored.choice, stored.subject ?? null]);
	}
	if (stored.noticeDismissal !== undefined) {
		prints.notice = fingerprint(stored.noticeDismissal);
	}
	if (stored.optOutDirectives !== undefined) {
		prints.privacy = fingerprint(stored.optOutDirectives);
	}
	if (stored.vendorChoice !== undefined) {
		prints.vendors = fingerprint(stored.vendorChoice);
	}
	return prints;
};

type Changed = (kind: StoredRecordKind) => boolean;

/** Whether a changed single-decision record should replace memory. */
const adoptNewer = function adoptNewer<RecordType>(
	current: RecordType | null,
	stored: RecordType | null,
	timeOf: (record: RecordType) => number
): boolean {
	if (sameRecord(current, stored)) {
		return false;
	}
	if (stored === null || current === null) {
		// Removal clears; a first record is adopted.
		return true;
	}
	return timeOf(stored) >= timeOf(current);
};

/**
 * The subject to apply, or `undefined` to keep the one in memory. The
 * subject belongs to the record it was stored with: the envelope, or the
 * vendor record for a visitor whose only decision is about vendors. A
 * stored subject replaces the one in memory when the stored choice is at
 * least as recent overall; an absent one never erases an identity held
 * alongside a choice.
 */
const reconcileSubject = function reconcileSubject(
	snapshot: ConsentSnapshot,
	stored: HydrationRecords,
	records: HydrationRecords,
	changed: Changed
): HydrationRecords['subject'] {
	const { explicitChoice } = snapshot;
	let candidate: HydrationRecords['subject'];
	if (records.choice === null) {
		// The choice was cleared: take whatever identity storage still has.
		candidate = stored.subject ?? null;
	} else if (stored.choice) {
		// A stored subject at least as recent as the choice in memory is the
		// shared identity, unless this runtime identified a different user.
		const current =
			explicitChoice === null ||
			latestDecisionAt(stored.choice) >= latestDecisionAt(explicitChoice);
		candidate =
			current &&
			stored.subject &&
			!hasNewerIdentity(snapshot.subject, stored.subject)
				? stored.subject
				: undefined;
	} else if (explicitChoice === null) {
		// No choice on either side, or an unreadable one: the vendor record
		// carries the subject.
		const relevant =
			stored.choice === null ? changed('choice') : changed('vendors');
		candidate =
			relevant && (stored.choice === null || stored.subject)
				? stored.subject
				: undefined;
	}
	return candidate !== undefined && !sameRecord(snapshot.subject, candidate)
		? candidate
		: undefined;
};

/** Choice records to apply: a per-category merge, or a clear. */
const reconcileChoice = function reconcileChoice(
	snapshot: ConsentSnapshot,
	stored: HydrationRecords,
	changed: Changed
): HydrationRecords {
	const records: HydrationRecords = {};
	const { explicitChoice } = snapshot;
	if (stored.choice === null) {
		if (changed('choice') && explicitChoice !== null) {
			records.choice = null;
		}
	} else if (stored.choice) {
		// On equal times a decision another runtime stored since this one
		// last looked wins; otherwise the stored record is this runtime's own.
		const merged = changed('choice')
			? mergeNewestChoice(stored.choice, explicitChoice)
			: mergeNewestChoice(explicitChoice, stored.choice);
		if (!sameRecord(merged, explicitChoice)) {
			records.choice = merged;
		}
	}
	const subject = reconcileSubject(snapshot, stored, records, changed);
	if (subject !== undefined) {
		records.subject = subject;
	}
	return records;
};

/** Directive list to apply: the union, or a clear. */
const reconcileDirectives = function reconcileDirectives(
	current: readonly PrivacyOptOut[],
	stored: readonly PrivacyOptOut[] | undefined,
	changed: Changed
): readonly PrivacyOptOut[] | undefined {
	if (!stored) {
		return undefined;
	}
	if (stored.length === 0) {
		// An emptied list is a clear, but only once it changed.
		return changed('privacy') && current.length > 0 ? [] : undefined;
	}
	const merged = mergeDirectives(current, stored);
	return sameRecord(merged, mergeDirectives(current, [])) ? undefined : merged;
};

/** Result of {@link selectReconciledRecords}. */
export interface ReconciledRecords {
	/** Records to hydrate, or `null` when the kernel already matches. */
	records: HydrationRecords | null;
	/** Fingerprints to keep for the next reconciliation. */
	seen: StorageFingerprints;
}

/**
 * Records to apply so the kernel reflects what storage holds, by the rules
 * at the top of this file. Only differences are returned, so an unchanged
 * read never touches the kernel or notifies anyone.
 *
 * @param snapshot - The kernel's current snapshot.
 * @param stored - Records read from storage; omitted keys were unreadable.
 * @param seen - Fingerprints from the previous read or write.
 * @param now - Read time, used as the evaluation time.
 * @returns The records to hydrate and the fingerprints to keep.
 */
export const selectReconciledRecords = function selectReconciledRecords(
	snapshot: ConsentSnapshot,
	stored: HydrationRecords,
	seen: StorageFingerprints,
	now: number
): ReconciledRecords {
	const current = fingerprintStoredRecords(stored);
	const changed: Changed = (kind) =>
		current[kind] !== undefined && current[kind] !== seen[kind];
	const records = reconcileChoice(snapshot, stored, changed);

	if (
		changed('vendors') &&
		adoptNewer(
			snapshot.vendorChoice,
			stored.vendorChoice ?? null,
			(record) => record.confirmedAt
		)
	) {
		records.vendorChoice = stored.vendorChoice ?? null;
	}

	if (
		changed('notice') &&
		adoptNewer(
			snapshot.noticeDismissal,
			stored.noticeDismissal ?? null,
			(record) => record.dismissedAt
		)
	) {
		records.noticeDismissal = stored.noticeDismissal ?? null;
	}

	const directives = reconcileDirectives(
		snapshot.optOutDirectives,
		stored.optOutDirectives,
		changed
	);
	if (directives) {
		records.optOutDirectives = directives;
	}

	return {
		records: Object.keys(records).length > 0 ? { ...records, now } : null,
		seen: { ...seen, ...current },
	};
};
