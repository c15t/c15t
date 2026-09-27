/**
 * `@c15t/core/modules/persistence`
 *
 * Kernel-consuming persistence module. Reads stored records on mount
 * (`hydrate`) and writes back on explicit kernel events.
 *
 * Concerns are split across siblings:
 * - `types.ts`          — public type definitions.
 * - `record-codec.ts`   — versioned codecs for every stored record.
 * - `record-storage.ts` — raw candidate reads, selection, writes, clear.
 * - `hydrate.ts`        — read path and the SSR seed reader.
 * - `write.ts`          — write path.
 * - `schedule.ts`       — macrotask-debounced write scheduler.
 * - `index.ts`          — this file: subscription wiring + lifecycle.
 *
 * Invariants:
 * - Hydration runs synchronously inside `createPersistence` so the
 *   caller can block first paint until stored records are applied. It
 *   reads cookies and localStorage, so call it in the browser only.
 * - Hydration is read-only and never creates a choice. Kernel changes it
 *   causes never schedule a write, so startup does not renew a receipt or
 *   recreate a missing cookie or localStorage mirror. A `hydrate()` call
 *   flushes any queued write first.
 * - Choice envelope writes follow `choice:recorded` and `subject:resolved`.
 *   The vendor record follows `subject:resolved` too, since it carries the
 *   subject for a visitor with no category choice yet.
 *   A canonical subject acknowledgement preserves every receipt timestamp.
 *   Separate writes follow
 *   `notice:dismissed` (the notice record and its cookie projection),
 *   `privacy:opt-out` (the privacy record and its cookie projection) and
 *   `vendors:recorded` (the vendor denial list and its cookie projection).
 *   Permission changes, policy changes and elapsed time never write.
 * - `clear()` cancels queued writes before it removes storage, so a
 *   pending flush cannot recreate what was just cleared.
 * - Writes and `reconcile()` follow the ordering rules in `reconcile.ts`:
 *   choices merge per category and directives as a union, a notice or
 *   vendor write never replaces a newer stored record, a subject-only
 *   rewrite never recreates a cleared one, and reconciliation lands queued
 *   writes before it reads.
 * - With `sync` on (the default), `storage`, `visibilitychange` and `focus`
 *   schedule one coalesced `reconcile()`. `dispose()` removes the
 *   listeners and cancels the scheduled run.
 */
import { STORAGE_KEY_V2 } from '../../libs/storage-keys';
import type { ConsentSnapshot, HydrationRecords } from '../../types';
import { hydrateFromStorage, readStoredRecordsForReconcile } from './hydrate';
import {
	choiceToWrite,
	directivesToWrite,
	fingerprintStoredRecords,
	mayWriteNotice,
	mayWriteVendorChoice,
	sameRecord,
	selectReconciledRecords,
	subjectToWrite,
} from './reconcile';
import type { StorageFingerprints, StoredRecordKind } from './reconcile';
import type { StoredIabMetadata } from './record-codec';
import {
	clearStoredConsentRecords,
	readStoredConsentRecord,
	readStoredNoticeDismissal,
	readStoredPrivacyOptOuts,
	readStoredVendorChoice,
	resolveStorageKeys,
} from './record-storage';
import { createWriteScheduler } from './schedule';
import type { PersistenceHandle, PersistenceOptions } from './types';
import {
	writeChoiceToStorage,
	writeNoticeToStorage,
	writePrivacyToStorage,
	writeVendorChoiceToStorage,
} from './write';

export type {
	PersistenceHandle,
	PersistenceOptions,
	StorageConfig,
} from './types';
export {
	readStoredRecords,
	readStoredRecordsFromCookieHeader,
} from './hydrate';
export type { StoredRecords } from './hydrate';
export type {
	StoredIabMetadata,
	StoredConsentEnvelope,
	StoredVendorChoice,
} from './record-codec';
export { resolveStorageKeys } from './record-storage';

export const CONSENT_STORAGE_KEY = STORAGE_KEY_V2;

