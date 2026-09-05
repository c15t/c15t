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
 * - Cookie bytes are recognized by form before any decoding. Percent
 *   sequences inside a raw v2 value are identity bytes, not encoding.
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
	expandFlatKeys,
	getRawCookieValue,
	readCookieValueFromHeader,
	stringToFlat,
	writeCookie,
} from '../../libs/cookie';
import type {
	CookieOptions,
	CookieWriteReport,
	StorageConfig,
} from '../../libs/cookie';
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../libs/storage-keys';
import {
	decodeNoticeDismissal,
	decodePrivacyOptOuts,
	decodeStoredConsentEnvelopeCompact,
	encodeNoticeDismissal,
	encodePrivacyOptOuts,
	encodeStoredConsentEnvelopeCompact,
	encodeStoredConsentEnvelopeJson,
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
			/**
			 * Text handed to the decoder: the stored bytes with surrounding
			 * whitespace removed and, only when the bytes matched no known form,
			 * one outer URI-encoding layer unwrapped.
			 */
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

const parseJsonText = function parseJsonText(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return undefined;
	}
};

const tryDecodeOuterLayer = function tryDecodeOuterLayer(
	value: string
): string | null {
	try {
		return decodeURIComponent(value);
	} catch {
		return null;
	}
};

const LEGACY_BOOLEAN_MAPS: ReadonlySet<string> = new Set([
	'consents',
	'iabCustomVendorConsents',
	'iabCustomVendorLegitimateInterests',
]);

const DIGITS_ONLY = /^\d+$/u;

/**
 * Types one v2 compact leaf by its path instead of by what the text looks
 * like. The generic v2 parser turns `i.eid:12345` into a number and
 * `i.idp:1` into `true`, which then fails identity validation and throws
 * away the whole record. Here only `consentInfo.time` is numeric and only
 * category and vendor flags are booleans; every other leaf stays a string.
 * Unrecognized flag text and non-digit time text are kept verbatim so the
 * legacy normalizer reports them as invalid.
 */
const typeLegacyCompactLeaf = function typeLegacyCompactLeaf(
	path: readonly string[],
	value: string
): unknown {
	const [head, ...rest] = path;
	if (head === 'consentInfo' && rest.length === 1 && rest[0] === 'time') {
		return DIGITS_ONLY.test(value) ? Number(value) : value;
	}
	if (
		head !== undefined &&
		LEGACY_BOOLEAN_MAPS.has(head) &&
		rest.length === 1
	) {
		if (value === '1') {
			return true;
		}
		if (value === '0') {
			return false;
		}
	}
	return value;
};

/**
 * Decodes v2 compact `key:value,key:value` text into the `{ consents,
 * consentInfo, ... }` object the legacy normalizer expects. Nested objects
 * are only created for own keys and any `__proto__` segment drops the
 * entry, so cookie bytes cannot reach the prototype chain.
 */
const decodeLegacyCompact = function decodeLegacyCompact(
	text: string
): Record<string, unknown> | null {
	const expanded = expandFlatKeys(stringToFlat(text));
	const result: Record<string, unknown> = {};
	let leaves = 0;
	for (const [flatKey, value] of Object.entries(expanded)) {
		const path = flatKey.split('.');
		if (path.length === 0 || path.includes('__proto__')) {
			continue;
		}
		let current = result;
		for (const segment of path.slice(0, -1)) {
			const existing = Object.hasOwn(current, segment)
				? current[segment]
				: undefined;
			if (!isPlainRecord(existing)) {
				current[segment] = {};
			}
			current = current[segment] as Record<string, unknown>;
		}
		const leaf = path.at(-1);
		if (leaf === undefined) {
			continue;
		}
		current[leaf] = typeLegacyCompactLeaf(path, value);
		leaves += 1;
	}
	return leaves > 0 ? result : null;
};

type RecognizedCookieForm =
	| { kind: 'versioned'; text: string }
	| { kind: 'json'; text: string }
	| { kind: 'legacy-compact'; text: string };

const VERSION_FIELD_START = /^v=/u;

