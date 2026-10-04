/**
 * Storage writes for every c15t record: the v3 envelope, the notice
 * dismissal, the vendor denials, the clear epoch, and clearing them all.
 * The reads that pair with them are in `../record-storage.ts`.
 *
 * Each record is validated with the reader's own validator before it is
 * written, so nothing is stored that the next read would reject. Writes
 * run only when the kernel explicitly asks; hydration never writes.
 *
 * @internal
 */
import type { CookieOptions, CookieWriteReport } from '../../../libs/cookie';
import type {
	DecodeResult,
	StorageIssue,
	StoredConsentEnvelope,
	StoredNoticeDismissal,
	StoredVendorChoice,
} from '../record-codec';
import type { StorageConfig } from '../types';
import {
	encodeClearEpoch,
	encodeNoticeDismissal,
	encodeNoticeDismissalCompact,
	encodeStoredConsentEnvelopeCompact,
	encodeStoredConsentEnvelopeJson,
	encodeVendorChoice,
	encodeVendorChoiceCompact,
} from './encode';
import type { PersistenceTools } from './types';

export interface WriteStoredConsentOptions {
	/** Current time. Rejects envelopes carrying future timestamps. */
	now: number;
	/** Cookie attributes; defaults derive from `config`. */
	cookie?: CookieOptions;
	config?: StorageConfig;
}

export interface WriteReport {
	/** localStorage accepted the JSON envelope. */
	localStorage: boolean;
	/**
	 * The cookie assignment ran and the value read back matches. `false`
	 * covers both a thrown assignment and a silent browser drop; see
	 * `cookieDetail` to tell them apart.
	 */
	cookie: boolean;
	cookieDetail: CookieWriteReport;
}

export type WriteStoredConsentResult =
	| { ok: true; written: WriteReport; envelope: StoredConsentEnvelope }
	| { ok: false; issues: StorageIssue[] };

/** Report of one auxiliary write. */
export type AuxiliaryWriteReport = WriteReport;

/** The record writes, bound to the first-load functions they call. */
export interface RecordStore {
	/**
	 * Writes one v3 envelope to localStorage (JSON) and the cookie (compact)
	 * under the configured key. The envelope is validated first and nothing
	 * is written when it is malformed. Category times are written exactly
	 * as given; this function never stamps the clock. The legacy
	 * localStorage key is left untouched. When localStorage rejects the
	 * write but the cookie takes it, the older localStorage copy is removed.
	 * When only localStorage takes it, the cookie as it stands is stored
	 * under `<key>-cookie-miss`, so a read can tell that the local copy is
	 * newer until the cookie changes; a write that reaches the cookie
	 * removes that marker. `written.cookie` is true only when the cookie
	 * assignment ran and the value read back equals what was written;
	 * `written.cookieDetail` separates a thrown assignment (`attempted:
	 * false`, with the error) from a silent browser drop (`attempted: true,
	 * verified: false`).
	 */
	writeStoredConsentEnvelope: (
		envelope: StoredConsentEnvelope,
		options: WriteStoredConsentOptions
	) => WriteStoredConsentResult;
	/**
	 * Writes the local notice dismissal to localStorage and its compact
	 * cookie projection. The consent record and its cookie are never
	 * touched.
	 */
	writeStoredNoticeDismissal: (
		record: StoredNoticeDismissal,
		config: StorageConfig | undefined,
		now: number,
		cookie?: CookieOptions
	) => DecodeResult<StoredNoticeDismissal> & {
		written?: AuxiliaryWriteReport;
	};
	clearStoredNoticeDismissal: (
		config?: StorageConfig,
		cookie?: CookieOptions
	) => void;
	/**
	 * Writes the vendor denial list to localStorage and its compact cookie
	 * projection. The consent record and its cookie are never touched.
	 */
	writeStoredVendorChoice: (
		record: StoredVendorChoice,
		config: StorageConfig | undefined,
		now: number,
		cookie?: CookieOptions
	) => DecodeResult<StoredVendorChoice> & { written?: AuxiliaryWriteReport };
	clearStoredVendorChoice: (
		config?: StorageConfig,
		cookie?: CookieOptions
	) => void;
	/**
	 * Writes the clear epoch to localStorage and its cookie. Written by
	 * `clear()` after it removes the records, and never removed by it, so
	 * every runtime can tell decisions made before the clear from later
	 * ones.
	 */
	writeStoredClearEpoch: (
		epoch: number,
		config: StorageConfig | undefined,
		cookie?: CookieOptions
	) => AuxiliaryWriteReport;
	/**
	 * Removes explicit choices (configured and legacy keys, cookie and
	 * localStorage), the notice dismissal and the vendor denials with their
	 * cookie projections, and the legacy `<key>-privacy` record an alpha may
	 * have left. Cookie deletion uses the same domain handling as writes so
	 * a cross-subdomain cookie is actually removed.
	 *
	 * Queued backend replays and subject reassignments are the kernel's
	 * save outbox: the kernel drops them under the outbox lock on the
	 * `records:cleared` event that follows a clear.
	 */
	clearStoredConsentRecords: (
		cookie?: CookieOptions,
		config?: StorageConfig
	) => void;
}

const hasLocalStorage = function hasLocalStorage(): boolean {
	return typeof window !== 'undefined' && Boolean(window.localStorage);
};

