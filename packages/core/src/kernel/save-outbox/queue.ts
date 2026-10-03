/**
 * The stored queue of the save outbox, loaded on demand.
 *
 * The outbox imports this module the first time it has to read the queue:
 * a replay or a discard that finds something stored, a queue write, or a
 * subject reassignment. A visitor with nothing queued never loads it. If it
 * cannot load (the network that just failed a save is down), the outbox
 * appends the save to the stored list itself and this module normalizes the
 * list on its next read.
 *
 * Stored entries come back from storage another release or another tab
 * may have written, so every read validates them and drops what it cannot
 * replay: malformed entries, entries older than a week, and entries that
 * used up their attempts.
 */

import { OPTIONAL_CONSENT_CATEGORIES } from '../../consent-record/types';
import {
	isPlainRecord,
	validateExplicitChoice,
} from '../../consent-record/validation';
import { isExperimentAssignment } from '../../libs/experiment-record';
import { generateSubjectId } from '../../libs/generate-subject-id';
import {
	isConsentSaveRejection,
	isSubjectConflict,
} from '../../transports/save-rejection';
import type { ConsentSubject, KernelTransport, SavePayload } from '../../types';
import type { KernelRuntime } from '../runtime';
import type { OutboxTransaction, SaveOutboxStore } from './store';
import { supersededBy, withoutSuperseded, withSubjectId } from './supersession';
import type { PendingSaveEntry } from './supersession';

const MAX_PENDING_SAVE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REPLAY_ATTEMPTS = 10;

/** A subject id the backend refused, and the one this browser moved to. */
interface SubjectReassignment {
	from: string;
	to: string;
	at: number;
}

// ---------------------------------------------------------------------------
// Stored entry validation
// ---------------------------------------------------------------------------

const isBooleanRecord = function isBooleanRecord(value: unknown): boolean {
	return (
		isPlainRecord(value) &&
		Object.values(value).every((item) => typeof item === 'boolean')
	);
};

