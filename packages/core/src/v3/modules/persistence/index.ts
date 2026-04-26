/**
 * c15t/v3/modules/persistence
 *
 * Kernel-consuming persistence module. Reads consent from cookie +
 * localStorage on mount (`hydrate`) and writes back on every relevant
 * kernel change with a debounce. Uses the v2 cookie library so both
 * v2 and v3 consumers read/write the same format — a v2 user upgrading
 * to v3 does not lose stored consent.
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
import {
	deleteConsentFromStorage,
	getConsentFromStorage,
	type StorageConfig,
	saveConsentToStorage,
} from '../../../libs/cookie';
import {
	generateSubjectId,
	isValidSubjectId,
} from '../../../libs/generate-subject-id';
import type { ConsentState as V2ConsentState } from '../../../types/compliance';
import type { ConsentInfo } from '../../../types/consent-types';
import type { ConsentKernel, ConsentSnapshot } from '../../types';

/**
 * Shape of payloads the v2 cookie layer reads/writes. `getConsentFromStorage`
 * returns `unknown` by default, so we type-narrow here.
 */
interface StoredPayload {
	consents?: Partial<V2ConsentState>;
	consentInfo?: ConsentInfo | null;
}

export interface PersistenceOptions {
	kernel: ConsentKernel;
	/**
	 * Cookie + storage configuration. Forwarded directly to the v2
	 * cookie layer; any option that cookie.ts accepts is accepted here.
	 * Defaults match v2.
	 */
	storageConfig?: StorageConfig;
	/**
	 * Skip the initial hydration pass. Useful when the adapter has
	 * already seeded the kernel from SSR prefetch.
	 */
	skipHydration?: boolean;
}

export interface PersistenceHandle {
	dispose(): void;
	/** Re-run hydration from storage. Returns whether any state was loaded. */
	hydrate(): boolean;
	/** Clear stored consent. Does NOT mutate the kernel. */
	clear(): void;
}

export function createPersistence(
	options: PersistenceOptions
): PersistenceHandle {
	const { kernel } = options;
	const storageConfig = options.storageConfig;

	const hasStorageAPIs =
		typeof document !== 'undefined' && typeof localStorage !== 'undefined';

	let scheduled = false;
	let lastSnapshot = kernel.getSnapshot();

	function hydrate(): boolean {
		if (!hasStorageAPIs) return false;
		const stored = getConsentFromStorage<StoredPayload>(storageConfig) as
			| StoredPayload
			| null
			| undefined;
		if (!stored) return false;
		if (stored.consents) {
			kernel.set.consent(stored.consents);
		}
		if (stored.consentInfo) {
			const storedId = stored.consentInfo.subjectId;
			if (storedId && isValidSubjectId(storedId)) {
				kernel.set.subjectId(storedId);
			}
			kernel.set.hasConsented(true);
		}
		return true;
	}

	function writeNow(snapshot: ConsentSnapshot): void {
		if (!hasStorageAPIs) return;
		if (!snapshot.hasConsented) return; // don't persist until the user has decided
		let subjectId = snapshot.subjectId;
		if (!subjectId || !isValidSubjectId(subjectId)) {
			subjectId = generateSubjectId();
			kernel.set.subjectId(subjectId);
		}
		saveConsentToStorage(
			{
				consents: snapshot.consents as V2ConsentState,
				consentInfo: {
					time: Date.now(),
					subjectId,
				},
			},
			storageConfig
		);
	}

	function schedule(): void {
		if (scheduled) return;
		scheduled = true;
		Promise.resolve().then(() => {
			scheduled = false;
			writeNow(kernel.getSnapshot());
		});
	}

	const unsubscribe = kernel.subscribe((snapshot) => {
		const consentsChanged = snapshot.consents !== lastSnapshot.consents;
		const statusChanged = snapshot.hasConsented !== lastSnapshot.hasConsented;
		lastSnapshot = snapshot;
		if (consentsChanged || statusChanged) {
			schedule();
		}
	});

	if (!options.skipHydration) {
		hydrate();
	}

	return {
		dispose() {
			unsubscribe();
		},
		hydrate,
		clear() {
			if (!hasStorageAPIs) return;
			deleteConsentFromStorage(storageConfig);
		},
	};
}
