/**
 * Browser-backed queue for consent saves that the transport could not accept.
 *
 * Storage is best-effort. Server runtimes, blocked localStorage, malformed data,
 * and quota errors all degrade to an empty queue without affecting local consent.
 *
 * Every read-modify-write of the queue runs under a Web Locks API lock when
 * the browser exposes one, so two tabs cannot overwrite each other's entries
 * or replay the same entry twice. Without the API the queue falls back to
 * unsynchronized access.
 */

import { OPTIONAL_CONSENT_CATEGORIES } from '../consent-record/types';
import { validateExplicitChoice } from '../consent-record/validation';
import { isExperimentAssignment } from '../libs/experiment-record';
import {
	PENDING_SAVES_STORAGE_KEY,
	SUBJECT_REASSIGNMENTS_STORAGE_KEY,
} from '../libs/storage-keys';
import {
	isConsentSaveRejection,
	isSubjectConflict,
} from '../transports/save-rejection';
import type { KernelEvent, KernelTransport, SavePayload } from '../types';
import { selectSavePayload } from './save-selection';

const MAX_PENDING_SAVE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REPLAY_ATTEMPTS = 10;

interface PendingSaveEntry {
	payload: SavePayload;
	queuedAt: number;
	attempts: number;
}

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

const isOptionalExperiment = function isOptionalExperiment(
	value: unknown
): boolean {
	return value === undefined || isExperimentAssignment(value);
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
		isOptionalExperiment(value.experiment) &&
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

const getLocalStorage = function getLocalStorage(): Storage | null {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		return window.localStorage;
	} catch {
		return null;
	}
};

const getLockManager = function getLockManager(): LockManager | null {
	if (typeof navigator === 'undefined') {
		return null;
	}

	try {
		const { locks } = navigator as Partial<Navigator>;
		return locks && typeof locks.request === 'function' ? locks : null;
	} catch {
		return null;
	}
};

/**
 * Run a queue update under the cross-tab queue lock.
 *
 * Callbacks must not throw: a rejection here is treated as a lock failure
 * (insecure context, aborted request) and the callback runs unsynchronized
 * so the queue update is never dropped.
 */
const withQueueLock = async function withQueueLock<Value>(
	run: () => Value | Promise<Value>
): Promise<Value> {
	const locks = getLockManager();
	if (!locks) {
		return run();
	}

	try {
		return (await locks.request(PENDING_SAVES_STORAGE_KEY, run)) as Value;
	} catch {
		return run();
	}
};

const writePendingSaves = function writePendingSaves(
	storage: Storage,
	entries: PendingSaveEntry[]
): void {
	try {
		if (entries.length === 0) {
			storage.removeItem(PENDING_SAVES_STORAGE_KEY);
			return;
		}
		storage.setItem(PENDING_SAVES_STORAGE_KEY, JSON.stringify(entries));
	} catch {
		// Saving consent locally must still succeed when localStorage is blocked.
	}
};

/** Remove only the older categories covered by this newer action. */
const subtractSuperseded = function subtractSuperseded(
	older: SavePayload,
	newer: SavePayload
): SavePayload | null {
	if (
		older.subjectId !== newer.subjectId ||
		older.confirmed.actionAt > newer.confirmed.actionAt
	) {
		return older;
	}
	const selected = selectSavePayload(
		older,
		(category) => !Object.hasOwn(newer.confirmed.categories, category)
	);
	if (
		!selected ||
		newer.vendorChoice === undefined ||
		selected.vendorChoice === undefined
	) {
		return selected;
	}
	// The newer action carries the complete vendor grant map, so the older
	// one has nothing left to say about vendors.
	const { vendorChoice: _superseded, ...remaining } = selected;
	return Object.keys(remaining.confirmed.categories).length > 0
		? remaining
		: null;
};

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
				payload = subtractSuperseded(payload, later.payload);
			}
		}
		return payload ? [{ ...entry, payload }] : [];
	});
};

const readPendingSaves = function readPendingSaves(
	storage: Storage
): PendingSaveEntry[] {
	try {
		const serialized = storage.getItem(PENDING_SAVES_STORAGE_KEY);
		if (!serialized) {
			return [];
		}
		const parsed: unknown = JSON.parse(serialized);
		const normalized = normalizePendingSaves(parsed, Date.now());
		if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
			writePendingSaves(storage, normalized);
		}
		return normalized;
	} catch {
		writePendingSaves(storage, []);
		return [];
	}
};

