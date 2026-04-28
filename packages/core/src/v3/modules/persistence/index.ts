/**
 * c15t/v3/modules/persistence
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
 * - Write path subscribes to kernel; on every tick where `consents`
 *   or `hasConsented` change, schedules a write. Writes are batched
 *   with a microtask debounce so rapid flips produce one write.
 * - Dispose unsubscribes but does not clear storage.
 */
import { deleteConsentFromStorage } from '../../../libs/cookie';
import { hydrateFromStorage } from './hydrate';
import { createWriteScheduler } from './schedule';
import type { PersistenceHandle, PersistenceOptions } from './types';
import { writeToStorage } from './write';

export type {
	PersistenceHandle,
	PersistenceOptions,
	StorageConfig,
} from './types';

export function createPersistence(
	options: PersistenceOptions
): PersistenceHandle {
	const { kernel } = options;
	const storageConfig = options.storageConfig;
	const hasStorageAPIs =
		typeof document !== 'undefined' && typeof localStorage !== 'undefined';

	let lastSnapshot = kernel.getSnapshot();

	const scheduler = createWriteScheduler(() => {
		writeToStorage(kernel.getSnapshot(), kernel, storageConfig);
	});

	const unsubscribe = kernel.subscribe((snapshot) => {
		const consentsChanged = snapshot.consents !== lastSnapshot.consents;
		const statusChanged = snapshot.hasConsented !== lastSnapshot.hasConsented;
		lastSnapshot = snapshot;
		if (consentsChanged || statusChanged) {
			scheduler.schedule();
		}
	});

	if (!options.skipHydration) {
		hydrateFromStorage(kernel, storageConfig);
	}

	return {
		dispose() {
			unsubscribe();
		},
		hydrate() {
			return hydrateFromStorage(kernel, storageConfig);
		},
		clear() {
			if (!hasStorageAPIs) return;
			deleteConsentFromStorage(storageConfig);
		},
	};
}
