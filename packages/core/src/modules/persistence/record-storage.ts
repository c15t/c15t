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
	deleteCookie,
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
import {
	PENDING_SAVES_STORAGE_KEY,
	STORAGE_KEY,
	STORAGE_KEY_V2,
} from '../../libs/storage-keys';
import { choiceSinceEpoch } from './epoch';
import {
	decodeClearEpoch,
	decodeNoticeDismissal,
	decodeNoticeDismissalCompact,
	decodePrivacyOptOuts,
	decodePrivacyOptOutsCompact,
	decodeStoredConsentEnvelopeCompact,
	decodeVendorChoice,
	decodeVendorChoiceCompact,
	encodeClearEpoch,
	encodeNoticeDismissal,
	encodeNoticeDismissalCompact,
	encodePrivacyOptOuts,
	encodePrivacyOptOutsCompact,
	encodeStoredConsentEnvelopeCompact,
	encodeStoredConsentEnvelopeJson,
	encodeVendorChoice,
	encodeVendorChoiceCompact,
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
	StoredVendorChoice,
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
 * The storage keys one configuration resolves to. Notice dismissals,
 * privacy directives, vendor denials and the clear epoch get their own
 * keys derived from the consent key so a custom `storageKey` moves them
 * all together.
 */
export interface ResolvedStorageKeys {
	consent: string;
	/** `null` when the configured key already is the legacy key. */
	legacyConsent: string | null;
	notice: string;
	privacy: string;
	vendors: string;
	/** Time of the last clear. Survives the clear it records. */
	epoch: string;
}

export const resolveStorageKeys = function resolveStorageKeys(
	config?: StorageConfig
): ResolvedStorageKeys {
	const consent = config?.storageKey || STORAGE_KEY_V2;
	return {
		consent,
		epoch: `${consent}-epoch`,
		legacyConsent: consent === STORAGE_KEY ? null : STORAGE_KEY,
		notice: `${consent}-notice`,
		privacy: `${consent}-privacy`,
		vendors: `${consent}-vendors`,
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
	/** Clear epoch the record was written under; `0` for legacy records. */
	epoch: number;
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
	key: string,
	onUnavailable?: () => void
): string | null {
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			return window.localStorage.getItem(key);
		}
	} catch (error) {
		console.warn('Failed to read consent from localStorage:', error);
	}
	onUnavailable?.();
	return null;
};