const isScalarRecord = function isScalarRecord(value: unknown): boolean {
	return (
		isPlainRecord(value) &&
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
	if (!isPlainRecord(value) || typeof value.externalId !== 'string') {
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
		isPlainRecord(value) &&
		isOptionalString(value.subjectId) &&
		isOptionalString(value.externalId) &&
		isOptionalString(value.identityProvider)
	);
};

const isConfirmedCoverage = function isConfirmedCoverage(
	value: unknown
): boolean {
	if (!isPlainRecord(value) || !isPlainRecord(value.categories)) {
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
	(isPlainRecord(value) &&
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
		(isPlainRecord(value) &&
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
	if (!isPlainRecord(value)) {
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
		isPlainRecord(value.overrides) &&
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
		isPlainRecord(value) &&
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
		isPlainRecord(value) &&
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
const normalizePendingSaves = function normalizePendingSaves(
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
const readPendingSaves = function readPendingSaves(
	tx: OutboxTransaction,
	now = Date.now()
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
const readReassignments = function readReassignments(
	tx: OutboxTransaction,
	now = Date.now()
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

const isSamePendingSave = function isSamePendingSave(
	left: PendingSaveEntry,
	right: PendingSaveEntry
): boolean {
	return (
		left.queuedAt === right.queuedAt &&
		left.attempts === right.attempts &&
		JSON.stringify(left.payload) === JSON.stringify(right.payload)
	);
};

/** `retry` keeps the entry for another attempt; the others remove it. */
type ReplayOutcome = 'saved' | 'retry' | 'rejected';

export interface QueueWorkerOptions {
	runtime: KernelRuntime;
	store: SaveOutboxStore;
}

/** The queue operations of one outbox. */
export interface QueueWorker {
	/** Queue what `current()` still holds, read inside the transaction. */
	enqueue: (current: () => SavePayload | null) => Promise<void>;
	/** Drop the queued saves `payload` superseded. */
	discard: (payload: SavePayload) => Promise<void>;
	/** Move the visitor off a subject id the backend refused. */
	reassignSubject: (from: string) => Promise<string | null>;
	/** Replay every queued entry; resolves to whether any is left. */
	replay: (save: NonNullable<KernelTransport['save']>) => Promise<boolean>;
}

/**
 * Create the queue operations of one outbox.
 */
// oxlint-disable-next-line max-lines-per-function -- Queueing, replay and reassignment share the subject claims through closures.
export const createQueueWorker = function createQueueWorker({
	runtime,
	store,
}: QueueWorkerOptions): QueueWorker {
	const { batch, commit, emit, getSnapshot } = runtime;
	// Subject ids this kernel replaced after the backend refused them as
	// another tenant's, old to the claim for the new one. A live save and a
	// replay can both hit the same refusal; this sends both to one new id
	// instead of minting two. Each claim belongs to the records generation it
	// was made in: after a clear, reusing it would tie the visitor's new
	// history to the subject they reset away from.
	const reassignedSubjects = new Map<
		string,
		{ claim: Promise<string | null>; generation: number }
	>();
	let activeReplay: Promise<boolean> | null = null;

	const currentSubjectId = () => getSnapshot().subject?.subjectId;

	/** Queue what `current()` still holds, read inside the transaction. */
	const enqueue = function enqueue(
		current: () => SavePayload | null
	): Promise<void> {
		return store.transact((tx) => {
			const payload = current();
			if (!payload) {
				return;
			}
			const now = Date.now();
			const pending = readPendingSaves(tx, now);
			pending.push({ attempts: 0, payload, queuedAt: now });
			tx.write('saves', normalizePendingSaves(pending, now));
		});
	};

	/**
	 * Drop the queued saves `payload` superseded, so a later replay cannot
	 * overwrite the newer receipts with stale ones. Queued actions for other
	 * categories keep waiting for their own replay.
	 */
	const discard = function discard(payload: SavePayload): Promise<void> {
		return store.transact((tx) => {
			const pending = readPendingSaves(tx);
			const remaining = pending.flatMap((candidate) => {
				const kept = withoutSuperseded(
					candidate.payload,
					supersededBy(candidate.payload, payload)
				);
				return kept ? [{ ...candidate, payload: kept }] : [];
			});
			if (JSON.stringify(remaining) !== JSON.stringify(pending)) {
				tx.write('saves', remaining);
			}
		});
	};

	// -- Subject reassignment --------------------------------------------------

	/**
	 * The subject id that replaces `from` in this browser, shared by every
	 * kernel on the store. The first caller records `proposed`; any later
	 * one gets the id already recorded. Two tabs refused at the same moment
	 * would otherwise each pick an id, and one of them would persist a
	 * subject the backend holds no consent for.
	 *
	 * Every queued save for `from` moves to the returned id in the same
	 * transaction, so none is replayed under the refused one. Calling it
	 * again moves saves queued under `from` since.
	 *
	 * `isCurrent` is asked inside the transaction, before anything is
	 * written. Waiting for the store can take long enough for the visitor to
	 * be cleared or switched; then nothing is recorded or moved and this
	 * resolves to `null`, so saves that no longer belong to the visitor stay
	 * where they were.
	 */
	const claimReassignment = function claimReassignment(
		from: string,
		proposed: string,
		isCurrent: () => boolean
	): Promise<string | null> {
		return store.transact((tx) => {
			if (!isCurrent()) {
				return null;
			}
			const now = Date.now();
			const reassignments = readReassignments(tx, now);
			const recorded = reassignments.find((item) => item.from === from);
			const to = recorded?.to ?? proposed;
			if (!recorded) {
				tx.write('reassignments', [...reassignments, { at: now, from, to }]);
			}

			const pending = readPendingSaves(tx, now);
			if (pending.some((entry) => entry.payload.subjectId === from)) {
				const moved = pending.map((entry) =>
					entry.payload.subjectId === from
						? { ...entry, payload: withSubjectId(entry.payload, to) }
						: entry
				);
				tx.write('saves', normalizePendingSaves(moved, now));
			}
			return to;
		});
	};

	/**
	 * A save queued under `from` after this browser had already moved the
	 * visitor off it: another tab was still on `from`, or the page reloaded
	 * onto the new subject before the replay. The recorded reassignment says
	 * where it belongs; the save follows it only when that is the visitor's
	 * subject now. A clear removes the record, so a save from before a reset
	 * is dropped rather than tied to the new history. Reading the record
	 * records nothing, so a save for a subject this browser never reassigned
	 * cannot start a new reassignment.
	 */
	const followRecordedReassignment = async function followRecordedReassignment(
		from: string
	): Promise<string | null> {
		const to = await store.transact(
			(tx) => readReassignments(tx).find((item) => item.from === from)?.to
		);
		if (to === undefined || currentSubjectId() !== to) {
			return null;
		}
		// Moves the queued saves; the record already names `to`.
		const moved = await claimReassignment(
			from,
			to,
			() => currentSubjectId() === to
		);
		return moved === null ? null : to;
	};

	/**
	 * Give the visitor a new subject id after the backend refused `from`
	 * with `SUBJECT_CONFLICT`: on a database several tenants share, another
	 * tenant already owns it. Resending under the same id is refused every
	 * time, so without this the visitor's choices would never be recorded.
	 *
	 * The new id is claimed through the store, so every tab that hits the
	 * refusal moves to the same one, and queued saves for `from` move with
	 * it. It is committed like a subject the server resolved, so persistence
	 * writes it over the stored one. A visitor set back to `from` later moves
	 * to the same id again, unless the stored consent records were cleared in
	 * between.
	 *
	 * Resolves to `null` when `from` is no longer this visitor's subject and
	 * no reassignment of it leads to the current one: a save for a subject
	 * since replaced or cleared is not moved onto whoever holds the snapshot
	 * now.
	 */
	const reassignSubject = async function reassignSubject(
		from: string
	): Promise<string | null> {
		const generation = runtime.getGeneration();
		const cached = reassignedSubjects.get(from);
		const earlier =
			cached?.generation === generation ? cached.claim : undefined;
		if (earlier === undefined && currentSubjectId() !== from) {
			return followRecordedReassignment(from);
		}
		// Still the visitor this reassignment started for: on `from`, or
		// already moved to its replacement. The subject alone decides. The
		// records generation also advances when the same visitor's choice
		// changes (a server merge, another tab's save), and a clear or a
		// switch always moves the subject.
		const unchanged = (to?: string) => () => {
			const id = currentSubjectId();
			return id === from || (to !== undefined && id === to);
		};
		let claim = earlier;
		if (claim === undefined) {
			claim = claimReassignment(from, generateSubjectId(), unchanged());
			reassignedSubjects.set(from, { claim, generation });
		}
		const to = await claim;
		if (to === null) {
			return null;
		}
		// Moves saves queued under `from` since the first claim.
		if (
			earlier !== undefined &&
			(await claimReassignment(from, to, unchanged(to))) === null
		) {
			return null;
		}

		const current = getSnapshot().subject;
		if (current?.subjectId === to) {
			return to;
		}
		if (current?.subjectId !== from) {
			return null;
		}
		const subject: ConsentSubject = { ...current, subjectId: to };
		batch(() => {
			commit({ subject });
			emit({ snapshot: getSnapshot(), type: 'subject:resolved' });
		});
		return to;
	};

	// -- Replay ----------------------------------------------------------------

	/**
	 * Replay one entry. Returns `null` when another kernel already replayed
	 * or dropped it, otherwise the replay outcome. A save the backend refused
	 * for good (a `ConsentSaveRejectedError`) leaves the queue at once
	 * instead of using up its attempts.
	 *
	 * The exception is a `SUBJECT_CONFLICT`: the subject id belongs to
	 * another tenant, not the choice. The visitor moves to a new subject,
	 * which rekeys the queue, and the entry is replayed once more under the
	 * new id. The move is recorded in `moved` so the rest of this run replays
	 * its other saves under the new id too. `moved` is `null` for the second
	 * attempt, so a backend that refuses every id cannot keep the loop going.
	 */
	const replayEntry = async function replayEntry(
		save: NonNullable<KernelTransport['save']>,
		entry: PendingSaveEntry,
		moved: Map<string, string> | null
	): Promise<{ ok: boolean; rejected?: string; subjectId: string } | null> {
		const stillQueued = await store.transact((tx) =>
			readPendingSaves(tx).some((candidate) =>
				isSamePendingSave(candidate, entry)
			)
		);
		if (!stillQueued) {
			return null;
		}

		let outcome: ReplayOutcome = 'retry';
		let rejected: string | undefined;
		try {
			const { ok } = await save(entry.payload);
			outcome = ok ? 'saved' : 'retry';
		} catch (error) {
			if (moved && isSubjectConflict(error)) {
				const subjectId = await reassignSubject(entry.payload.subjectId);
				if (subjectId !== null) {
					moved.set(entry.payload.subjectId, subjectId);
					// The queue already holds this entry under the new id.
					return replayEntry(
						save,
						{ ...entry, payload: withSubjectId(entry.payload, subjectId) },
						null
					);
				}
			}
			// Anything else keeps the entry for a later init or online event.
			if (isConsentSaveRejection(error)) {
				outcome = 'rejected';
				rejected = error.code;
			}
		}
		await store.transact((tx) => {
			const next: PendingSaveEntry[] = [];
			for (const candidate of readPendingSaves(tx)) {
				if (!isSamePendingSave(candidate, entry)) {
					next.push(candidate);
					continue;
				}
				const attempts = candidate.attempts + 1;
				if (outcome === 'retry' && attempts < MAX_REPLAY_ATTEMPTS) {
					next.push({ ...candidate, attempts });
				}
			}
			tx.write('saves', next);
		});
		const { subjectId } = entry.payload;
		return rejected === undefined
			? { ok: outcome === 'saved', subjectId }
			: { ok: false, rejected, subjectId };
	};

	/** Replay every queued entry; resolves to whether any is left. */
	const runReplay = async function runReplay(
		save: NonNullable<KernelTransport['save']>
	): Promise<boolean> {
		const pending = await store.transact((tx) => readPendingSaves(tx));
		// Subjects reassigned during this run. The queue has already moved
		// their saves, so the entries read above are looked up under the new
		// id rather than skipped as gone.
		const moved = new Map<string, string>();
		for (const queued of pending) {
			const to = moved.get(queued.payload.subjectId);
			const entry =
				to === undefined
					? queued
					: { ...queued, payload: withSubjectId(queued.payload, to) };
			// Preserve save order and avoid burst replays against the consent
			// endpoint.
			// oxlint-disable-next-line no-await-in-loop
			const result = await replayEntry(save, entry, moved);
			if (result !== null) {
				// The subject the save finally went out under, which differs from
				// the queued one after a reassignment.
				emit({ ...result, type: 'save:replayed' });
			}
		}
		return store.transact((tx) => readPendingSaves(tx).length > 0);
	};

	const runSharedReplay = async function runSharedReplay(
		save: NonNullable<KernelTransport['save']>
	): Promise<boolean> {
		try {
			return await runReplay(save);
		} finally {
			activeReplay = null;
		}
	};

	return {
		discard,
		enqueue,
		reassignSubject,
		replay(save) {
			activeReplay ??= runSharedReplay(save);
			return activeReplay;
		},
	};
};
