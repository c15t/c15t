/**
 * Storage boundary for consent records.
 *
 * Reads raw stored candidates with their provenance, decodes them into
 * the reviewed per-category receipt model, and writes the v3 envelope
 * only when explicitly asked. This file is the kernel owner's entry
 * point; nothing here is wired into the live persistence module yet.
 *
 * Read guarantees:
 *
 * - Read-only. No migration, mirroring, deletion, callback or
 *   `Date.now()` on any read path. Callers pass `now`.
 * - Candidates are inspected in a fixed order: cookie, localStorage under
 *   the configured key, localStorage under the legacy key. The first
 *   structurally valid candidate wins. Structural validity is the only
 *   selection criterion: a semantically expired but well-formed cookie
 *   still wins over a fresher localStorage record, so a stale local copy
 *   can never resurrect authority the cookie no longer carries.
 * - Encoding provenance is kept. A v2 compact cookie omitted `false`, so
 *   the legacy normalizer restores `false` for the known legacy universe
 *   only for that encoding; a v2 JSON record keeps absent keys absent.
 *   The raw parsed value is exposed before normalization so callers can
 *   see original coverage.
 * - A versioned envelope is never decoded with the legacy reader, and a
 *   v1.x `id`-only record is rejected as unsupported, not read as v2.
 *
 * @internal
 */

import { normalizeLegacyConsentRecord } from '../../consent-record/normalize';
import type { LegacyRecordEncoding } from '../../consent-record/normalize';
import type {
	ConsentSubject,
	ExplicitChoice,
	PrivacyOptOut,
} from '../../consent-record/types';
import { isPlainRecord, ownValue } from '../../consent-record/validation';
import {
	deleteConsentFromStorage,
	getRawCookieValue,
	parseCookieValue,
	readCookieValueFromHeader,
	setCookie,
} from '../../libs/cookie';
import type { CookieOptions, StorageConfig } from '../../libs/cookie';
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../libs/storage-keys';
import {
	decodeNoticeDismissal,
	decodePrivacyOptOuts,
	decodeStoredConsentEnvelopeCompact,
	encodeNoticeDismissal,
	encodePrivacyOptOuts,
	encodeStoredConsentEnvelopeCompact,
	encodeStoredConsentEnvelopeJson,
	hasVersionedCompactPrefix,
	validateIabMetadata,
	validateStoredConsentEnvelope,
} from './record-codec';
import type {
	DecodeResult,
	StorageIssue,
	StoredConsentEnvelope,
	StoredIabMetadata,
	StoredNoticeDismissal,
	StoredPrivacyOptOuts,
} from './record-codec';

export type { LegacyRecordEncoding as StoredRecordEncoding };

/** Where a candidate was read from, in selection order. */
export type StoredRecordSource =
	| 'cookie'
	| 'local-storage'
	| 'legacy-local-storage';

/** Which record format a parsed candidate turned out to be. */
export type StoredRecordFormat = 'legacy-v2' | 'v3';

/**
 * The storage keys one configuration resolves to. Notice dismissals and
 * privacy directives get their own keys derived from the consent key so
 * a custom `storageKey` moves all three together.
 */
export interface ResolvedStorageKeys {
	consent: string;
	/** `null` when the configured key already is the legacy key. */
	legacyConsent: string | null;
	notice: string;
	privacy: string;
}

export const resolveStorageKeys = function resolveStorageKeys(
	config?: StorageConfig
): ResolvedStorageKeys {
	const consent = config?.storageKey || STORAGE_KEY_V2;
	return {
		consent,
		legacyConsent: consent === STORAGE_KEY ? null : STORAGE_KEY,
		notice: `${consent}-notice`,
		privacy: `${consent}-privacy`,
	};
};

