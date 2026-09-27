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
 *   a write never replaces a newer stored record, a subject-only rewrite
 *   never recreates a cleared one, and reconciliation lands queued writes
 *   before it reads.
 * - With `sync` on (the default), `storage`, `visibilitychange` and `focus`
 *   schedule one coalesced `reconcile()`. `dispose()` removes the
 *   listeners and cancels the scheduled run.
 */
import { STORAGE_KEY_V2 } from '../../libs/storage-keys';
import { hydrateFromStorage, readStoredRecordsForReconcile } from './hydrate';
import {
	fingerprintStoredRecords,
	mayWriteChoice,
	mayWriteNotice,
	mayWritePrivacy,
	mayWriteVendorChoice,
	selectReconciledRecords,
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

	const observe = function observe(kind?: StoredRecordKind): void {
		if (typeof document === 'undefined') {
			return;
		}
		const prints = fingerprintStoredRecords(
			readStoredRecordsForReconcile(storageConfig, now()).records
		);
		if (kind) {
			seen[kind] = prints[kind];
		} else {
			seen = prints;
		}
	};

	const choiceWrites = createWriteScheduler(() => {
		const subjectOnly = !choiceRecorded;
		choiceRecorded = false;
		const snapshot = kernel.getSnapshot();
		const at = now();
		const stored = readStoredConsentRecord(storageConfig, at).selected;
		if (
			snapshot.explicitChoice &&
			mayWriteChoice(
				snapshot.explicitChoice,
				stored?.choice ?? null,
				subjectOnly
			)
		) {
			writeChoiceToStorage(snapshot, storedIab, storageConfig, at);
			observe('choice');
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
				stored?.ok ? stored.record : null
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
		if (
			mayWritePrivacy(
				snapshot.optOutDirectives,
				stored?.ok ? stored.record.directives : null
			)
		) {
			writePrivacyToStorage(snapshot, storageConfig, at);
			observe('privacy');
		}
	});
	const vendorWrites = createWriteScheduler(() => {
		const subjectOnly = !vendorsRecorded;
		vendorsRecorded = false;
		const snapshot = kernel.getSnapshot();
		const at = now();
		const stored = readStoredVendorChoice(storageConfig, at);
		if (
			mayWriteVendorChoice(
				snapshot.vendorChoice,
				stored?.ok ? stored.record : null,
				subjectOnly
			)
		) {
			writeVendorChoiceToStorage(snapshot, storageConfig, at);
			observe('vendors');
		}
	});

	const unsubscribers = [
		kernel.events.on('choice:recorded', () => {
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
		kernel.events.on('vendors:recorded', () => {
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
		seen = fingerprintStoredRecords(stored.records);
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
		// Land this runtime's queued writes first. Each one is guarded, so it
		// cannot replace a newer record another runtime stored meanwhile.
		flushAll();
		const at = now();
		const stored = readStoredRecordsForReconcile(storageConfig, at);
		const next = selectReconciledRecords(
			kernel.getSnapshot(),
			stored.records,
			seen,
			at
		);
		({ seen } = next);
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
