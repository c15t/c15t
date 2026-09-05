/**
 * Read stored records into the kernel.
 *
 * Synchronous and read-only: the storage read never migrates, mirrors,
 * renews or deletes anything. The first structurally valid consent
 * candidate wins (cookie, configured localStorage, legacy localStorage),
 * the notice dismissal and privacy directives are read with the same
 * `now`, and everything is applied through `kernel.hydrate()`, which
 * validates again and never emits a choice event.
 */
import type { ConsentKernel, HydrationRecords } from '../../types';
import type { StoredIabMetadata } from './record-codec';
import {
	readStoredConsentRecord,
	readStoredConsentRecordFromCookieHeader,
	readStoredNoticeDismissal,
	readStoredNoticeDismissalFromCookieHeader,
	readStoredPrivacyOptOuts,
	readStoredPrivacyOptOutsFromCookieHeader,
} from './record-storage';
import type { StoredConsentSelection } from './record-storage';
import type { StorageConfig } from './types';

/** Stored records plus the IAB transport metadata the next save preserves. */
export interface StoredRecords {
	records: HydrationRecords;
	iab: StoredIabMetadata | null;
	/** Whether any valid record was found. */
	found: boolean;
	/** Diagnostics for every inspected consent candidate. */
	candidates: StoredConsentSelection['candidates'];
}

const composeRecords = function composeRecords(
	selection: StoredConsentSelection,
	notice: ReturnType<typeof readStoredNoticeDismissal>,
	privacy: ReturnType<typeof readStoredPrivacyOptOuts>,
	now: number
): StoredRecords {
	const { selected } = selection;
	const records: HydrationRecords = {
		choice: selected?.choice ?? null,
		noticeDismissal: notice?.ok ? notice.record : null,
		now,
		optOutDirectives: privacy?.ok ? [...privacy.record.directives] : [],
		subject: selected?.subject ?? null,
	};
	return {
		candidates: selection.candidates,
		found: selected !== null || notice?.ok === true || privacy?.ok === true,
		iab: selected?.iab ?? null,
		records,
	};
};

/**
 * Browser read of every stored record at `now`. Never writes.
 */
export const readStoredRecords = function readStoredRecords(
	storageConfig: StorageConfig | undefined,
	now: number
): StoredRecords {
	return composeRecords(
		readStoredConsentRecord(storageConfig, now),
		readStoredNoticeDismissal(storageConfig, now),
		readStoredPrivacyOptOuts(storageConfig, now),
		now
	);
};

/**
 * Server read of every cookie-carried record from a request `Cookie`
 * header at `now`. The choice, the notice projection and the privacy
 * projection are decoded with the same validators the browser uses, so a
 * server render seeded with the result matches the client's hydration.
 */
export const readStoredRecordsFromCookieHeader =
	function readStoredRecordsFromCookieHeader(
		cookieHeader: string | undefined,
		storageConfig: StorageConfig | undefined,
		now: number
	): HydrationRecords {
		return composeRecords(
			readStoredConsentRecordFromCookieHeader(cookieHeader, storageConfig, now),
			readStoredNoticeDismissalFromCookieHeader(
				cookieHeader,
				storageConfig,
				now
			),
			readStoredPrivacyOptOutsFromCookieHeader(
				cookieHeader,
				storageConfig,
				now
			),
			now
		).records;
	};

/**
 * Read stored records and apply them to the kernel. Returns the read
 * result so the caller can keep the IAB metadata for the next save, or
 * `null` when storage APIs are unavailable.
 */
export const hydrateFromStorage = function hydrateFromStorage(
	kernel: ConsentKernel,
	storageConfig: StorageConfig | undefined,
	now: number
): StoredRecords | null {
	if (typeof document === 'undefined' || typeof localStorage === 'undefined') {
		return null;
	}
	const stored = readStoredRecords(storageConfig, now);
	const result = kernel.hydrate(stored.records);
	if (result.ok === false) {
		// The storage layer already validated; a rejection here means the
		// records changed shape between read and apply. Nothing is applied.
		console.warn('[c15t] Stored consent records were rejected.', result.issues);
	}
	return stored;
};