/** One raw stored value, parsed but not validated or normalized. */
export type RawStoredCandidate =
	| { source: StoredRecordSource; key: string; status: 'absent' }
	| { source: StoredRecordSource; key: string; status: 'unparseable' }
	| {
			source: StoredRecordSource;
			key: string;
			status: 'parsed';
			/** How the bytes were encoded. Drives legacy `false` restoration. */
			encoding: LegacyRecordEncoding;
			/**
			 * Compact v3 cookies are decoded straight into an envelope by the
			 * codec; everything else is the parsed JSON or v2 compact object.
			 */
			format: 'compact-v3' | 'parsed';
			/** Parsed value exactly as stored. Absent keys are still absent. */
			value: unknown;
			/** Raw text for the compact v3 form. */
			rawText: string;
	  };

/** A structurally valid stored record in the reviewed receipt model. */
export interface DecodedStoredConsent {
	source: StoredRecordSource;
	key: string;
	encoding: LegacyRecordEncoding;
	format: StoredRecordFormat;
	choice: ExplicitChoice;
	subject: ConsentSubject | null;
	iab: StoredIabMetadata | null;
}

export type StoredConsentCandidate =
	| { source: StoredRecordSource; key: string; status: 'absent' }
	| { source: StoredRecordSource; key: string; status: 'unparseable' }
	| {
			source: StoredRecordSource;
			key: string;
			status: 'invalid';
			encoding: LegacyRecordEncoding;
			format: StoredRecordFormat;
			issues: StorageIssue[];
	  }
	| {
			source: StoredRecordSource;
			key: string;
			status: 'valid';
			record: DecodedStoredConsent;
	  };

export interface StoredConsentSelection {
	/** First structurally valid candidate in read order, or `null`. */
	selected: DecodedStoredConsent | null;
	/** Every candidate that was inspected, in read order. */
	candidates: StoredConsentCandidate[];
}

const decodeCookieText = function decodeCookieText(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

const parseJsonText = function parseJsonText(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return undefined;
	}
};

const JSON_OBJECT_START = /^\s*\{/u;

/**
 * Turns a raw cookie value into a candidate. Any versioned compact prefix
 * (`v=<n>`) is reserved before the legacy parser sees the bytes, so an
 * unknown version is rejected by the codec instead of being read as v2
 * data. A JSON object (JSON whitespace allowed) is accepted as `json`
 * encoding. Anything else goes through the v2 compact parser and must
 * produce an object to count as parsed.
 */
export const parseRawCookieCandidate = function parseRawCookieCandidate(
	rawValue: string | null | undefined,
	key: string
): RawStoredCandidate {
	const source: StoredRecordSource = 'cookie';
	if (rawValue === null || rawValue === undefined || rawValue === '') {
		return { key, source, status: 'absent' };
	}
	if (hasVersionedCompactPrefix(rawValue)) {
		return {
			encoding: 'compact',
			format: 'compact-v3',
			key,
			rawText: rawValue,
			source,
			status: 'parsed',
			value: undefined,
		};
	}
	const text = decodeCookieText(rawValue);
	if (JSON_OBJECT_START.test(text)) {
		const value = parseJsonText(text);
		if (!isPlainRecord(value)) {
			return { key, source, status: 'unparseable' };
		}
		return {
			encoding: 'json',
			format: 'parsed',
			key,
			rawText: rawValue,
			source,
			status: 'parsed',
			value,
		};
	}
	const value = parseCookieValue<unknown>(text);
	if (!isPlainRecord(value)) {
		return { key, source, status: 'unparseable' };
	}
	return {
		encoding: 'compact',
		format: 'parsed',
		key,
		rawText: rawValue,
		source,
		status: 'parsed',
		value,
	};
};

const readLocalStorageText = function readLocalStorageText(
	key: string
): string | null {
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			return window.localStorage.getItem(key);
		}
	} catch (error) {
		console.warn('Failed to read consent from localStorage:', error);
	}
	return null;
};

const parseLocalStorageCandidate = function parseLocalStorageCandidate(
	source: StoredRecordSource,
	key: string
): RawStoredCandidate {
	const text = readLocalStorageText(key);
	if (text === null || text === '') {
		return { key, source, status: 'absent' };
	}
	const value = parseJsonText(text);
	if (!isPlainRecord(value)) {
		return { key, source, status: 'unparseable' };
	}
	return {
		encoding: 'json',
		format: 'parsed',
		key,
		rawText: text,
		source,
		status: 'parsed',
		value,
	};
};

