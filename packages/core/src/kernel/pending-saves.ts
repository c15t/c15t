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
import { PENDING_SAVES_STORAGE_KEY } from '../libs/storage-keys';
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
		!isConfirmedCoverage(value.confirmed) ||
		!validateExplicitChoice(value.choice, Date.now()).ok
	) {
		return false;
	}

	const validModel =
		value.model === null ||
		value.model === 'opt-in' ||
		value.model === 'opt-out' ||
		value.model === 'iab';
	const validUiSource =
		value.uiSource === null ||
		value.uiSource === 'none' ||
		value.uiSource === 'banner' ||
		value.uiSource === 'dialog';
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
		(value.policySnapshotToken === null ||
			typeof value.policySnapshotToken === 'string') &&
		(value.tcString === undefined ||
			value.tcString === null ||
			typeof value.tcString === 'string')
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
	return selectSavePayload(
		older,
		(category) => !Object.hasOwn(newer.confirmed.categories, category)
	);
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

const recordReplayResult = function recordReplayResult(
	storage: Storage,
	entry: PendingSaveEntry,
	ok: boolean
): void {
	const next: PendingSaveEntry[] = [];
	for (const candidate of readPendingSaves(storage)) {
		if (!isSamePendingSave(candidate, entry)) {
			next.push(candidate);
			continue;
		}

		const attempts = candidate.attempts + 1;
		if (!ok && attempts < MAX_REPLAY_ATTEMPTS) {
			next.push({ ...candidate, attempts });
		}
	}
	writePendingSaves(storage, next);
};

interface PendingSaveQueueOptions {
	emit: (event: KernelEvent) => void;
	save: NonNullable<KernelTransport['save']>;
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
	 * Replay one entry. Returns `null` when another tab already replayed or
	 * dropped it, otherwise the replay outcome.
	 *
	 * The lock is only held around the queue reads and writes, never across
	 * the network call: a hung transport must not block other tabs from
	 * queueing their own saves. Two tabs may therefore replay the same entry,
	 * which is safe because the persisted `givenAt` makes the backend derive
	 * the same consent id for both.
	 */
	const replayEntry = async function replayEntry(
		storage: Storage,
		entry: PendingSaveEntry
	): Promise<boolean | null> {
		const stillQueued = await withQueueLock(() =>
			readPendingSaves(storage).some((candidate) =>
				isSamePendingSave(candidate, entry)
			)
		);
		if (!stillQueued) {
			return null;
		}

		let ok = false;
		try {
			({ ok } = await options.save(entry.payload));
		} catch {
			// Keep the entry for a later init or online event.
		}
		await withQueueLock(() => recordReplayResult(storage, entry, ok));
		return ok;
	};

	const runReplay = async function runReplay(): Promise<boolean> {
		const storage = getLocalStorage();
		if (!storage) {
			return false;
		}

		const pending = await withQueueLock(() => readPendingSaves(storage));
		for (const entry of pending) {
			// Preserve save order and avoid burst replays against the consent
			// endpoint.
			// oxlint-disable-next-line no-await-in-loop
			const ok = await replayEntry(storage, entry);
			if (ok === null) {
				continue;
			}
			options.emit({
				ok,
				subjectId: entry.payload.subjectId,
				type: 'save:replayed',
			});
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

	return { discard, enqueue, replay };
};