const parseLocalStorageCandidate = function parseLocalStorageCandidate(
	source: StoredRecordSource,
	key: string,
	onUnavailable?: () => void
): RawStoredCandidate {
	const text = readLocalStorageText(key, onUnavailable);
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
		config?: StorageConfig,
		onUnavailable?: () => void
	): RawStoredCandidate[] {
		const keys = resolveStorageKeys(config);
		const candidates: RawStoredCandidate[] = [
			parseRawCookieCandidate(
				getRawCookieValue(keys.consent, onUnavailable),
				keys.consent
			),
			parseLocalStorageCandidate('local-storage', keys.consent, onUnavailable),
		];
		if (keys.legacyConsent) {
			candidates.push(
				parseLocalStorageCandidate(
					'legacy-local-storage',
					keys.legacyConsent,
					onUnavailable
				)
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
			epoch: 0,
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
			epoch: record.epoch ?? 0,
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
 * The categories of `record` still in force under `epoch`: decisions made
 * before the clear are void, and one in the clearing millisecond counts
 * only when the record was written under that epoch.
 */
const categoriesSinceEpoch = function categoriesSinceEpoch(
	record: DecodedStoredConsent,
	epoch: number
): ExplicitChoice['categories'] {
	return (
		choiceSinceEpoch(record.choice, epoch, record.epoch === epoch)
			?.categories ?? {}
	);
};

/**
 * The cookie record with every newer localStorage denial applied, or the
 * cookie record itself when there is none.
 *
 * The cookie stays authoritative: a well-formed cookie wins even when it is
 * expired, so a stale local copy can never resurrect authority the cookie
 * no longer carries. But a browser can drop a cookie write (over the size
 * limit, say) while localStorage takes it, and then the cookie holds an
 * older choice. A local denial newer than the cookie's decision for that
 * category is therefore applied on top of it; a newer local grant never
 * is, so the result only ever moves toward less permission.
 *
 * When the two were written under different clear epochs, both are first
 * cut to the later one: each side's decisions from before it are void. The
 * same rule then applies, so a later epoch never lets a local grant replace
 * a cookie denial.
 */
const withNewerLocalDenials = function withNewerLocalDenials(
	cookie: DecodedStoredConsent,
	local: DecodedStoredConsent
): DecodedStoredConsent {
	const epoch = Math.max(cookie.epoch, local.epoch);
	const categories = categoriesSinceEpoch(cookie, epoch);
	const cut =
		Object.keys(categories).length !==
		Object.keys(cookie.choice.categories).length;
	let changed = cut || epoch !== cookie.epoch;
	for (const [category, decision] of Object.entries(
		categoriesSinceEpoch(local, epoch)
	)) {
		const current = categories[category as keyof typeof categories];
		if (
			decision &&
			decision.value === false &&
			(!current || decision.confirmedAt > current.confirmedAt)
		) {
			categories[category as keyof typeof categories] = decision;
			changed = true;
		}
	}
	if (!changed) {
		return cookie;
	}
	// The subject and IAB metadata belong to the clear history they were
	// written in. A copy from before the later epoch never saw that clear,
	// so its identity is void with its decisions; take the later copy's.
	const identity = cookie.epoch === epoch ? cookie : local;
	return {
		...cookie,
		choice: { categories, version: 3 },
		epoch,
		iab: identity.iab,
		subject: identity.subject,
	};
};

/**
 * Decodes candidates and selects one. The cookie wins over the configured
 * localStorage key, with the local copy's newer denials applied (see
 * {@link withNewerLocalDenials}); the configured localStorage record is
 * used alone only when the cookie holds no valid one, and the legacy key
 * only when neither does. Semantic freshness is not consulted here; that
 * belongs to the evaluator with the same `now`.
 */
export const selectStoredConsent = function selectStoredConsent(
	rawCandidates: readonly RawStoredCandidate[],
	now: number
): StoredConsentSelection {
	const candidates: StoredConsentCandidate[] = [];
	const valid = new Map<StoredRecordSource, DecodedStoredConsent>();
	for (const raw of rawCandidates) {
		const candidate = decodeStoredConsentCandidate(raw, now);
		candidates.push(candidate);
		if (candidate.status === 'valid' && !valid.has(candidate.source)) {
			valid.set(candidate.source, candidate.record);
		}
	}
	const cookie = valid.get('cookie');
	const local = valid.get('local-storage');
	let selected: DecodedStoredConsent | null = null;
	if (cookie && local) {
		selected = withNewerLocalDenials(cookie, local);
	} else {
		selected = cookie ?? local ?? valid.get('legacy-local-storage') ?? null;
	}
	return { candidates, selected };
};

/**
 * Browser read of the cookie, the configured localStorage key and the
 * legacy localStorage key. The cookie wins, with newer denials from the
 * configured localStorage copy applied (see {@link selectStoredConsent}),
 * and the full candidate report is returned for diagnostics. A server
 * render reads the cookie alone, so the two agree except when the browser
 * dropped a cookie write that carried a denial, where the browser is the
 * stricter of the two. Never writes.
 */
export const readStoredConsentRecord = function readStoredConsentRecord(
	config: StorageConfig | undefined,
	now: number,
	onUnavailable?: () => void
): StoredConsentSelection {
	return selectStoredConsent(
		readRawStoredConsentCandidates(config, onUnavailable),
		now
	);
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
// Auxiliary records: notice dismissal and privacy opt-outs
//
// Each lives under its own localStorage key and has a compact cookie
// projection under the same name so a server render can read it from the
// request. The cookie is read first, then localStorage, mirroring the
// consent record order. Neither is ever written during hydration.
// ---------------------------------------------------------------------------

const readLocalJson = function readLocalJson<RecordType>(
	key: string,
	decode: (value: unknown) => DecodeResult<RecordType>,
	onUnavailable?: () => void
): DecodeResult<RecordType> | null {
	const text = readLocalStorageText(key, onUnavailable);
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

const readCompactCookie = function readCompactCookie<RecordType>(
	rawValue: string | null | undefined,
	decode: (text: string) => DecodeResult<RecordType>
): DecodeResult<RecordType> | null {
	if (rawValue === null || rawValue === undefined) {
		return null;
	}
	const text = rawValue.trim();
	if (text === '') {
		return null;
	}
	if (text.startsWith('v=')) {
		return decode(text);
	}
	if (text.includes('%')) {
		const unwrapped = tryDecodeOuterLayer(text);
		if (unwrapped !== null && unwrapped.trim().startsWith('v=')) {
			return decode(unwrapped.trim());
		}
	}
	return { issues: [{ code: 'malformed-encoding', path: '' }], ok: false };
};

/** Report of one auxiliary write. */
export interface AuxiliaryWriteReport {
	localStorage: boolean;
	cookie: boolean;
	cookieDetail: CookieWriteReport;
}

/**
 * Reads the local notice dismissal: the cookie projection first, then
 * localStorage. `null` when nothing is stored; an invalid record is
 * reported, not silently treated as absent, so callers can log it while
 * still deriving `missing`.
 */
export const readStoredNoticeDismissal = function readStoredNoticeDismissal(
	config: StorageConfig | undefined,
	now: number,
	onUnavailable?: () => void
): DecodeResult<StoredNoticeDismissal> | null {
	const keys = resolveStorageKeys(config);
	const fromCookie = readCompactCookie(
		getRawCookieValue(keys.notice, onUnavailable),
		(text) => decodeNoticeDismissalCompact(text, now)
	);
	const fromLocal = readLocalJson(
		keys.notice,
		(value) => decodeNoticeDismissal(value, now),
		onUnavailable
	);
	// The newer dismissal wins, the cookie on a tie. A dismissal only hides
	// the notice for the fingerprint it names, which the evaluator checks,
	// and it never grants a category.
	if (fromCookie?.ok && fromLocal?.ok) {
		return fromLocal.record.dismissedAt > fromCookie.record.dismissedAt
			? fromLocal
			: fromCookie;
	}
	if (fromCookie?.ok) {
		return fromCookie;
	}
	return fromLocal ?? fromCookie;
};

/** Server read of the notice cookie projection from a `Cookie` header. */
export const readStoredNoticeDismissalFromCookieHeader =
	function readStoredNoticeDismissalFromCookieHeader(
		cookieHeader: string | undefined,
		config: StorageConfig | undefined,
		now: number
	): DecodeResult<StoredNoticeDismissal> | null {
		const keys = resolveStorageKeys(config);
		return readCompactCookie(
			readCookieValueFromHeader(cookieHeader, keys.notice),
			(text) => decodeNoticeDismissalCompact(text, now)
		);
	};

/**
 * Writes the local notice dismissal to localStorage and its compact cookie
 * projection. The consent record and its cookie are never touched.
 */
export const writeStoredNoticeDismissal = function writeStoredNoticeDismissal(
	record: StoredNoticeDismissal,
	config: StorageConfig | undefined,
	now: number,
	cookie?: CookieOptions
): DecodeResult<StoredNoticeDismissal> & { written?: AuxiliaryWriteReport } {
	const validated = decodeNoticeDismissal(record, now);
	if (validated.ok === false) {
		return validated;
	}
	const keys = resolveStorageKeys(config);
	const localStorageWritten = writeLocalStorageText(
		keys.notice,
		encodeNoticeDismissal(validated.record)
	);
	const cookieDetail = writeCookie(
		keys.notice,
		encodeNoticeDismissalCompact(validated.record),
		cookie,
		config
	);
	return {
		ok: true,
		record: validated.record,
		written: {
			cookie: cookieDetail.attempted && cookieDetail.verified,
			cookieDetail,
			localStorage: localStorageWritten,
		},
	};
};

export const clearStoredNoticeDismissal = function clearStoredNoticeDismissal(
	config?: StorageConfig,
	cookie?: CookieOptions
): void {
	const keys = resolveStorageKeys(config);
	removeLocalStorageKey(keys.notice);
	deleteCookie(keys.notice, cookie, config);
};

/** Both directive lists without duplicates, oldest first. */
const unionDirectives = function unionDirectives(
	left: readonly PrivacyOptOut[],
	right: readonly PrivacyOptOut[]
): PrivacyOptOut[] {
	const byKey = new Map<string, PrivacyOptOut>();
	for (const directive of [...left, ...right]) {
		const key = JSON.stringify([
			directive.recordedAt,
			directive.source,
			[...directive.categories].sort(),
		]);
		if (!byKey.has(key)) {
			byKey.set(key, directive);
		}
	}
	return [...byKey.values()].sort(
		(first, second) => first.recordedAt - second.recordedAt
	);
};

/**
 * Reads standing privacy directives: the cookie projection first, then
 * localStorage. `null` when nothing is stored.
 */
export const readStoredPrivacyOptOuts = function readStoredPrivacyOptOuts(
	config: StorageConfig | undefined,
	now: number,
	onUnavailable?: () => void
): DecodeResult<StoredPrivacyOptOuts> | null {
	const keys = resolveStorageKeys(config);
	const fromCookie = readCompactCookie(
		getRawCookieValue(keys.privacy, onUnavailable),
		(text) => decodePrivacyOptOutsCompact(text, now)
	);
	const fromLocal = readLocalJson(
		keys.privacy,
		(value) => decodePrivacyOptOuts(value, now),
		onUnavailable
	);
	// Directives only restrict, so both copies count: a dropped cookie write
	// cannot lose a directive the localStorage copy holds.
	if (fromCookie?.ok && fromLocal?.ok) {
		return {
			ok: true,
			record: {
				...fromCookie.record,
				directives: unionDirectives(
					fromCookie.record.directives,
					fromLocal.record.directives
				),
			},
		};
	}
	if (fromCookie?.ok) {
		return fromCookie;
	}
	return fromLocal ?? fromCookie;
};

/** Server read of the privacy cookie projection from a `Cookie` header. */
export const readStoredPrivacyOptOutsFromCookieHeader =
	function readStoredPrivacyOptOutsFromCookieHeader(
		cookieHeader: string | undefined,
		config: StorageConfig | undefined,
		now: number
	): DecodeResult<StoredPrivacyOptOuts> | null {
		const keys = resolveStorageKeys(config);
		return readCompactCookie(
			readCookieValueFromHeader(cookieHeader, keys.privacy),
			(text) => decodePrivacyOptOutsCompact(text, now)
		);
	};

/**
 * Writes standing privacy directives to localStorage and the compact
 * cookie projection. The list is replaced wholesale; merging with an
 * identified-subject directive on the server is a transport concern.
 */
export const writeStoredPrivacyOptOuts = function writeStoredPrivacyOptOuts(
	directives: readonly PrivacyOptOut[],
	config: StorageConfig | undefined,
	now: number,
	cookie?: CookieOptions
): DecodeResult<StoredPrivacyOptOuts> & { written?: AuxiliaryWriteReport } {
	const validated = decodePrivacyOptOuts({ directives, version: 1 }, now);
	if (validated.ok === false) {
		return validated;
	}
	const keys = resolveStorageKeys(config);
	const localStorageWritten = writeLocalStorageText(
		keys.privacy,
		encodePrivacyOptOuts(validated.record)
	);
	const cookieDetail = writeCookie(
		keys.privacy,
		encodePrivacyOptOutsCompact(validated.record),
		cookie,
		config
	);
	return {
		ok: true,
		record: validated.record,
		written: {
			cookie: cookieDetail.attempted && cookieDetail.verified,
			cookieDetail,
			localStorage: localStorageWritten,
		},
	};
};

export const clearStoredPrivacyOptOuts = function clearStoredPrivacyOptOuts(
	config?: StorageConfig,
	cookie?: CookieOptions
): void {
	const keys = resolveStorageKeys(config);
	removeLocalStorageKey(keys.privacy);
	deleteCookie(keys.privacy, cookie, config);
};

/**
 * Reads the vendor denial list from both projections. The two can
 * disagree: a compact cookie that grew past the browser's limit fails to
 * write while localStorage already holds the new list. When the local copy
 * is at least as new, its denials are added to the cookie's and its time
 * and subject are kept; an equal time with different content means the
 * cookie missed the subject rewrite after `subject:resolved`. A denial the
 * cookie holds is never lifted by the local copy, so a dropped cookie write
 * only ever leaves fewer vendors allowed. An older local copy is ignored.
 * `null` when nothing is stored.
 */
export const readStoredVendorChoice = function readStoredVendorChoice(
	config: StorageConfig | undefined,
	now: number,
	onUnavailable?: () => void
): DecodeResult<StoredVendorChoice> | null {
	const keys = resolveStorageKeys(config);
	const fromCookie = readCompactCookie(
		getRawCookieValue(keys.vendors, onUnavailable),
		(text) => decodeVendorChoiceCompact(text, now)
	);
	const fromLocal = readLocalJson(
		keys.vendors,
		(value) => decodeVendorChoice(value, now),
		onUnavailable
	);
	if (fromCookie?.ok && fromLocal?.ok) {
		if (fromLocal.record.confirmedAt < fromCookie.record.confirmedAt) {
			return fromCookie;
		}
		const denied = [
			...new Set([...fromCookie.record.denied, ...fromLocal.record.denied]),
		].sort();
		return { ok: true, record: { ...fromLocal.record, denied } };
	}
	if (fromCookie?.ok) {
		return fromCookie;
	}
	return fromLocal ?? fromCookie;
};

/** Server read of the vendor cookie projection from a `Cookie` header. */
export const readStoredVendorChoiceFromCookieHeader =
	function readStoredVendorChoiceFromCookieHeader(
		cookieHeader: string | undefined,
		config: StorageConfig | undefined,
		now: number
	): DecodeResult<StoredVendorChoice> | null {
		const keys = resolveStorageKeys(config);
		return readCompactCookie(
			readCookieValueFromHeader(cookieHeader, keys.vendors),
			(text) => decodeVendorChoiceCompact(text, now)
		);
	};

/**
 * Writes the vendor denial list to localStorage and its compact cookie
 * projection. The consent record and its cookie are never touched.
 */
export const writeStoredVendorChoice = function writeStoredVendorChoice(
	record: StoredVendorChoice,
	config: StorageConfig | undefined,
	now: number,
	cookie?: CookieOptions
): DecodeResult<StoredVendorChoice> & { written?: AuxiliaryWriteReport } {
	const validated = decodeVendorChoice(record, now);
	if (validated.ok === false) {
		return validated;
	}
	const keys = resolveStorageKeys(config);
	const localStorageWritten = writeLocalStorageText(
		keys.vendors,
		encodeVendorChoice(validated.record)
	);
	const cookieDetail = writeCookie(
		keys.vendors,
		encodeVendorChoiceCompact(validated.record),
		cookie,
		config
	);
	return {
		ok: true,
		record: validated.record,
		written: {
			cookie: cookieDetail.attempted && cookieDetail.verified,
			cookieDetail,
			localStorage: localStorageWritten,
		},
	};
};

export const clearStoredVendorChoice = function clearStoredVendorChoice(
	config?: StorageConfig,
	cookie?: CookieOptions
): void {
	const keys = resolveStorageKeys(config);
	removeLocalStorageKey(keys.vendors);
	deleteCookie(keys.vendors, cookie, config);
};

// ---------------------------------------------------------------------------
// Clear epoch: the time of the last clear, kept by the clear itself
// ---------------------------------------------------------------------------

const newerEpoch = function newerEpoch(
	result: DecodeResult<number> | null,
	current: number
): number {
	return result?.ok && result.record > current ? result.record : current;
};

const readRawEpoch = function readRawEpoch(
	text: string | null | undefined,
	now: number
): DecodeResult<number> | null {
	const trimmed = text?.trim();
	return trimmed ? decodeClearEpoch(trimmed, now) : null;
};

/**
 * Reads the clear epoch: the newer of the cookie and localStorage copies,
 * or `0` when neither holds a valid one. An unreadable or invalid copy
 * counts as `0`, which voids nothing, so a failed read never turns a
 * stored denial into a grant.
 */
export const readStoredClearEpoch = function readStoredClearEpoch(
	config: StorageConfig | undefined,
	now: number,
	onUnavailable?: () => void
): number {
	const keys = resolveStorageKeys(config);
	const fromCookie = readRawEpoch(
		getRawCookieValue(keys.epoch, onUnavailable),
		now
	);
	const fromLocal = readRawEpoch(
		readLocalStorageText(keys.epoch, onUnavailable),
		now
	);
	return newerEpoch(fromLocal, newerEpoch(fromCookie, 0));
};

/** Server read of the clear epoch cookie from a request `Cookie` header. */
export const readStoredClearEpochFromCookieHeader =
	function readStoredClearEpochFromCookieHeader(
		cookieHeader: string | undefined,
		config: StorageConfig | undefined,
		now: number
	): number {
		const keys = resolveStorageKeys(config);
		return newerEpoch(
			readRawEpoch(readCookieValueFromHeader(cookieHeader, keys.epoch), now),
			0
		);
	};

/**
 * Writes the clear epoch to localStorage and its cookie. Written by
 * `clear()` after it removes the records, and never removed by it, so
 * every runtime can tell decisions made before the clear from later ones.
 */
export const writeStoredClearEpoch = function writeStoredClearEpoch(
	epoch: number,
	config: StorageConfig | undefined,
	cookie?: CookieOptions
): AuxiliaryWriteReport {
	const keys = resolveStorageKeys(config);
	const text = encodeClearEpoch(epoch);
	const localStorageWritten = writeLocalStorageText(keys.epoch, text);
	const cookieDetail = writeCookie(keys.epoch, text, cookie, config);
	return {
		cookie: cookieDetail.attempted && cookieDetail.verified,
		cookieDetail,
		localStorage: localStorageWritten,
	};
};

// ---------------------------------------------------------------------------
// Clear everything
// ---------------------------------------------------------------------------

/**
 * Removes explicit choices (configured and legacy keys, cookie and
 * localStorage), the notice dismissal, the privacy directives and the
 * vendor denials with their cookie projections, and the queued backend
 * replays. Cookie
 * deletion uses the same domain handling as writes so a cross-subdomain
 * cookie is actually removed.
 */
export const clearStoredConsentRecords = function clearStoredConsentRecords(
	cookie?: CookieOptions,
	config?: StorageConfig
): void {
	deleteConsentFromStorage(cookie, config);
	clearStoredNoticeDismissal(config, cookie);
	clearStoredPrivacyOptOuts(config, cookie);
	clearStoredVendorChoice(config, cookie);
	removeLocalStorageKey(PENDING_SAVES_STORAGE_KEY);
	// Addon bytes must be removed even when the addon is not mounted.
	removeLocalStorageKey('c15t-iab-authority-v1');
	removeLocalStorageKey('euconsent-v2');
	deleteCookie('euconsent-v2', cookie, config);
	deleteCookie('euconsent-v2');
};
