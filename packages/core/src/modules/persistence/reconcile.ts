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
 * - One subject: a subject this runtime generated on a save or copied from
 *   storage yields to the stored one, in merged writes and in
 *   reconciliation of a changed record. A subject id the server resolved
 *   yields only to a strictly newer stored choice, and an identity set by
 *   `identify()` never yields.
 * - Removing a record is the one way back. Readable storage that lost a
 *   record this runtime last saw present clears the in-memory record;
 *   storage that cannot be read, or bytes that do not decode, leave it as
 *   is. A record this runtime never saw in storage (a receipt merged from
 *   the server, or a choice seeded while storage was blocked) is never
 *   cleared for being absent.
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
import { mergeDirectives } from './directives';
import {
	choiceSinceEpoch,
	directivesSinceEpoch,
	noticeSinceEpoch,
	vendorChoiceSinceEpoch,
} from './epoch';
import type { StoredRecords } from './hydrate';

/** The parts of a storage read that reconciliation consults. */
export type StoredRead = Pick<
	StoredRecords,
	'records' | 'vendorSubject' | 'epoch'
>;

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

// ---------------------------------------------------------------------------
// Subjects
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
 * The subject to store with a merged record.
 *
 * The in-memory subject yields to the stored one when it is only a copy of
 * what this runtime last read from storage, or an id this runtime generated
 * on a save because it held none: a runtime opened before another one stored
 * a subject then joins that subject. Any other in-memory id came from the
 * server (init, prefetch or a save response) and wins, as does an identity
 * set by `identify()`. Fields the winner lacks are filled from the other.
 *
 * @param ours - The subject in memory.
 * @param stored - The subject storage holds now, or `null`.
 * @param oursYields - Whether the in-memory subject is a copy or generated.
 * @returns The subject to write.
 */