/**
 * Reads every raw candidate in selection order without validating any of
 * them. Nothing is written.
 */
export const readRawStoredConsentCandidates =
	function readRawStoredConsentCandidates(
		config?: StorageConfig
	): RawStoredCandidate[] {
		const keys = resolveStorageKeys(config);
		const candidates: RawStoredCandidate[] = [
			parseRawCookieCandidate(getRawCookieValue(keys.consent), keys.consent),
			parseLocalStorageCandidate('local-storage', keys.consent),
		];
		if (keys.legacyConsent) {
			candidates.push(
				parseLocalStorageCandidate('legacy-local-storage', keys.legacyConsent)
			);
		}
		return candidates;
	};

/**
 * Reads the single cookie candidate from a request `Cookie` header. The
 * server counterpart of {@link readRawStoredConsentCandidates}; there is
 * no localStorage to fall back to.
 */
export const readRawStoredConsentCandidateFromCookieHeader =
	function readRawStoredConsentCandidateFromCookieHeader(
		cookieHeader: string | undefined,
		config?: StorageConfig
	): RawStoredCandidate {
		const keys = resolveStorageKeys(config);
		return parseRawCookieCandidate(
			readCookieValueFromHeader(cookieHeader, keys.consent),
			keys.consent
		);
	};

const LEGACY_IAB_KEYS = {
	consents: 'iabCustomVendorConsents',
	legitimateInterests: 'iabCustomVendorLegitimateInterests',
} as const;

const decodeLegacyRecord = function decodeLegacyRecord(
	value: unknown,
	encoding: LegacyRecordEncoding,
	now: number
): DecodeResult<Omit<DecodedStoredConsent, 'source' | 'key' | 'encoding'>> {
	const normalized = normalizeLegacyConsentRecord(value, { encoding, now });
	if (normalized.ok === false) {
		return { issues: normalized.issues, ok: false };
	}
	const issues: StorageIssue[] = [];
	const record = value as Record<string, unknown>;
	const iab = validateIabMetadata(
		ownValue(record, LEGACY_IAB_KEYS.consents),
		ownValue(record, LEGACY_IAB_KEYS.legitimateInterests),
		'iab',
		issues
	);
	if (issues.length > 0) {
		return { issues, ok: false };
	}
	return {
		ok: true,
		record: {
			choice: normalized.choice,
			format: 'legacy-v2',
			iab: iab ?? null,
			subject: normalized.subject,
		},
	};
};

const decodeEnvelope = function decodeEnvelope(
	result: DecodeResult<StoredConsentEnvelope>
): DecodeResult<Omit<DecodedStoredConsent, 'source' | 'key' | 'encoding'>> {
	if (result.ok === false) {
		return result;
	}
	const { record } = result;
	return {
		ok: true,
		record: {
			choice: { categories: record.categories, version: 3 },
			format: 'v3',
			iab: record.iab ?? null,
			subject: record.subject ?? null,
		},
	};
};

/**
 * Structurally decodes one raw candidate. A parsed object with an own
 * `version` field is a versioned envelope and never falls through to the
 * legacy reader; anything else is read as a v2 record.
 */
export const decodeStoredConsentCandidate =
	function decodeStoredConsentCandidate(
		candidate: RawStoredCandidate,
		now: number
	): StoredConsentCandidate {
		if (candidate.status !== 'parsed') {
			return candidate;
		}
		const { encoding, key, source } = candidate;
		let format: StoredRecordFormat;
		let result: DecodeResult<
			Omit<DecodedStoredConsent, 'source' | 'key' | 'encoding'>
		>;
		if (candidate.format === 'compact-v3') {
			format = 'v3';
			result = decodeEnvelope(
				decodeStoredConsentEnvelopeCompact(candidate.rawText, now)
			);
		} else if (
			isPlainRecord(candidate.value) &&
			Object.hasOwn(candidate.value, 'version')
		) {
			format = 'v3';
			result = decodeEnvelope(
				validateStoredConsentEnvelope(candidate.value, now)
			);
		} else {
			format = 'legacy-v2';
			result = decodeLegacyRecord(candidate.value, encoding, now);
		}
		if (result.ok === false) {
			return {
				encoding,
				format,
				issues: result.issues,
				key,
				source,
				status: 'invalid',
			};
		}
		return {
			key,
			record: { ...result.record, encoding, key, source },
			source,
			status: 'valid',
		};
	};

