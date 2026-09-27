/**
 * Ordering rules shared by storage writes and reconciliation.
 *
 * Several runtimes can share one browser's storage: two tabs, a tab and a
 * restored back/forward page, or two runtimes on one page. Each one writes
 * its own decisions and reads the others' back. Two rules keep them from
 * undoing each other:
 *
 * - A decision is only replaced by one made at the same time or later,
 *   compared by the time the record carries (`confirmedAt`, `dismissedAt`,
 *   `recordedAt`). This holds in both directions: a queued write never
 *   replaces a newer stored record, and reconciliation never replaces a
 *   newer in-memory record with an older stored one.
 * - Removing a record is the one way back. Readable storage with no record
 *   clears the in-memory record; storage that cannot be read, or bytes that
 *   do not decode, leave it as is.
 * - Reconciliation acts only on what changed in storage since this runtime
 *   last read or wrote it, so a record held only in memory (a receipt
 *   merged from the server, say) is never cleared for being absent.
 *
 * Pure. Nothing here reads storage or evaluates expiry; the consent
 * evaluator judges the applied records at the reconciliation time.
 */
import type {
	ExplicitChoice,
	NoticeDismissal,
	PrivacyOptOut,
} from '../../consent-record/types';
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
const sameRecord = function sameRecord(left: unknown, right: unknown): boolean {
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

const latestDirectiveAt = function latestDirectiveAt(
	directives: readonly PrivacyOptOut[] | null | undefined
): number {
	let latest = Number.NEGATIVE_INFINITY;
	for (const directive of directives ?? []) {
		if (directive.recordedAt > latest) {
			latest = directive.recordedAt;
		}
	}
	return latest;
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Whether the choice envelope may be written over what storage holds.
 *
 * A write that follows a recorded choice lands unless storage already holds
 * a newer decision. A write that only acknowledges the server's subject id
 * carries no new decision, so it lands only on a record that still holds
 * exactly this runtime's decisions: it never recreates a record another
 * runtime cleared, and never replaces one another runtime wrote.
 *
 * @param ours - The in-memory choice about to be written.
 * @param stored - The choice storage holds now, or `null`.
 * @param subjectOnly - Whether no choice was recorded since the last write.
 * @returns `true` when the write may proceed.
 */
export const mayWriteChoice = function mayWriteChoice(
	ours: ExplicitChoice | null,
	stored: ExplicitChoice | null,
	subjectOnly: boolean
): boolean {
	if (!ours) {
		return true;
	}
	if (subjectOnly) {
		return stored !== null && sameRecord(stored.categories, ours.categories);
	}
	return stored === null || latestDecisionAt(stored) <= latestDecisionAt(ours);
};

/**
 * Whether the vendor record may be written over what storage holds. Same
 * rules as {@link mayWriteChoice}; an in-memory `null` never deletes a
 * stored record.
 */
export const mayWriteVendorChoice = function mayWriteVendorChoice(
	ours: VendorChoice | null,
	stored: VendorChoice | null,
	subjectOnly: boolean
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
	return stored.confirmedAt <= ours.confirmedAt;
};

/** Whether the notice dismissal may be written over what storage holds. */
export const mayWriteNotice = function mayWriteNotice(
	ours: NoticeDismissal | null,
	stored: NoticeDismissal | null
): boolean {
	if (!(ours && stored)) {
		return true;
	}
	return stored.dismissedAt <= ours.dismissedAt;
};

/** Whether the privacy directives may be written over what storage holds. */
export const mayWritePrivacy = function mayWritePrivacy(
	ours: readonly PrivacyOptOut[],
	stored: readonly PrivacyOptOut[] | null
): boolean {
	return latestDirectiveAt(stored) <= latestDirectiveAt(ours);
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

/** How a changed stored record relates to its in-memory counterpart. */
type Outcome = 'adopt' | 'keep' | 'same';

const compare = function compare<RecordType>(
	current: RecordType | null,
	stored: RecordType | null,
	timeOf: (record: RecordType) => number
): Outcome {
	if (sameRecord(current, stored)) {
		return 'same';
	}
	if (stored === null || current === null) {
		// Removal clears; a first record is adopted.
		return 'adopt';
	}
	return timeOf(current) > timeOf(stored) ? 'keep' : 'adopt';
};

/**
 * Choice and subject records to apply for a changed stored choice. The
 * subject belongs to the choice it was stored with. When the choices
 * already agree, a stored subject still carries the id a save resolved
 * later; an absent one never erases the identity held in memory.
 */
const reconcileChoice = function reconcileChoice(
	snapshot: ConsentSnapshot,
	stored: HydrationRecords
): HydrationRecords {
	const records: HydrationRecords = {};
	const choice = compare(
		snapshot.explicitChoice,
		stored.choice ?? null,
		latestDecisionAt
	);
	if (choice === 'adopt') {
		records.choice = stored.choice ?? null;
	}
	const subjectFollows =
		choice === 'adopt' ||
		(choice === 'same' &&
			(snapshot.explicitChoice === null || Boolean(stored.subject)));
	if (
		subjectFollows &&
		stored.subject !== undefined &&
		!sameRecord(snapshot.subject, stored.subject)
	) {
		records.subject = stored.subject;
	}
	return records;
};

/** Result of {@link selectReconciledRecords}. */
export interface ReconciledRecords {
	/** Records to hydrate, or `null` when the kernel already matches. */
	records: HydrationRecords | null;
	/** Fingerprints to keep for the next reconciliation. */
	seen: StorageFingerprints;
}

/**
 * Records to apply so the kernel reflects what changed in storage.
 *
 * Only a record whose stored value changed since this runtime last read or
 * wrote it is considered. A record the kernel holds but storage never had,
 * such as a receipt merged from the server, is not a change and stays. A
 * changed record is then adopted, cleared or ignored by the rules at the
 * top of this file. Only differences are returned, so an unchanged read
 * never touches the kernel or notifies anyone.
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
	const changedSince = (kind: StoredRecordKind): boolean =>
		current[kind] !== undefined && current[kind] !== seen[kind];
	const records: HydrationRecords = changedSince('choice')
		? reconcileChoice(snapshot, stored)
		: {};

	if (
		changedSince('vendors') &&
		compare(
			snapshot.vendorChoice,
			stored.vendorChoice ?? null,
			(record) => record.confirmedAt
		) === 'adopt'
	) {
		records.vendorChoice = stored.vendorChoice ?? null;
	}

	if (
		changedSince('notice') &&
		compare(
			snapshot.noticeDismissal,
			stored.noticeDismissal ?? null,
			(record) => record.dismissedAt
		) === 'adopt'
	) {
		records.noticeDismissal = stored.noticeDismissal ?? null;
	}

	// Directives are replaced as a list. A cleared list comes back empty.
	if (
		changedSince('privacy') &&
		stored.optOutDirectives &&
		!sameRecord(snapshot.optOutDirectives, stored.optOutDirectives)
	) {
		records.optOutDirectives = stored.optOutDirectives;
	}

	return {
		records: Object.keys(records).length > 0 ? { ...records, now } : null,
		seen: { ...seen, ...current },
	};
};