export const subjectToWrite = function subjectToWrite(
	ours: ConsentSubject | null,
	stored: ConsentSubject | null | undefined,
	oursYields: boolean
): ConsentSubject | null {
	if (!stored || Object.keys(stored).length === 0) {
		return ours;
	}
	if (!ours) {
		return { ...stored };
	}
	if (hasNewerIdentity(ours, stored) || !oursYields) {
		return { ...stored, ...ours };
	}
	return { ...ours, ...stored };
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

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
 * record storage still holds from this runtime: it never recreates a record
 * another runtime cleared, and never replaces one another runtime wrote.
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
		return !storedWinsTies &&
			stored !== null &&
			sameRecord(stored.categories, ours.categories)
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
 * subject-only rewrite lands only on a record storage still holds from
 * this runtime. An in-memory `null` never deletes a stored record.
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
			!storedWinsTies &&
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
 * wrote it. A kind is missing while it was never readable: its state is
 * unknown, which is different from absent.
 */
export type StorageFingerprints = Partial<Record<StoredRecordKind, string>>;

const fingerprint = function fingerprint(value: unknown): string {
	return JSON.stringify(canonical(value));
};

/** Fingerprints of readable storage holding none of the records. */
const ABSENT: Record<StoredRecordKind, string> = {
	choice: fingerprint(null),
	notice: fingerprint(null),
	privacy: fingerprint([]),
	vendors: fingerprint([null, null]),
};

/**
 * Fingerprints of the readable records in a storage read. The envelope's
 * print includes its subject; the vendor record's print includes the
 * subject the vendor record itself carries. An absent envelope prints the
 * same whatever subject the vendor record holds.
 *
 * @param read - A storage read; omitted records were unreadable.
 * @returns One fingerprint per readable record.
 */
export const fingerprintStoredRecords = function fingerprintStoredRecords(
	read: StoredRead
): StorageFingerprints {
	const { records: stored } = read;
	const prints: StorageFingerprints = {};
	if (stored.choice !== undefined) {
		prints.choice =
			stored.choice === null
				? ABSENT.choice
				: fingerprint([stored.choice, stored.subject ?? null]);
	}
	if (stored.noticeDismissal !== undefined) {
		prints.notice = fingerprint(stored.noticeDismissal);
	}
	if (stored.optOutDirectives !== undefined) {
		prints.privacy = fingerprint(stored.optOutDirectives);
	}
	if (stored.vendorChoice !== undefined) {
		prints.vendors = fingerprint([
			stored.vendorChoice,
			stored.vendorChoice ? read.vendorSubject : null,
		]);
	}
	return prints;
};

/** How storage moved for one record since this runtime last saw it. */
interface Movement {
	/** The record is readable and differs from what was last seen. */
	changed: (kind: StoredRecordKind) => boolean;
	/** A record last seen present is now readable and absent. */
	removed: (kind: StoredRecordKind) => boolean;
}

/** Whether a changed single-decision record should replace memory. */
const adoptNewer = function adoptNewer<RecordType>(
	current: RecordType | null,
	stored: RecordType | null,
	removed: boolean,
	timeOf: (record: RecordType) => number
): boolean {
	if (sameRecord(current, stored)) {
		return false;
	}
	if (stored === null) {
		return removed;
	}
	if (current === null) {
		return true;
	}
	return timeOf(stored) >= timeOf(current);
};

/**
 * Whether a stored subject should replace the one in memory, given the
 * time of the newest decision each side carries. A subject that yields (see
 * {@link subjectToWrite}) is replaced by a stored one at least as recent; an
 * id the server resolved only by a strictly newer one. An identity from
 * `identify()` is never replaced, and a missing stored subject replaces
 * nothing.
 */
const prefersStoredSubject = function prefersStoredSubject(
	memory: ConsentSubject | null,
	stored: ConsentSubject | null | undefined,
	storedAt: number,
	memoryAt: number,
	subjectYields: boolean
): stored is ConsentSubject {
	if (!stored || hasNewerIdentity(memory, stored)) {
		return false;
	}
	return subjectYields ? storedAt >= memoryAt : storedAt > memoryAt;
};

/**
 * The subject once the stored choice was removed. With no identity left in
 * storage the subject goes with the choice. A subject the vendor record
 * still carries follows the usual precedence, so it never replaces an id
 * the server resolved or an identity from `identify()` it should yield to.
 */
const subjectAfterRemoval = function subjectAfterRemoval(
	snapshot: ConsentSnapshot,
	stored: HydrationRecords,
	movement: Movement,
	subjectYields: boolean
): HydrationRecords['subject'] {
	if (!stored.subject) {
		return null;
	}
	return movement.changed('vendors') &&
		prefersStoredSubject(
			snapshot.subject,
			stored.subject,
			stored.vendorChoice?.confirmedAt ?? Number.NEGATIVE_INFINITY,
			snapshot.vendorChoice?.confirmedAt ?? Number.NEGATIVE_INFINITY,
			subjectYields
		)
		? stored.subject
		: undefined;
};

/**
 * The subject to apply, or `undefined` to keep the one in memory.
 *
 * The subject belongs to the record it was stored with: the envelope, or
 * the vendor record for a visitor whose only decision is about vendors. It
 * is only considered when that record changed in storage, so focus or an
 * unrelated key never moves the subject, and follows
 * {@link prefersStoredSubject}. Only the removal of the record that carried
 * it clears the subject.
 */
const reconcileSubject = function reconcileSubject(
	snapshot: ConsentSnapshot,
	stored: HydrationRecords,
	records: HydrationRecords,
	movement: Movement,
	subjectYields: boolean
): HydrationRecords['subject'] {
	const { explicitChoice, vendorChoice } = snapshot;
	let candidate: HydrationRecords['subject'];
	if (records.choice === null) {
		candidate = subjectAfterRemoval(snapshot, stored, movement, subjectYields);
	} else if (stored.choice) {
		const relevant = movement.changed('choice') || records.choice !== undefined;
		if (
			relevant &&
			prefersStoredSubject(
				snapshot.subject,
				stored.subject,
				latestDecisionAt(stored.choice),
				latestDecisionAt(explicitChoice),
				subjectYields
			)
		) {
			candidate = stored.subject;
		}
	} else if (explicitChoice === null && movement.changed('vendors')) {
		// No choice on either side, or an unreadable one: the vendor record
		// carries the subject.
		if (stored.choice === null && movement.removed('vendors')) {
			candidate = null;
		} else if (
			prefersStoredSubject(
				snapshot.subject,
				stored.subject,
				stored.vendorChoice?.confirmedAt ?? Number.NEGATIVE_INFINITY,
				vendorChoice?.confirmedAt ?? Number.NEGATIVE_INFINITY,
				subjectYields
			)
		) {
			candidate = stored.subject;
		}
	}
	return candidate !== undefined && !sameRecord(snapshot.subject, candidate)
		? candidate
		: undefined;
};

/** Choice records to apply: a per-category merge, or a clear. */
const reconcileChoice = function reconcileChoice(
	snapshot: ConsentSnapshot,
	stored: HydrationRecords,
	movement: Movement,
	subjectYields: boolean
): HydrationRecords {
	const records: HydrationRecords = {};
	const { explicitChoice } = snapshot;
	if (stored.choice === null) {
		if (movement.removed('choice') && explicitChoice !== null) {
			records.choice = null;
		}
	} else if (stored.choice) {
		// On equal times a decision another runtime stored since this one
		// last looked wins; otherwise the stored record is this runtime's own.
		const merged = movement.changed('choice')
			? mergeNewestChoice(stored.choice, explicitChoice)
			: mergeNewestChoice(explicitChoice, stored.choice);
		if (!sameRecord(merged, explicitChoice)) {
			records.choice = merged;
		}
	}
	const subject = reconcileSubject(
		snapshot,
		stored,
		records,
		movement,
		subjectYields
	);
	if (subject !== undefined) {
		records.subject = subject;
	}
	return records;
};

/** Directive list to apply: the union, or a clear. */
const reconcileDirectives = function reconcileDirectives(
	current: readonly PrivacyOptOut[],
	stored: readonly PrivacyOptOut[] | undefined,
	movement: Movement
): readonly PrivacyOptOut[] | undefined {
	if (!stored) {
		return undefined;
	}
	if (stored.length === 0) {
		// An emptied list is a clear, but only once storage lost it.
		return movement.removed('privacy') && current.length > 0 ? [] : undefined;
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
 * The in-memory records as the clear epoch leaves them: decisions confirmed
 * before `epoch` are void. When the epoch moved past the one this runtime
 * last saw, another runtime cleared the records and the subject in memory
 * belongs to the cleared history, so it does not survive either, unless a
 * save made after the epoch generated it (`subjectSurvives`).
 */
const sinceEpoch = function sinceEpoch(
	snapshot: ConsentSnapshot,
	epoch: number,
	clearMissed: boolean,
	subjectSurvives: boolean
): ConsentSnapshot {
	return {
		...snapshot,
		explicitChoice: choiceSinceEpoch(
			snapshot.explicitChoice,
			epoch,
			!clearMissed
		),
		noticeDismissal: noticeSinceEpoch(snapshot.noticeDismissal, epoch),
		optOutDirectives: directivesSinceEpoch(snapshot.optOutDirectives, epoch),
		subject: clearMissed && !subjectSurvives ? null : snapshot.subject,
		vendorChoice: vendorChoiceSinceEpoch(snapshot.vendorChoice, epoch),
	};
};

const EPOCH_FIELDS = [
	['choice', 'explicitChoice'],
	['noticeDismissal', 'noticeDismissal'],
	['optOutDirectives', 'optOutDirectives'],
	['subject', 'subject'],
	['vendorChoice', 'vendorChoice'],
] as const;

/**
 * Adds the records the epoch voided in memory and reconciliation left
 * alone, so the kernel drops them too.
 */
const applyVoided = function applyVoided(
	records: HydrationRecords,
	view: ConsentSnapshot,
	snapshot: ConsentSnapshot
): void {
	for (const [recordKey, snapshotKey] of EPOCH_FIELDS) {
		if (
			records[recordKey] === undefined &&
			view[snapshotKey] !== snapshot[snapshotKey]
		) {
			Object.assign(records, { [recordKey]: view[snapshotKey] });
		}
	}
};

/**
 * Records to apply so the kernel reflects what storage holds, by the rules
 * at the top of this file. Only differences are returned, so an unchanged
 * read never touches the kernel or notifies anyone.
 *
 * @param snapshot - The kernel's current snapshot.
 * @param read - A storage read; omitted records were unreadable.
 * @param seen - Fingerprints from the previous read or write.
 * @param now - Read time, used as the evaluation time.
 * @param subjectYields - Whether the in-memory subject yields to a stored
 * one (see {@link subjectToWrite}).
 * @param unadopted - Records this runtime wrote with parts memory lacks;
 * they count as changed even when storage still holds what was written.
 * @param memoryEpoch - The clear epoch the in-memory records belong to.
 * @param subjectBornAfterEpoch - Whether a save made after the stored epoch
 * generated the in-memory subject, so it survives a clear this runtime
 * missed.
 * @returns The records to hydrate and the fingerprints to keep.
 */
export const selectReconciledRecords = function selectReconciledRecords(
	snapshot: ConsentSnapshot,
	read: StoredRead,
	seen: StorageFingerprints,
	now: number,
	subjectYields: boolean,
	unadopted: ReadonlySet<StoredRecordKind>,
	memoryEpoch: number,
	subjectBornAfterEpoch = false
): ReconciledRecords {
	const { records: stored } = read;
	const clearMissed = read.epoch > memoryEpoch;
	// Reconcile against memory as the clear left it, then drop from the
	// kernel whatever the clear voided.
	const view = sinceEpoch(
		snapshot,
		read.epoch,
		clearMissed,
		subjectBornAfterEpoch
	);
	const current = fingerprintStoredRecords(read);
	const movement: Movement = {
		changed: (kind) =>
			current[kind] !== undefined &&
			(current[kind] !== seen[kind] || unadopted.has(kind)),
		removed: (kind) =>
			current[kind] === ABSENT[kind] &&
			seen[kind] !== undefined &&
			seen[kind] !== ABSENT[kind],
	};
	const records = reconcileChoice(
		view,
		stored,
		movement,
		subjectYields || clearMissed
	);

	if (
		movement.changed('vendors') &&
		adoptNewer(
			view.vendorChoice,
			stored.vendorChoice ?? null,
			movement.removed('vendors'),
			(record) => record.confirmedAt
		)
	) {
		records.vendorChoice = stored.vendorChoice ?? null;
	}

	if (
		movement.changed('notice') &&
		adoptNewer(
			view.noticeDismissal,
			stored.noticeDismissal ?? null,
			movement.removed('notice'),
			(record) => record.dismissedAt
		)
	) {
		records.noticeDismissal = stored.noticeDismissal ?? null;
	}

	const directives = reconcileDirectives(
		view.optOutDirectives,
		stored.optOutDirectives,
		movement
	);
	if (directives) {
		records.optOutDirectives = directives;
	}
	applyVoided(records, view, snapshot);

	return {
		records: Object.keys(records).length > 0 ? { ...records, now } : null,
		seen: { ...seen, ...current },
	};
};
