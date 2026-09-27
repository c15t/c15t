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
import type { StoredIabMetadata, StoredVendorChoice } from './record-codec';
import {
	readStoredConsentRecord,
	readStoredConsentRecordFromCookieHeader,
	readStoredNoticeDismissal,
	readStoredNoticeDismissalFromCookieHeader,
	readStoredPrivacyOptOuts,
	readStoredPrivacyOptOutsFromCookieHeader,
	readStoredVendorChoice,
	readStoredVendorChoiceFromCookieHeader,
} from './record-storage';
import type { StoredConsentSelection } from './record-storage';
import type { StorageConfig } from './types';

/** Stored records plus the IAB transport metadata the next save preserves. */
export interface StoredRecords {
	/** Unreadable records are omitted so hydration preserves in-memory values. */
	records: HydrationRecords;
	iab: StoredIabMetadata | null;
	/** Whether any valid record was found. */
	found: boolean;
	/** Diagnostics for every inspected consent candidate. */
	candidates: StoredConsentSelection['candidates'];
}

/**
 * The kernel's own vendor record shape. The stored record also carries the
 * subject, which the kernel validator does not know, so it is split off.
 */
const kernelVendorChoice = function kernelVendorChoice(
	record: StoredVendorChoice | null
): HydrationRecords['vendorChoice'] {
	if (!record) {
		return null;
	}
	return {
		confirmedAt: record.confirmedAt,
		denied: record.denied,
		version: record.version,
	};
};

const composeRecords = function composeRecords(
	selection: StoredConsentSelection,
	notice: ReturnType<typeof readStoredNoticeDismissal>,
	privacy: ReturnType<typeof readStoredPrivacyOptOuts>,
	vendors: ReturnType<typeof readStoredVendorChoice>,
	now: number
): StoredRecords {
	const { selected } = selection;
	const vendorRecord = vendors?.ok ? vendors.record : null;
	const records: HydrationRecords = {
		choice: selected?.choice ?? null,
		noticeDismissal: notice?.ok ? notice.record : null,
		now,
		optOutDirectives: privacy?.ok ? [...privacy.record.directives] : [],
		// The envelope's subject wins; the vendor record's copy covers a visitor
		// whose only act so far decided vendors.
		subject: selected?.subject ?? vendorRecord?.subject ?? null,
		vendorChoice: kernelVendorChoice(vendorRecord),
	};
	return {
		candidates: selection.candidates,
		found: selected !== null || [notice, privacy, vendors].some((r) => r?.ok),
		iab: selected?.iab ?? null,
		records,
	};
};

/** Whether a consent read found bytes but no candidate decoded. */
const hasUndecodableChoice = function hasUndecodableChoice(
	selection: StoredConsentSelection
): boolean {
	return (
		selection.selected === null &&
		selection.candidates.some(
			(candidate) =>
				candidate.status === 'invalid' || candidate.status === 'unparseable'
		)
	);
};

/** Which records could not be read. */
interface Unreadable {
	choice: boolean;
	notice: boolean;
	privacy: boolean;
	vendors: boolean;
}

/**
 * Also count records whose bytes did not decode as unreadable. A reader
 * returns a failed decode result, not `null`, for such bytes.
 */
const markUndecodable = function markUndecodable(
	unreadable: Unreadable,
	selection: StoredConsentSelection,
	results: Record<'notice' | 'privacy' | 'vendors', { ok: boolean } | null>
): void {
	unreadable.choice ||= hasUndecodableChoice(selection);
	unreadable.notice ||= results.notice?.ok === false;
	unreadable.privacy ||= results.privacy?.ok === false;
	unreadable.vendors ||= results.vendors?.ok === false;
};

/**
 * Shared browser read. With `preserveUndecodable`, a record that is stored
 * but does not decode is omitted like an unavailable one, so the caller
 * keeps its in-memory value instead of treating the bytes as absent.
 */
const readRecords = function readRecords(
	storageConfig: StorageConfig | undefined,
	now: number,
	preserveUndecodable: boolean
): StoredRecords {
	const unreadable: Unreadable = {
		choice: false,
		notice: false,
		privacy: false,
		vendors: false,
	};
	const selection = readStoredConsentRecord(storageConfig, now, () => {
		unreadable.choice = true;
	});
	const notice = readStoredNoticeDismissal(storageConfig, now, () => {
		unreadable.notice = true;
	});
	const privacy = readStoredPrivacyOptOuts(storageConfig, now, () => {
		unreadable.privacy = true;
	});
	const vendors = readStoredVendorChoice(storageConfig, now, () => {
		unreadable.vendors = true;
	});
	if (preserveUndecodable) {
		markUndecodable(unreadable, selection, { notice, privacy, vendors });
	}
	const {
		choice: choiceUnavailable,
		notice: noticeUnavailable,
		privacy: privacyUnavailable,
		vendors: vendorsUnavailable,
	} = unreadable;
	const stored = composeRecords(selection, notice, privacy, vendors, now);
	// An absent value only clears memory when every candidate was readable.
	// A valid record from an available source can still hydrate normally.
	if (!selection.selected && choiceUnavailable) {
		delete stored.records.choice;
		if (!vendors?.ok) {
			delete stored.records.subject;
		}
	}
	if (!notice?.ok && noticeUnavailable) {
		delete stored.records.noticeDismissal;
	}
	if (!privacy?.ok && privacyUnavailable) {
		delete stored.records.optOutDirectives;
	}
	if (!vendors?.ok && vendorsUnavailable) {
		delete stored.records.vendorChoice;
	}
	return stored;
};

/**
 * Browser read of every stored record at `now`. Never writes.
 */
export const readStoredRecords = function readStoredRecords(
	storageConfig: StorageConfig | undefined,
	now: number
): StoredRecords {
	return readRecords(storageConfig, now, false);
};

/**
 * Browser read for reconciling a running kernel. Like
 * {@link readStoredRecords}, except a record whose bytes are present but do
 * not decode is omitted rather than reported as absent: bytes that cannot
 * be read say nothing about what the visitor decided, so they must not
 * clear a decision the kernel already holds.
 */
export const readStoredRecordsForReconcile =
	function readStoredRecordsForReconcile(
		storageConfig: StorageConfig | undefined,
		now: number
	): StoredRecords {
		return readRecords(storageConfig, now, true);
	};

/**
 * Server read of every cookie-carried record from a request `Cookie`
 * header at `now`. The choice, the notice projection, the privacy
 * projection and the vendor projection are decoded with the same validators
 * the browser uses, so a server render seeded with the result matches the
 * client's hydration.
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
			readStoredVendorChoiceFromCookieHeader(cookieHeader, storageConfig, now),
			now
		).records;
	};

/**
 * Read stored records and apply them to the kernel. Returns the read
 * result so the caller can keep the IAB metadata for the next save, or
 * `null` outside the browser.
 */
export const hydrateFromStorage = function hydrateFromStorage(
	kernel: ConsentKernel,
	storageConfig: StorageConfig | undefined,
	now: number
): StoredRecords | null {
	if (typeof document === 'undefined') {
		return null;
	}
	// Cookies can remain usable when localStorage is blocked. Let each
	// storage reader guard its own access, including property getters.
	const stored = readStoredRecords(storageConfig, now);
	const result = kernel.hydrate(stored.records);
	if (result.ok === false) {
		// The storage layer already validated; a rejection here means the
		// records changed shape between read and apply. Nothing is applied.
		console.warn('[c15t] Stored consent records were rejected.', result.issues);
	}
	return stored;
};