/**
 * Recognizes the stored bytes without decoding them. Surrounding
 * whitespace is ignored for recognition only.
 *
 * - `v=` at the start is a reserved version field, whatever follows it.
 * - `{` at the start is JSON.
 * - A `:` anywhere is the v2 compact `key:value` marker. The v2 writer
 *   never percent-encodes, so a `%2F` inside a compact or JSON value is
 *   part of the stored identity and must not be decoded away.
 */
const recognizeCookieForm = function recognizeCookieForm(
	value: string
): RecognizedCookieForm | null {
	const text = value.trim();
	if (text.length === 0) {
		return null;
	}
	if (VERSION_FIELD_START.test(text)) {
		return { kind: 'versioned', text };
	}
	if (text.startsWith('{')) {
		return { kind: 'json', text };
	}
	if (text.includes(':')) {
		return { kind: 'legacy-compact', text };
	}
	return null;
};

/**
 * Turns a raw cookie value into a candidate.
 *
 * Recognition is format-aware and happens before any decoding. Only when
 * the bytes match no known form and contain a `%` is one outer layer of
 * URI encoding removed and recognition retried; that single unwrap keeps
 * the component escapes inside a valid v3 cookie intact. Any reserved
 * version field, including a malformed or unknown one, goes to the
 * versioned decoder and never falls through to the legacy parser. JSON
 * objects (JSON whitespace allowed) are `json` encoding; v2 `key:value`
 * text is `compact` and is decoded by path-typed leaves so numeric-looking
 * identifiers stay strings.
 */
export const parseRawCookieCandidate = function parseRawCookieCandidate(
	rawValue: string | null | undefined,
	key: string
): RawStoredCandidate {
	const source: StoredRecordSource = 'cookie';
	if (rawValue === null || rawValue === undefined || rawValue === '') {
		return { key, source, status: 'absent' };
	}
	let form = recognizeCookieForm(rawValue);
	if (!form && rawValue.includes('%')) {
		const unwrapped = tryDecodeOuterLayer(rawValue);
		if (unwrapped !== null) {
			form = recognizeCookieForm(unwrapped);
		}
	}
	if (!form) {
		return { key, source, status: 'unparseable' };
	}
	if (form.kind === 'versioned') {
		return {
			encoding: 'compact',
			format: 'compact-v3',
			key,
			rawText: form.text,
			source,
			status: 'parsed',
			value: undefined,
		};
	}
	if (form.kind === 'json') {
		const value = parseJsonText(form.text);
		if (!isPlainRecord(value)) {
			return { key, source, status: 'unparseable' };
		}
		return {
			encoding: 'json',
			format: 'parsed',
			key,
			rawText: form.text,
			source,
			status: 'parsed',
			value,
		};
	}
	const value = decodeLegacyCompact(form.text);
	if (value === null) {
		return { key, source, status: 'unparseable' };
	}
	return {
		encoding: 'compact',
		format: 'parsed',
		key,
		rawText: form.text,
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
 * Writes one v3 envelope to localStorage (JSON) and the cookie (compact)
 * under the configured key. The envelope is validated first and nothing
 * is written when it is malformed. Category times are written exactly as
 * given; this function never stamps the clock. The legacy localStorage
 * key is left untouched. `written.cookie` is true only when the cookie
 * assignment ran and the value read back equals what was written;
 * `written.cookieDetail` separates a thrown assignment (`attempted:
 * false`, with the error) from a silent browser drop (`attempted: true,
 * verified: false`).
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
	const localStorageWritten = writeLocalStorageText(
		keys.consent,
		encodeStoredConsentEnvelopeJson(validated.record)
	);
	const cookieDetail = writeCookie(
		keys.consent,
		encodeStoredConsentEnvelopeCompact(validated.record),
		options.cookie,
		options.config
	);
	if (!cookieDetail.attempted && cookieDetail.error !== undefined) {
		console.warn('Failed to save consent to cookie:', cookieDetail.error);
	}

	return {
		envelope: validated.record,
		ok: true,
		written: {
			cookie: cookieDetail.attempted && cookieDetail.verified,
			cookieDetail,
			localStorage: localStorageWritten,
		},
	};
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
