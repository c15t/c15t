import type { InternalKernel } from '../../../kernel/internals';
/**
 * The interface between persistence's first-load part (`../index.ts`) and
 * its write code, which loads on demand.
 *
 * Type-only: the writer imports nothing the first load has. What it calls
 * there arrives as {@link PersistenceTools}.
 */
import type { mergeNewestChoice } from '../../../kernel/record-validation';
import type { deleteCookie, writeCookie } from '../../../libs/cookie';
import type { clearStoredRecords } from '../clear';
import type {
	choiceSinceEpoch,
	noticeSinceEpoch,
	vendorChoiceSinceEpoch,
} from '../epoch';
import type { StoredRecords } from '../hydrate';
import type {
	decodeNoticeDismissal,
	decodeVendorChoice,
	validateStoredConsentEnvelope,
} from '../record-codec';
import type { ResolvedStorageKeys } from '../record-storage';
import type { StorageConfig } from '../types';

/**
 * First-load functions the write code calls: the storage reads and record
 * validators the read path already has, the clear-epoch rules, the
 * per-category merge, cookie writes and the storage clear. Passed in, never imported, so the
 * write code loads as one chunk without splitting shared modules out of
 * the first load.
 *
 * @internal
 */
export interface PersistenceTools {
	/** `readStoredRecordsForReconcile`. */
	read: (config: StorageConfig | undefined, now: number) => StoredRecords;
	/** `resolveStorageKeys`. */
	keys: (config?: StorageConfig) => ResolvedStorageKeys;
	/** `getRawCookieValue`. */
	rawCookie: (name: string) => string | null;
	writeCookie: typeof writeCookie;
	deleteCookie: typeof deleteCookie;
	validateEnvelope: typeof validateStoredConsentEnvelope;
	decodeNotice: typeof decodeNoticeDismissal;
	decodeVendors: typeof decodeVendorChoice;
	choiceSince: typeof choiceSinceEpoch;
	noticeSince: typeof noticeSinceEpoch;
	vendorsSince: typeof vendorChoiceSinceEpoch;
	merge: typeof mergeNewestChoice;
	/** `clearStoredRecords`: first-load code, since `clear()` runs it at once. */
	clear: typeof clearStoredRecords;
}

/** A record the writer stores on its own schedule. */
export type WriteKind = 'choice' | 'notice' | 'vendors';

/**
 * What the kernel's events told persistence since the last write. The
 * first-load part sets these from its listeners, which are attached before
 * the writer exists; the writer reads and resets them.
 *
 * @internal
 */
export interface PersistenceState {
	/** A decision was recorded since the last choice write. */
	choiceRecorded: boolean;
	/** A vendor decision was recorded since the last vendor write. */
	vendorsRecorded: boolean;
	/** The subject id held when the current save started. */
	subjectBeforeSave?: string;
	/** An id a save generated because this runtime held none. */
	freshSubjectId?: string;
	/** When the save that generated `freshSubjectId` acted. */
	freshSubjectAt?: number;
}

/** What one persistence handle shares with its writer. @internal */
export interface PersistenceContext {
	kernel: InternalKernel;
	storageConfig: StorageConfig | undefined;
	now: () => number;
	state: PersistenceState;
}

/**
 * The write half of one persistence handle.
 *
 * @internal
 */
export interface PersistenceWriter {
	/**
	 * Take `read` as what storage held when memory last matched it. With
	 * `iab`, also keep its IAB metadata for the next choice write.
	 */
	adopt: (read: StoredRecords, iab: boolean) => void;
	/** Write a record in the next macrotask (coalesced). */
	schedule: (kind: WriteKind) => void;
	/** Run every scheduled write now. */
	flush: () => void;
	/**
	 * Drop scheduled writes, remove every stored record and store the clear
	 * epoch for a clear made at `at`. The caller resets the event state and
	 * clears the kernel's records.
	 */
	clearStorage: (at: number) => void;
	/** See `PersistenceHandle.reconcile`. */
	reconcile: () => boolean;
	/** Reconcile in a later macrotask (coalesced). */
	scheduleReconcile: () => void;
	/** Cancel a scheduled reconciliation. */
	dispose: () => void;
}