/** A subject id the backend refused, and the one this browser moved to. */
interface SubjectReassignment {
	from: string;
	to: string;
	at: number;
}

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

/**
 * Stored reassignments, dropping malformed ones and any older than a queued
 * save may live: past that, no save for the old id can still be waiting.
 */
const readReassignments = function readReassignments(
	storage: Storage,
	now: number
): SubjectReassignment[] {
	try {
		const parsed: unknown = JSON.parse(
			storage.getItem(SUBJECT_REASSIGNMENTS_STORAGE_KEY) ?? '[]'
		);
		const cutoff = now - MAX_PENDING_SAVE_AGE_MS;
		return Array.isArray(parsed)
			? parsed.filter(
					(item): item is SubjectReassignment =>
						isSubjectReassignment(item) && item.at >= cutoff
				)
			: [];
	} catch {
		return [];
	}
};

const writeReassignments = function writeReassignments(
	storage: Storage,
	reassignments: SubjectReassignment[]
): void {
	try {
		if (reassignments.length === 0) {
			storage.removeItem(SUBJECT_REASSIGNMENTS_STORAGE_KEY);
			return;
		}
		storage.setItem(
			SUBJECT_REASSIGNMENTS_STORAGE_KEY,
			JSON.stringify(reassignments)
		);
	} catch {
		// Without storage each tab picks its own id; the save still goes out.
	}
};

/**
 * The same save under another subject id. Keys keep their positions, so a
 * queued entry rewritten by {@link createPendingSaveQueue}'s `rekey` still
 * serializes identically to one rebuilt from the original payload.
 *
 * @internal
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

const recordReplayResult = function recordReplayResult(
	storage: Storage,
	entry: PendingSaveEntry,
	outcome: ReplayOutcome
): void {
	const next: PendingSaveEntry[] = [];
	for (const candidate of readPendingSaves(storage)) {
		if (!isSamePendingSave(candidate, entry)) {
			next.push(candidate);
			continue;
		}

		const attempts = candidate.attempts + 1;
		if (outcome === 'retry' && attempts < MAX_REPLAY_ATTEMPTS) {
			next.push({ ...candidate, attempts });
		}
	}
	writePendingSaves(storage, next);
};

interface PendingSaveQueueOptions {
	emit: (event: KernelEvent) => void;
	save: NonNullable<KernelTransport['save']>;
	/**
	 * Give the visitor a new subject id after the backend refused `from` as
	 * another tenant's. Resolves to the new id, or `null` when `from` is no
	 * longer the visitor's subject and the save cannot move.
	 */
	reassignSubject?: (from: string) => Promise<string | null>;
}

/**
 * Create the failed-save queue used by one kernel.
 *
 * @internal
 */
