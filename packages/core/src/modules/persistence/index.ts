/**
 * `@c15t/core/modules/persistence`
 *
 * Kernel-consuming persistence module. Reads consent from cookie +
 * localStorage on mount (`hydrate`) and writes back on every relevant
 * kernel change with a debounce. Uses the v2 cookie library so both
 * v2 and v3 consumers read/write the same format — a v2 user upgrading
 * to v3 does not lose stored consent.
 *
 * Concerns are split across siblings:
 * - `types.ts`     — public + internal type definitions.
 * - `hydrate.ts`   — pure-ish read path.
 * - `write.ts`     — pure-ish write path.
 * - `schedule.ts`  — microtask-debounced write scheduler.
 * - `index.ts`     — this file: subscription wiring + lifecycle.
 *
 * Invariants:
 * - Hydration runs synchronously inside `createPersistence` so the
 *   caller can block first paint until stored consent is applied.
 *   This is still pure (no async work), but it does read cookies and
 *   localStorage — caller must invoke inside the browser only.
 * - Hydration is read-only. Kernel changes it causes never schedule a
 *   write, so startup does not renew the stored choice time or
 *   recreate a missing cookie / localStorage mirror. A `hydrate()` call
 *   flushes any queued write first, so an explicit choice made moments
 *   earlier is never lost to the rehydrated stored value.
 * - Write path subscribes to kernel; on every tick where `consents`
 *   or `hasConsented` change, schedules a write. Every `save()` also
 *   schedules one, so a repeat save that changes nothing still refreshes
 *   the stored record. Writes are batched with a microtask debounce so
 *   rapid flips produce one write.
 * - Dispose unsubscribes but does not clear storage.
 */
import {
	deleteConsentFromStorage,
	getConsentFromCookieHeader,
} from '../../libs/cookie';
import { STORAGE_KEY_V2 } from '../../libs/storage-keys';
import { hydrateFromStorage } from './hydrate';
import { createWriteScheduler } from './schedule';
import type {
	PersistenceHandle,
	PersistenceOptions,
	StorageConfig,
	StoredPayload,
} from './types';
import { writeToStorage } from './write';

export type {
	PersistenceHandle,
	PersistenceOptions,
	StorageConfig,
	StoredPayload,
} from './types';

export const CONSENT_STORAGE_KEY = STORAGE_KEY_V2;

export const readStoredConsentFromCookie = function readStoredConsentFromCookie(
	cookieHeader: string | undefined,
	storageConfig?: StorageConfig
): StoredPayload | null {
	return getConsentFromCookieHeader<StoredPayload>(cookieHeader, storageConfig);
};

export const createPersistence = function createPersistence(
	options: PersistenceOptions
): PersistenceHandle {
	const { kernel } = options;
	const { storageConfig } = options;
	const hasStorageAPIs =
		typeof document !== 'undefined' && typeof localStorage !== 'undefined';

	let lastSnapshot = kernel.getSnapshot();
	let hydrating = false;

	const scheduler = createWriteScheduler(() => {
		writeToStorage(kernel.getSnapshot(), kernel, storageConfig);
	});

	const unsubscribe = kernel.subscribe((snapshot) => {
		const consentsChanged = snapshot.consents !== lastSnapshot.consents;
		const statusChanged = snapshot.hasConsented !== lastSnapshot.hasConsented;
		lastSnapshot = snapshot;
		// Changes applied by hydration come from storage; writing them back
		// would only renew the choice timestamp the user never re-made.
		if (hydrating) {
			return;
		}
		if (consentsChanged || statusChanged) {
			scheduler.schedule();
		}
	});

	// `save()` with no input finalizes the current consents in place: the
	// snapshot's `consents` and `hasConsented` may both be unchanged, so the
	// snapshot diff above would skip the write. It is still an explicit act
	// and must refresh the stored record. The event fires before the save
	// patch is applied, and the deferred write reads the snapshot at flush
	// time, so this coalesces with the diff-driven write into one.
	const unsubscribeSave = kernel.events.on('command:save:started', () => {
		scheduler.schedule();
	});

	const hydrate = function hydrate(): boolean {
		// An explicit choice may still be queued. Land it first so
		// rehydration reads the new choice back instead of overwriting it
		// with whatever storage held before the user acted.
		scheduler.flush();
		hydrating = true;
		try {
			return hydrateFromStorage(kernel, storageConfig);
		} finally {
			hydrating = false;
		}
	};

	if (!options.skipHydration) {
		hydrate();
	}

	return {
		clear() {
			if (!hasStorageAPIs) {
				return;
			}
			deleteConsentFromStorage(undefined, storageConfig);
		},
		dispose() {
			unsubscribe();
			unsubscribeSave();
			// A write queued in the current tick must not fire after dispose —
			// it would flush the (possibly stale) snapshot into storage after a
			// newer provider took over. Flushing synchronously keeps the last
			// consent change durable without leaving a timer behind.
			scheduler.flush();
		},
		hydrate,
	};
};
