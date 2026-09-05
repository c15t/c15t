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
 *   A canonical subject acknowledgement preserves every receipt timestamp.
 *   Separate writes follow
 *   `notice:dismissed` (the notice record and its cookie projection) and
 *   `privacy:opt-out` (the privacy record and its cookie projection).
 *   Permission changes, policy changes and elapsed time never write.
 * - `clear()` cancels queued writes before it removes storage, so a
 *   pending flush cannot recreate what was just cleared.
 */
import { STORAGE_KEY_V2 } from '../../libs/storage-keys';
import { hydrateFromStorage } from './hydrate';
import type { StoredIabMetadata } from './record-codec';
import { clearStoredConsentRecords } from './record-storage';
import { createWriteScheduler } from './schedule';
import type { PersistenceHandle, PersistenceOptions } from './types';
import {
	writeChoiceToStorage,
	writeNoticeToStorage,
	writePrivacyToStorage,
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
export type { StoredIabMetadata, StoredConsentEnvelope } from './record-codec';
export { resolveStorageKeys } from './record-storage';

export const CONSENT_STORAGE_KEY = STORAGE_KEY_V2;

export const createPersistence = function createPersistence(
	options: PersistenceOptions
): PersistenceHandle {
	const { kernel, storageConfig } = options;
	const now = options.now ?? (() => Date.now());
	const hasStorageAPIs =
		typeof document !== 'undefined' && typeof localStorage !== 'undefined';

	// IAB transport metadata carried by the stored record. Preserved on the
	// next explicit save so an envelope rewrite never drops it.
	let storedIab: StoredIabMetadata | null = null;

	const choiceWrites = createWriteScheduler(() => {
		writeChoiceToStorage(kernel.getSnapshot(), storedIab, storageConfig, now());
	});
	const noticeWrites = createWriteScheduler(() => {
		writeNoticeToStorage(kernel.getSnapshot(), storageConfig, now());
	});
	const privacyWrites = createWriteScheduler(() => {
		writePrivacyToStorage(kernel.getSnapshot(), storageConfig, now());
	});

	const unsubscribers = [
		kernel.events.on('choice:recorded', () => {
			choiceWrites.schedule();
		}),
		kernel.events.on('subject:resolved', () => {
			choiceWrites.schedule();
		}),
		kernel.events.on('notice:dismissed', () => {
			noticeWrites.schedule();
		}),
		kernel.events.on('privacy:opt-out', () => {
			privacyWrites.schedule();
		}),
	];

	const flushAll = function flushAll(): void {
		choiceWrites.flush();
		noticeWrites.flush();
		privacyWrites.flush();
	};

	const cancelAll = function cancelAll(): void {
		choiceWrites.cancel();
		noticeWrites.cancel();
		privacyWrites.cancel();
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
		storedIab = stored.iab;
		return stored.found;
	};

	if (!options.skipHydration) {
		hydrate();
	}

	return {
		clear() {
			cancelAll();
			storedIab = null;
			if (hasStorageAPIs) {
				clearStoredConsentRecords(undefined, storageConfig);
			}
			kernel.hydrate({
				choice: null,
				noticeDismissal: null,
				now: now(),
				optOutDirectives: [],
				subject: null,
			});
			kernel.events.emit({ type: 'records:cleared' });
		},
		dispose() {
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
			// A write queued in the current tick must not fire after dispose.
			// Flushing synchronously keeps the last change durable without
			// leaving a timer behind.
			flushAll();
		},
		hydrate,
	};
};