export const createPendingSaveQueue = function createPendingSaveQueue(
	options: PendingSaveQueueOptions
) {
	let activeReplay: Promise<boolean> | null = null;

	const enqueue = async function enqueue(payload: SavePayload): Promise<void> {
		const storage = getLocalStorage();
		if (!storage) {
			return;
		}

		await withQueueLock(() => {
			const pending = readPendingSaves(storage);
			pending.push({ attempts: 0, payload, queuedAt: Date.now() });
			writePendingSaves(storage, normalizePendingSaves(pending, Date.now()));
		});
	};

	/**
	 * Drop queued saves a newer accepted save superseded, so a later replay
	 * cannot overwrite the newer receipts with stale ones. Queued actions
	 * for other categories keep waiting for their own replay.
	 */
	const discard = async function discard(payload: SavePayload): Promise<void> {
		const storage = getLocalStorage();
		if (!storage) {
			return;
		}

		await withQueueLock(() => {
			const pending = readPendingSaves(storage);
			const remaining = pending.flatMap((candidate) => {
				const selected = subtractSuperseded(candidate.payload, payload);
				return selected ? [{ ...candidate, payload: selected }] : [];
			});
			if (JSON.stringify(remaining) !== JSON.stringify(pending)) {
				writePendingSaves(storage, remaining);
			}
		});
	};

	/**
	 * The subject id that replaces `from` in this browser, shared by every
	 * tab. The first caller records `proposed`; any later one, in this tab or
	 * another, gets the id already recorded. Two tabs refused at the same
	 * moment would otherwise each pick an id, and one of them would persist a
	 * subject the backend holds no consent for.
	 *
	 * Every queued save for `from` moves to the returned id in the same
	 * locked step, so none is replayed under the refused one. Calling it again
	 * moves saves queued under `from` since.
	 */
	const claimReassignment = function claimReassignment(
		from: string,
		proposed: string
	): Promise<string> {
		const storage = getLocalStorage();
		if (!storage) {
			return Promise.resolve(proposed);
		}

		return withQueueLock(() => {
			const now = Date.now();
			const reassignments = readReassignments(storage, now);
			const recorded = reassignments.find((item) => item.from === from);
			const to = recorded?.to ?? proposed;
			if (!recorded) {
				writeReassignments(storage, [...reassignments, { at: now, from, to }]);
			}

			const pending = readPendingSaves(storage);
			if (pending.some((entry) => entry.payload.subjectId === from)) {
				const moved = pending.map((entry) =>
					entry.payload.subjectId === from
						? { ...entry, payload: withSubjectId(entry.payload, to) }
						: entry
				);
				writePendingSaves(storage, normalizePendingSaves(moved, now));
			}
			return to;
		});
	};

	/**
	 * Replay one entry. Returns `null` when another tab already replayed or
	 * dropped it, otherwise the replay outcome. A save the backend refused
	 * for good (a `ConsentSaveRejectedError`) leaves the queue at once
	 * instead of using up its attempts.
	 *
	 * The exception is a `SUBJECT_CONFLICT`: the subject id belongs to
	 * another tenant, not the choice. The kernel reassigns the subject, which
	 * rekeys the queue, and the entry is replayed once more under the new id.
	 * The move is recorded in `moved` so the rest of this run replays its
	 * other saves under the new id too. `moved` is `null` for the second
	 * attempt, so a backend that refuses every id cannot keep the loop going.
	 *
	 * The lock is only held around the queue reads and writes, never across
	 * the network call: a hung transport must not block other tabs from
	 * queueing their own saves. Two tabs may therefore replay the same entry,
	 * which is safe because the persisted `givenAt` makes the backend derive
	 * the same consent id for both.
	 */
	const replayEntry = async function replayEntry(
		storage: Storage,
		entry: PendingSaveEntry,
		moved: Map<string, string> | null
	): Promise<{ ok: boolean; rejected?: string; subjectId: string } | null> {
		const stillQueued = await withQueueLock(() =>
			readPendingSaves(storage).some((candidate) =>
				isSamePendingSave(candidate, entry)
			)
		);
		if (!stillQueued) {
			return null;
		}

		let outcome: ReplayOutcome = 'retry';
		let rejected: string | undefined;
		try {
			const { ok } = await options.save(entry.payload);
			outcome = ok ? 'saved' : 'retry';
		} catch (error) {
			if (moved && isSubjectConflict(error) && options.reassignSubject) {
				const subjectId = await options.reassignSubject(
					entry.payload.subjectId
				);
				if (subjectId !== null) {
					moved.set(entry.payload.subjectId, subjectId);
					// The queue already holds this entry under the new id.
					return replayEntry(
						storage,
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
		await withQueueLock(() => recordReplayResult(storage, entry, outcome));
		const { subjectId } = entry.payload;
		return rejected === undefined
			? { ok: outcome === 'saved', subjectId }
			: { ok: false, rejected, subjectId };
	};

	const runReplay = async function runReplay(): Promise<boolean> {
		const storage = getLocalStorage();
		if (!storage) {
			return false;
		}

		const pending = await withQueueLock(() => readPendingSaves(storage));
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
			const result = await replayEntry(storage, entry, moved);
			if (result === null) {
				continue;
			}
			// The subject the save finally went out under, which differs from
			// the queued one after a reassignment.
			options.emit({ ...result, type: 'save:replayed' });
		}

		const remaining = await withQueueLock(() => readPendingSaves(storage));
		return remaining.length > 0;
	};

	const replay = async function replay(): Promise<boolean> {
		if (activeReplay) {
			return activeReplay;
		}

		activeReplay = runReplay();
		try {
			return await activeReplay;
		} finally {
			activeReplay = null;
		}
	};

	return { claimReassignment, discard, enqueue, replay };
};