/**
 * Decodes candidates in order and selects the first structurally valid
 * one. Semantic freshness is not consulted here; that belongs to the
 * evaluator with the same `now`.
 */
export const selectStoredConsent = function selectStoredConsent(
	rawCandidates: readonly RawStoredCandidate[],
	now: number
): StoredConsentSelection {
	const candidates: StoredConsentCandidate[] = [];
	let selected: DecodedStoredConsent | null = null;
	for (const raw of rawCandidates) {
		const candidate = decodeStoredConsentCandidate(raw, now);
		candidates.push(candidate);
		if (!selected && candidate.status === 'valid') {
			selected = candidate.record;
		}
	}
	return { candidates, selected };
};

/**
 * Browser read: cookie, then configured localStorage, then legacy
 * localStorage. Returns the first structurally valid record with the
 * full candidate report for diagnostics. Never writes.
 */
export const readStoredConsentRecord = function readStoredConsentRecord(
	config: StorageConfig | undefined,
	now: number
): StoredConsentSelection {
	return selectStoredConsent(readRawStoredConsentCandidates(config), now);
};

/**
 * Server read from a request `Cookie` header. Same decoding as the
 * browser cookie candidate, so SSR and hydration agree on the record.
 */
export const readStoredConsentRecordFromCookieHeader =
	function readStoredConsentRecordFromCookieHeader(
		cookieHeader: string | undefined,
		config: StorageConfig | undefined,
		now: number
	): StoredConsentSelection {
		return selectStoredConsent(
			[readRawStoredConsentCandidateFromCookieHeader(cookieHeader, config)],
			now
		);
	};

// ---------------------------------------------------------------------------
// Writes: only when the kernel explicitly asks
// ---------------------------------------------------------------------------

export interface WriteStoredConsentOptions {
	/** Current time. Rejects envelopes carrying future timestamps. */
	now: number;
	/** Cookie attributes; defaults derive from `config`. */
	cookie?: CookieOptions;
	config?: StorageConfig;
}

export interface WriteReport {
	localStorage: boolean;
	cookie: boolean;
}

export type WriteStoredConsentResult =
	| { ok: true; written: WriteReport; envelope: StoredConsentEnvelope }
	| { ok: false; issues: StorageIssue[] };

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

const hasDocument = function hasDocument(): boolean {
	return typeof document !== 'undefined';
};

/**
 * Writes one v3 envelope to localStorage (JSON) and the cookie (compact)
 * under the configured key. The envelope is validated first and nothing
 * is written when it is malformed. Category times are written exactly as
 * given; this function never stamps the clock. The legacy localStorage
 * key is left untouched.
 */
export const writeStoredConsentEnvelope = function writeStoredConsentEnvelope(
	envelope: StoredConsentEnvelope,
	options: WriteStoredConsentOptions
): WriteStoredConsentResult {
	const validated = validateStoredConsentEnvelope(envelope, options.now);
	if (validated.ok === false) {
		return validated;
	}
	const keys = resolveStorageKeys(options.config);
	const written: WriteReport = { cookie: false, localStorage: false };

	written.localStorage = writeLocalStorageText(
		keys.consent,
		encodeStoredConsentEnvelopeJson(validated.record)
	);

	if (hasDocument()) {
		try {
			setCookie(
				keys.consent,
				encodeStoredConsentEnvelopeCompact(validated.record),
				options.cookie,
				options.config
			);
			written.cookie = true;
		} catch (error) {
			console.warn('Failed to save consent to cookie:', error);
		}
	}

	return { envelope: validated.record, ok: true, written };
};

// ---------------------------------------------------------------------------
// Notice dismissal (local-only)
// ---------------------------------------------------------------------------