export const createPersistence = function createPersistence(
	options: PersistenceOptions
): PersistenceHandle {
	const { kernel, storageConfig } = options;
	const now = options.now ?? (() => Date.now());

	// IAB transport metadata carried by the stored record. Preserved on the
	// next explicit save so an envelope rewrite never drops it.
	let storedIab: StoredIabMetadata | null = null;

	// What storage held when this runtime last read or wrote each record.
	// Reconciliation acts only on records that changed since.
	let seen: StorageFingerprints = {};
	// Whether a decision was recorded since the last write. Without one, a
	// scheduled write only acknowledges the server's subject id.
	let choiceRecorded = false;
	let vendorsRecorded = false;
	let disposed = false;
	// The subject id storage held at the last readable read or write, and
	// the id a save generated because this runtime held none. An in-memory
	// id equal to either yields to a stored subject; any other one came from
	// the server and is kept.
	let seenSubjectId: string | null | undefined;
	let freshSubjectId: string | undefined;
	let subjectBeforeSave: string | undefined;

	const rememberSubject = function rememberSubject(
		records: HydrationRecords
	): void {
		if (records.choice !== undefined) {
			seenSubjectId = records.subject?.subjectId ?? null;
		}
	};

	const subjectYields = function subjectYields(): boolean {
		const id = kernel.getSnapshot().subject?.subjectId;
		return !id || id === freshSubjectId || id === seenSubjectId;
	};

	const observe = function observe(kind?: StoredRecordKind): void {
		if (typeof document === 'undefined') {
			return;
		}
		const read = readStoredRecordsForReconcile(storageConfig, now());
		const prints = fingerprintStoredRecords(read);
		if (kind) {
			seen[kind] = prints[kind];
		} else {
			seen = prints;
		}
		if (kind === undefined || kind === 'choice') {
			rememberSubject(read.records);
		}
	};

	const noteGeneratedSubject = function noteGeneratedSubject(
		snapshot: ConsentSnapshot
	): void {
		const id = snapshot.subject?.subjectId;
		if (id && !subjectBeforeSave) {
			freshSubjectId = id;
		}
	};

	/**
	 * Whether another runtime changed a record since this runtime last read
	 * or wrote it. Such a record wins a tie with a queued write.
	 */
	const changedSinceSeen = function changedSinceSeen(
		kind: StoredRecordKind,
		at: number
	): boolean {
		const prints = fingerprintStoredRecords(
			readStoredRecordsForReconcile(storageConfig, at)
		);
		return prints[kind] !== undefined && prints[kind] !== seen[kind];
	};

	const choiceWrites = createWriteScheduler(() => {
		const subjectOnly = !choiceRecorded;
		choiceRecorded = false;
		const snapshot = kernel.getSnapshot();
		const at = now();
		const stored = readStoredConsentRecord(storageConfig, at).selected;
		const explicitChoice = choiceToWrite(
			snapshot.explicitChoice,
			stored?.choice ?? null,
			subjectOnly,
			changedSinceSeen('choice', at)
		);
		if (explicitChoice) {
			const subject = subjectOnly
				? snapshot.subject
				: subjectToWrite(snapshot.subject, stored?.subject, subjectYields());
			writeChoiceToStorage(
				{ ...snapshot, explicitChoice, subject },
				storedIab,
				storageConfig,
				at
			);
			// A write that took anything from storage leaves the record marked
			// as changed, so the next reconciliation brings it into memory.
			if (
				sameRecord(explicitChoice, snapshot.explicitChoice) &&
				sameRecord(subject, snapshot.subject)
			) {
				observe('choice');
			}
		}
	});
	const noticeWrites = createWriteScheduler(() => {
		const snapshot = kernel.getSnapshot();
		const at = now();
		const stored = readStoredNoticeDismissal(storageConfig, at);
		if (
			snapshot.noticeDismissal &&
			mayWriteNotice(
				snapshot.noticeDismissal,
				stored?.ok ? stored.record : null,
				changedSinceSeen('notice', at)
			)
		) {
			writeNoticeToStorage(snapshot, storageConfig, at);
			observe('notice');
		}
	});
	const privacyWrites = createWriteScheduler(() => {
		const snapshot = kernel.getSnapshot();
		const at = now();
		const stored = readStoredPrivacyOptOuts(storageConfig, at);
		const optOutDirectives = directivesToWrite(
			snapshot.optOutDirectives,
			stored?.ok ? stored.record.directives : null
		);
		writePrivacyToStorage({ ...snapshot, optOutDirectives }, storageConfig, at);
		observe('privacy');
	});
	const vendorWrites = createWriteScheduler(() => {
		const subjectOnly = !vendorsRecorded;
		vendorsRecorded = false;
		const snapshot = kernel.getSnapshot();
		const at = now();
		const read = readStoredVendorChoice(storageConfig, at);
		const stored = read?.ok ? read.record : null;
		if (
			mayWriteVendorChoice(
				snapshot.vendorChoice,
				stored,
				subjectOnly,
				changedSinceSeen('vendors', at)
			)
		) {
			const subject = subjectOnly
				? snapshot.subject
				: subjectToWrite(snapshot.subject, stored?.subject, subjectYields());
			writeVendorChoiceToStorage({ ...snapshot, subject }, storageConfig, at);
			// As for the choice: a subject taken from storage stays marked as
			// changed until reconciliation brings it into memory.
			if (sameRecord(subject, snapshot.subject)) {
				observe('vendors');
			}
		}
	});

	const unsubscribers = [
		kernel.events.on('command:save:started', () => {
			subjectBeforeSave = kernel.getSnapshot().subject?.subjectId;
		}),
		kernel.events.on('choice:recorded', ({ snapshot }) => {
			noteGeneratedSubject(snapshot);
			choiceRecorded = true;
			choiceWrites.schedule();
		}),
		kernel.events.on('subject:resolved', ({ snapshot }) => {
			choiceWrites.schedule();
			// The vendor record carries the subject only once a vendor decision
			// exists. Scheduling without one would run the writer's clear branch
			// and delete a stored denial this kernel never hydrated.
			if (snapshot.vendorChoice !== null) {
				vendorWrites.schedule();
			}
		}),
		kernel.events.on('notice:dismissed', () => {
			noticeWrites.schedule();
		}),
		kernel.events.on('privacy:opt-out', () => {
			privacyWrites.schedule();
		}),
		kernel.events.on('vendors:recorded', ({ snapshot }) => {
			noteGeneratedSubject(snapshot);
			vendorsRecorded = true;
			vendorWrites.schedule();
		}),
	];

	const flushAll = function flushAll(): void {
		choiceWrites.flush();
		noticeWrites.flush();
		privacyWrites.flush();
		vendorWrites.flush();
	};

	const cancelAll = function cancelAll(): void {
		choiceWrites.cancel();
		noticeWrites.cancel();
		privacyWrites.cancel();
		vendorWrites.cancel();
		choiceRecorded = false;
		vendorsRecorded = false;
	};

	/**
	 * A server prefetch seeds the kernel from the cookie alone. The vendor
	 * record keeps a localStorage copy that outlives a cookie the browser
	 * dropped, most often because many denied ids pushed it past the
	 * per-cookie limit, so the seeded list can be older than what this
	 * browser last saved. Read both projections and apply the newer one
	 * before any gate consults the denials; the category records stay as
	 * seeded.
	 */
	const reconcileVendorChoice = function reconcileVendorChoice(): void {
		if (typeof document === 'undefined') {
			return;
		}
		const at = now();
		const stored = readStoredVendorChoice(storageConfig, at);
		if (!stored?.ok) {
			return;
		}
		const current = kernel.getSnapshot().vendorChoice;
		if (current && current.confirmedAt >= stored.record.confirmedAt) {
			return;
		}
		kernel.hydrate({
			now: at,
			vendorChoice: {
				confirmedAt: stored.record.confirmedAt,
				denied: stored.record.denied,
				version: stored.record.version,
			},
		});
	};

	const hydrate = function hydrate(): boolean {
		// An explicit choice may still be queued. Land it first so
		// rehydration reads the new choice back instead of overwriting it
		// with whatever storage held before the user acted.
		flushAll();
		const stored = hydrateFromStorage(kernel, storageConfig, now());
		if (!stored) {
			return false;
		}
		seen = fingerprintStoredRecords(stored);
		rememberSubject(stored.records);
		if (stored.records.choice !== undefined) {
			storedIab = stored.iab;
		}
		return stored.found;
	};

	// Coalesces bursts of triggers (one save writes several keys) into one
	// read in a later macrotask.
	const scheduledReconcile = createWriteScheduler(() => {
		// oxlint-disable-next-line no-use-before-define -- Mutually recursive with the scheduler.
		reconcile();
	});

	const reconcile = function reconcile(): boolean {
		scheduledReconcile.cancel();
		if (disposed || typeof document === 'undefined') {
			return false;
		}
		// Land this runtime's queued writes first. Each one merges with what
		// storage holds, so it cannot undo a newer decision another runtime
		// stored meanwhile.
		flushAll();
		const at = now();
		const stored = readStoredRecordsForReconcile(storageConfig, at);
		const next = selectReconciledRecords(
			kernel.getSnapshot(),
			stored,
			seen,
			at,
			subjectYields()
		);
		({ seen } = next);
		rememberSubject(stored.records);
		if (!next.records) {
			return false;
		}
		const result = kernel.hydrate(next.records);
		if (result.ok === false) {
			console.warn(
				'[c15t] Stored consent records were rejected.',
				result.issues
			);
			return false;
		}
		if (next.records.choice !== undefined) {
			storedIab = next.records.choice ? stored.iab : null;
		}
		return result.changed;
	};

	const installSyncListeners = function installSyncListeners(): () => void {
		if (
			options.sync === false ||
			typeof window === 'undefined' ||
			typeof document === 'undefined' ||
			typeof window.addEventListener !== 'function' ||
			typeof document.addEventListener !== 'function'
		) {
			return () => undefined;
		}
		const keys = resolveStorageKeys(storageConfig);
		const watched = new Set<string | null>([
			keys.consent,
			keys.legacyConsent,
			keys.notice,
			keys.privacy,
			keys.vendors,
			// Another page called `localStorage.clear()`.
			null,
		]);
		const onStorage = function onStorage(event: StorageEvent): void {
			if (watched.has(event.key)) {
				scheduledReconcile.schedule();
			}
		};
		const onVisibilityChange = function onVisibilityChange(): void {
			if (document.visibilityState !== 'hidden') {
				scheduledReconcile.schedule();
			}
		};
		const onFocus = function onFocus(): void {
			scheduledReconcile.schedule();
		};
		window.addEventListener('storage', onStorage);
		window.addEventListener('focus', onFocus);
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => {
			window.removeEventListener('storage', onStorage);
			window.removeEventListener('focus', onFocus);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	};

	if (options.skipHydration) {
		reconcileVendorChoice();
		observe();
	} else {
		hydrate();
	}

	const removeListeners = installSyncListeners();

	return {
		clear() {
			cancelAll();
			storedIab = null;
			if (typeof document !== 'undefined') {
				clearStoredConsentRecords(undefined, storageConfig);
			}
			observe();
			kernel.hydrate({
				choice: null,
				noticeDismissal: null,
				now: now(),
				optOutDirectives: [],
				subject: null,
				vendorChoice: null,
			});
			kernel.events.emit({ type: 'records:cleared' });
		},
		dispose() {
			if (disposed) {
				return;
			}
			disposed = true;
			removeListeners();
			scheduledReconcile.cancel();
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
			// A write queued in the current tick must not fire after dispose.
			// Flushing synchronously keeps the last change durable without
			// leaving a timer behind.
			flushAll();
		},
		hydrate,
		reconcile,
	};
};