const writeLocalStorageText = function writeLocalStorageText(
	key: string,
	text: string
): boolean {
	try {
		if (hasLocalStorage()) {
			window.localStorage.setItem(key, text);
			return true;
		}
	} catch (error) {
		console.warn('Failed to save consent to localStorage:', error);
	}
	return false;
};

const removeLocalStorageKey = function removeLocalStorageKey(
	key: string
): void {
	try {
		if (hasLocalStorage()) {
			window.localStorage.removeItem(key);
		}
	} catch (error) {
		console.warn('Failed to remove consent from localStorage:', error);
	}
};

/**
 * Bind the record writes to the first-load functions they call.
 *
 * @param tools - Storage keys, validators, cookie reads and writes.
 * @returns The record writes.
 */
export const createRecordStore = function createRecordStore(
	tools: PersistenceTools
): RecordStore {
	/** Write one record's localStorage copy and cookie projection. */
	const writeBoth = function writeBoth(
		key: string,
		local: string,
		compact: string,
		config: StorageConfig | undefined,
		cookie?: CookieOptions
	): AuxiliaryWriteReport {
		const localStorageWritten = writeLocalStorageText(key, local);
		const cookieDetail = tools.writeCookie(key, compact, cookie, config);
		return {
			cookie: cookieDetail.attempted && cookieDetail.verified,
			cookieDetail,
			localStorage: localStorageWritten,
		};
	};

	const removeBoth = function removeBoth(
		key: string,
		config: StorageConfig | undefined,
		cookie?: CookieOptions
	): void {
		removeLocalStorageKey(key);
		tools.deleteCookie(key, cookie, config);
	};

	const clearStoredNoticeDismissal: RecordStore['clearStoredNoticeDismissal'] =
		(config, cookie) => {
			removeBoth(tools.keys(config).notice, config, cookie);
		};

	const clearStoredVendorChoice: RecordStore['clearStoredVendorChoice'] = (
		config,
		cookie
	) => {
		removeBoth(tools.keys(config).vendors, config, cookie);
	};

	return {
		clearStoredConsentRecords(cookie, config) {
			const keys = tools.keys(config);
			// The configured consent key and the legacy one, localStorage first.
			const consentKeys = [keys.consent, keys.legacyConsent].filter(
				(key): key is string => key !== null
			);
			for (const key of consentKeys) {
				removeLocalStorageKey(key);
			}
			for (const key of consentKeys) {
				tools.deleteCookie(key, cookie, config);
			}
			removeLocalStorageKey(keys.cookieMiss);
			clearStoredNoticeDismissal(config, cookie);
			// v3 alphas stored standing GPC directives under `<key>-privacy`.
			// GPC is now a live signal that is never persisted, so the key is
			// only removed, so clearing c15t data still deletes what an alpha
			// left behind.
			removeBoth(`${keys.consent}-privacy`, config, cookie);
			clearStoredVendorChoice(config, cookie);
			// Addon bytes must be removed even when the addon is not mounted.
			removeLocalStorageKey('c15t-iab-authority-v1');
			removeLocalStorageKey('euconsent-v2');
			tools.deleteCookie('euconsent-v2', cookie, config);
			tools.deleteCookie('euconsent-v2');
		},
		clearStoredNoticeDismissal,
		clearStoredVendorChoice,
		writeStoredClearEpoch(epoch, config, cookie) {
			const text = encodeClearEpoch(epoch);
			return writeBoth(tools.keys(config).epoch, text, text, config, cookie);
		},
		writeStoredConsentEnvelope(envelope, options) {
			const validated = tools.validateEnvelope(envelope, options.now);
			if (validated.ok === false) {
				return validated;
			}
			const keys = tools.keys(options.config);
			const localStorageWritten = writeLocalStorageText(
				keys.consent,
				encodeStoredConsentEnvelopeJson(validated.record)
			);
			const cookieDetail = tools.writeCookie(
				keys.consent,
				encodeStoredConsentEnvelopeCompact(validated.record),
				options.cookie,
				options.config
			);
			if (!cookieDetail.attempted && cookieDetail.error !== undefined) {
				console.warn('Failed to save consent to cookie:', cookieDetail.error);
			}
			const cookieWritten = cookieDetail.attempted && cookieDetail.verified;
			if (cookieWritten) {
				removeLocalStorageKey(keys.cookieMiss);
				// The local copy is now older than the cookie.
				if (!localStorageWritten) {
					removeLocalStorageKey(keys.consent);
				}
			} else if (localStorageWritten) {
				writeLocalStorageText(
					keys.cookieMiss,
					tools.rawCookie(keys.consent) ?? ''
				);
			}

			return {
				envelope: validated.record,
				ok: true,
				written: {
					cookie: cookieWritten,
					cookieDetail,
					localStorage: localStorageWritten,
				},
			};
		},
		writeStoredNoticeDismissal(record, config, now, cookie) {
			const validated = tools.decodeNotice(record, now);
			if (validated.ok === false) {
				return validated;
			}
			return {
				...validated,
				written: writeBoth(
					tools.keys(config).notice,
					encodeNoticeDismissal(validated.record),
					encodeNoticeDismissalCompact(validated.record),
					config,
					cookie
				),
			};
		},
		writeStoredVendorChoice(record, config, now, cookie) {
			const validated = tools.decodeVendors(record, now);
			if (validated.ok === false) {
				return validated;
			}
			return {
				...validated,
				written: writeBoth(
					tools.keys(config).vendors,
					encodeVendorChoice(validated.record),
					encodeVendorChoiceCompact(validated.record),
					config,
					cookie
				),
			};
		},
	};
};