const readLocalJson = function readLocalJson<RecordType>(
	key: string,
	decode: (value: unknown) => DecodeResult<RecordType>
): DecodeResult<RecordType> | null {
	const text = readLocalStorageText(key);
	if (text === null || text === '') {
		return null;
	}
	const value = parseJsonText(text);
	if (value === undefined) {
		return {
			issues: [{ code: 'malformed-encoding', path: '' }],
			ok: false,
		};
	}
	return decode(value);
};

/**
 * Reads the local notice dismissal. `null` when nothing is stored; an
 * invalid record is reported, not silently treated as absent, so callers
 * can log it while still deriving `missing`.
 */
export const readStoredNoticeDismissal = function readStoredNoticeDismissal(
	config: StorageConfig | undefined,
	now: number
): DecodeResult<StoredNoticeDismissal> | null {
	return readLocalJson(resolveStorageKeys(config).notice, (value) =>
		decodeNoticeDismissal(value, now)
	);
};

/**
 * Writes the local notice dismissal. localStorage only: a dismissal is
 * browser-local and never changes permissions, so it has no cookie
 * projection in this slice.
 */
export const writeStoredNoticeDismissal = function writeStoredNoticeDismissal(
	record: StoredNoticeDismissal,
	config: StorageConfig | undefined,
	now: number
): DecodeResult<StoredNoticeDismissal> & { written?: boolean } {
	const validated = decodeNoticeDismissal(record, now);
	if (validated.ok === false) {
		return validated;
	}
	const written = writeLocalStorageText(
		resolveStorageKeys(config).notice,
		encodeNoticeDismissal(validated.record)
	);
	return { ok: true, record: validated.record, written };
};

export const clearStoredNoticeDismissal = function clearStoredNoticeDismissal(
	config?: StorageConfig
): void {
	removeLocalStorageKey(resolveStorageKeys(config).notice);
};

// ---------------------------------------------------------------------------
// Privacy opt-out directives (local-only)
// ---------------------------------------------------------------------------

/** Reads standing privacy directives. `null` when nothing is stored. */
export const readStoredPrivacyOptOuts = function readStoredPrivacyOptOuts(
	config: StorageConfig | undefined,
	now: number
): DecodeResult<StoredPrivacyOptOuts> | null {
	return readLocalJson(resolveStorageKeys(config).privacy, (value) =>
		decodePrivacyOptOuts(value, now)
	);
};

/**
 * Writes standing privacy directives. localStorage only. The list is
 * replaced wholesale; merging with an identified-subject directive on
 * the server is a transport concern outside this slice.
 */
export const writeStoredPrivacyOptOuts = function writeStoredPrivacyOptOuts(
	directives: readonly PrivacyOptOut[],
	config: StorageConfig | undefined,
	now: number
): DecodeResult<StoredPrivacyOptOuts> & { written?: boolean } {
	const validated = decodePrivacyOptOuts({ directives, version: 1 }, now);
	if (validated.ok === false) {
		return validated;
	}
	const written = writeLocalStorageText(
		resolveStorageKeys(config).privacy,
		encodePrivacyOptOuts(validated.record)
	);
	return { ok: true, record: validated.record, written };
};

export const clearStoredPrivacyOptOuts = function clearStoredPrivacyOptOuts(
	config?: StorageConfig
): void {
	removeLocalStorageKey(resolveStorageKeys(config).privacy);
};

// ---------------------------------------------------------------------------
// Clear everything
// ---------------------------------------------------------------------------

/**
 * Removes explicit choices (configured and legacy keys, cookie and
 * localStorage), the notice dismissal and the privacy directives. Cookie
 * deletion uses the same domain handling as writes so a cross-subdomain
 * cookie is actually removed.
 */
export const clearStoredConsentRecords = function clearStoredConsentRecords(
	cookie?: CookieOptions,
	config?: StorageConfig
): void {
	deleteConsentFromStorage(cookie, config);
	clearStoredNoticeDismissal(config);
	clearStoredPrivacyOptOuts(config);
};
