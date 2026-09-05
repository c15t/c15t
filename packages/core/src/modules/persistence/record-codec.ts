/**
 * Versioned browser codec for the v3 consent envelope.
 *
 * One envelope holds the subject identity once, one latest decision per
 * optional category (value, confirmation time, policy basis) and any
 * validated IAB transport metadata. Two encodings share one validator:
 *
 * - JSON for localStorage. `false` and absence stay distinct because the
 *   key is either present with a boolean or not present at all.
 * - A compact positional form for the cookie. Every field has a fixed
 *   type, so `'0'` and `'1'` are only ever read as booleans in the value
 *   slot and fingerprints or identifiers that happen to be `"0"` survive
 *   as strings. Omitted categories stay absent; explicit denials encode
 *   as `0`.
 *
 * Nothing here touches storage, the clock or callbacks. Callers supply
 * `now` so future timestamps are rejected deterministically.
 *
 * @internal
 */

import { OPTIONAL_CONSENT_CATEGORIES } from '../../consent-record/types';
import type {
	CategoryDecision,
	ChoiceBasis,
	ConsentSubject,
	ExplicitChoice,
	NoticeDismissal,
	OptionalConsentCategory,
	PrivacyOptOut,
} from '../../consent-record/types';
import {
	checkTimestamp,
	isNonEmptyString,
	isOptionalConsentCategory,
	isPlainRecord,
	ownKeys,
	ownValue,
	validateExplicitChoice,
	validateNoticeDismissal,
} from '../../consent-record/validation';
import type { RecordIssue } from '../../consent-record/validation';

/** Validated IAB transport metadata carried alongside category choices. */
export interface StoredIabMetadata {
	/** Custom (non-GVL) vendor consents keyed by vendor id. */
	customVendorConsents?: Readonly<Record<string, boolean>>;
	/** Custom vendor legitimate-interest flags keyed by vendor id. */
	customVendorLegitimateInterests?: Readonly<Record<string, boolean>>;
}

/**
 * The v3 browser record. This is what the next explicit save writes.
 *
 * `subject` appears once. `categories` is the reviewed per-category
 * receipt representation from the consent-record module, unchanged.
 * `iab` only carries metadata the v2 layer already stored; it never
 * asserts TC string authority, which has its own validity elsewhere.
 */
export interface StoredConsentEnvelope {
	version: 3;
	subject?: ConsentSubject;
	categories: ExplicitChoice['categories'];
	iab?: StoredIabMetadata;
}

/** Local-only notice dismissal record. Version 1 matches the record type. */
export type StoredNoticeDismissal = NoticeDismissal;

/**
 * Local-only standing privacy directives. Kept as a versioned list so
 * more than one signal source can be recorded later without a rewrite.
 */
export interface StoredPrivacyOptOuts {
	version: 1;
	directives: readonly PrivacyOptOut[];
}

/** Structural issue found while decoding a stored record. */
export type StorageIssue =
	| RecordIssue
	| {
			code: 'duplicate-key' | 'malformed-encoding';
			path: string;
	  };

export type DecodeResult<RecordType> =
	| { ok: true; record: RecordType }
	| { ok: false; issues: StorageIssue[] };

/** Prefix every compact v3 cookie value starts with. */
export const COMPACT_ENVELOPE_PREFIX = 'v=3';

const FIELD_SEPARATOR = '&';
const KEY_VALUE_SEPARATOR = '=';
const LIST_SEPARATOR = '|';
const TUPLE_SEPARATOR = '.';

const CATEGORY_CODES = {
	experience: 'ex',
	functionality: 'fn',
	marketing: 'mk',
	measurement: 'me',
} as const satisfies Record<OptionalConsentCategory, string>;

const CODE_TO_CATEGORY: ReadonlyMap<string, OptionalConsentCategory> = new Map(
	Object.entries(CATEGORY_CODES).map(([category, code]) => [
		code,
		category as OptionalConsentCategory,
	])
);

const SUBJECT_CODES = {
	externalId: 'eid',
	identityProvider: 'idp',
	subjectId: 'sid',
} as const satisfies Record<keyof ConsentSubject, string>;

const CODE_TO_SUBJECT_KEY: ReadonlyMap<string, keyof ConsentSubject> = new Map(
	Object.entries(SUBJECT_CODES).map(([key, code]) => [
		code,
		key as keyof ConsentSubject,
	])
);

const IAB_CODES = {
	customVendorConsents: 'icv',
	customVendorLegitimateInterests: 'icvli',
} as const satisfies Record<keyof StoredIabMetadata, string>;

const CODE_TO_IAB_KEY: ReadonlyMap<string, keyof StoredIabMetadata> = new Map(
	Object.entries(IAB_CODES).map(([key, code]) => [
		code,
		key as keyof StoredIabMetadata,
	])
);

const BASIS_FIELD = 'b';
const VERSION_FIELD = 'v';

const SUBJECT_KEYS = ['subjectId', 'externalId', 'identityProvider'] as const;
const IAB_KEYS = [
	'customVendorConsents',
	'customVendorLegitimateInterests',
] as const;

const DIGITS_ONLY = /^\d+$/u;

/**
 * Defines an own enumerable data property. Plain assignment would route a
 * `__proto__` key through the prototype setter and silently drop it, so a
 * vendor denial under that id would vanish from a validated map.
 */
const setOwn = function setOwn(
	target: Record<string, boolean>,
	key: string,
	value: boolean
): void {
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: true,
		value,
		writable: true,
	});
};

const decodeComponent = function decodeComponent(value: string): string | null {
	try {
		return decodeURIComponent(value);
	} catch {
		return null;
	}
};

// ---------------------------------------------------------------------------
// Shared validation
// ---------------------------------------------------------------------------

const validateSubject = function validateSubject(
	input: unknown,
	issues: StorageIssue[]
): ConsentSubject | undefined {
	if (input === undefined) {
		return undefined;
	}
	if (!isPlainRecord(input)) {
		issues.push({ code: 'not-an-object', path: 'subject' });
		return undefined;
	}
	const subject: ConsentSubject = {};
	for (const key of ownKeys(input)) {
		if (!SUBJECT_KEYS.includes(key as (typeof SUBJECT_KEYS)[number])) {
			issues.push({ code: 'unknown-key', path: `subject.${key}` });
			continue;
		}
		const value = input[key];
		if (value === undefined) {
			continue;
		}
		if (!isNonEmptyString(value)) {
			issues.push({ code: 'invalid-identifier', path: `subject.${key}` });
			continue;
		}
		subject[key as keyof ConsentSubject] = value;
	}
	return Object.keys(subject).length > 0 ? subject : undefined;
};

const validateBooleanMap = function validateBooleanMap(
	input: unknown,
	path: string,
	issues: StorageIssue[]
): Record<string, boolean> | undefined {
	if (input === undefined) {
		return undefined;
	}
	if (!isPlainRecord(input)) {
		issues.push({ code: 'not-an-object', path });
		return undefined;
	}
	const map: Record<string, boolean> = {};
	for (const key of ownKeys(input)) {
		const value = input[key];
		if (typeof value !== 'boolean') {
			issues.push({ code: 'invalid-boolean', path: `${path}.${key}` });
			continue;
		}
		setOwn(map, key, value);
	}
	return Object.keys(map).length > 0 ? map : undefined;
};

/**
 * Validates IAB metadata as it appears in a v2 record
 * (`iabCustomVendorConsents`, `iabCustomVendorLegitimateInterests`) or a
 * v3 envelope (`iab.customVendorConsents`, ...). Only own boolean maps
 * survive. Returns `undefined` when nothing usable is present.
 */
export const validateIabMetadata = function validateIabMetadata(
	consents: unknown,
	legitimateInterests: unknown,
	path: string,
	issues: StorageIssue[]
): StoredIabMetadata | undefined {
	const customVendorConsents = validateBooleanMap(
		consents,
		`${path}.customVendorConsents`,
		issues
	);
	const customVendorLegitimateInterests = validateBooleanMap(
		legitimateInterests,
		`${path}.customVendorLegitimateInterests`,
		issues
	);
	if (!customVendorConsents && !customVendorLegitimateInterests) {
		return undefined;
	}
	const metadata: StoredIabMetadata = {};
	if (customVendorConsents) {
		metadata.customVendorConsents = customVendorConsents;
	}
	if (customVendorLegitimateInterests) {
		metadata.customVendorLegitimateInterests = customVendorLegitimateInterests;
	}
	return metadata;
};

const ENVELOPE_KEYS = ['version', 'subject', 'categories', 'iab'] as const;

/**
 * Validates a parsed v3 envelope object. Reuses the consent-record
 * validator for `version` and `categories`, then checks `subject` and
 * `iab`. Any structural issue rejects the whole envelope.
 */
export const validateStoredConsentEnvelope =
	function validateStoredConsentEnvelope(
		input: unknown,
		now: number
	): DecodeResult<StoredConsentEnvelope> {
		if (!isPlainRecord(input)) {
			return { issues: [{ code: 'not-an-object', path: '' }], ok: false };
		}
		const choice = validateExplicitChoice(input, now);
		if (choice.ok === false) {
			return { issues: choice.issues, ok: false };
		}
		const issues: StorageIssue[] = [];
		for (const key of ownKeys(input)) {
			if (!ENVELOPE_KEYS.includes(key as (typeof ENVELOPE_KEYS)[number])) {
				issues.push({ code: 'unknown-key', path: key });
			}
		}
		const subject = validateSubject(ownValue(input, 'subject'), issues);
		const rawIab = ownValue(input, 'iab');
		let iab: StoredIabMetadata | undefined;
		if (isPlainRecord(rawIab)) {
			for (const key of ownKeys(rawIab)) {
				if (!IAB_KEYS.includes(key as (typeof IAB_KEYS)[number])) {
					issues.push({ code: 'unknown-key', path: `iab.${key}` });
				}
			}
			iab = validateIabMetadata(
				ownValue(rawIab, 'customVendorConsents'),
				ownValue(rawIab, 'customVendorLegitimateInterests'),
				'iab',
				issues
			);
		} else if (rawIab !== undefined) {
			issues.push({ code: 'not-an-object', path: 'iab' });
		}
		if (issues.length > 0) {
			return { issues, ok: false };
		}
		const envelope: StoredConsentEnvelope = {
			categories: choice.record.categories,
			version: 3,
		};
		if (subject) {
			envelope.subject = subject;
		}
		if (iab) {
			envelope.iab = iab;
		}
		return { ok: true, record: envelope };
	};

// ---------------------------------------------------------------------------
// JSON encoding (localStorage)
// ---------------------------------------------------------------------------

const orderedBasis = function orderedBasis(basis: ChoiceBasis): ChoiceBasis {
	if (basis.kind === 'choice-v1') {
		return { fingerprint: basis.fingerprint, kind: 'choice-v1' };
	}
	if (basis.materialFingerprint === undefined) {
		return { kind: 'legacy-v2' };
	}
	return { kind: 'legacy-v2', materialFingerprint: basis.materialFingerprint };
};

const orderedDecision = function orderedDecision(
	decision: CategoryDecision
): CategoryDecision {
	return {
		basis: orderedBasis(decision.basis),
		confirmedAt: decision.confirmedAt,
		value: decision.value,
	};
};

/**
 * Serializes an envelope to JSON with a stable field order. Categories are
 * written in the canonical optional-category order; absent categories are
 * not written, explicit `false` is.
 */
export const encodeStoredConsentEnvelopeJson =
	function encodeStoredConsentEnvelopeJson(
		envelope: StoredConsentEnvelope
	): string {
		const categories: ExplicitChoice['categories'] = {};
		for (const category of OPTIONAL_CONSENT_CATEGORIES) {
			const decision = envelope.categories[category];
			if (decision) {
				categories[category] = orderedDecision(decision);
			}
		}
		const ordered: Record<string, unknown> = { version: 3 };
		if (envelope.subject && Object.keys(envelope.subject).length > 0) {
			ordered.subject = envelope.subject;
		}
		ordered.categories = categories;
		if (envelope.iab) {
			ordered.iab = envelope.iab;
		}
		return JSON.stringify(ordered);
	};

// ---------------------------------------------------------------------------
// Compact encoding (cookie)
// ---------------------------------------------------------------------------

const basisKey = function basisKey(basis: ChoiceBasis): string {
	if (basis.kind === 'choice-v1') {
		return `c${encodeURIComponent(basis.fingerprint)}`;
	}
	return basis.materialFingerprint === undefined
		? 'l'
		: `l${encodeURIComponent(basis.materialFingerprint)}`;
};

const encodeBooleanMap = function encodeBooleanMap(
	map: Readonly<Record<string, boolean>>
): string {
	return Object.keys(map)
		.sort()
		.map(
			(id) =>
				`${map[id] ? '1' : '0'}${TUPLE_SEPARATOR}${encodeURIComponent(id)}`
		)
		.join(LIST_SEPARATOR);
};

/**
 * Serializes an envelope to the compact cookie form.
 *
 * Layout, fields joined by `&`:
 *
 * ```text
 * v=3
 * sid=<uri-encoded subjectId>          (optional)
 * eid=<uri-encoded externalId>         (optional)
 * idp=<uri-encoded identityProvider>   (optional)
 * b=<basis>|<basis>                    (when any category is present)
 * fn=<0|1>.<confirmedAt>.<basisIndex>  (per present category: fn ex me mk)
 * icv=<0|1>.<uri-encoded vendorId>|... (optional)
 * icvli=<0|1>.<uri-encoded vendorId>|... (optional)
 * ```
 *
 * A basis is `c<fingerprint>` for `choice-v1`, `l<materialFingerprint>`
 * or bare `l` for `legacy-v2`. Each distinct basis is written once and
 * referenced by index so a full-scope save does not repeat one hash four
 * times. Every free-text component is URI-encoded, so the delimiters
 * `& = | .` never appear inside a value and no `:` or `,` is emitted.
 * The v2 parser therefore leaves this value alone as a plain string.
 */
export const encodeStoredConsentEnvelopeCompact =
	function encodeStoredConsentEnvelopeCompact(
		envelope: StoredConsentEnvelope
	): string {
		const fields: string[] = [`${VERSION_FIELD}${KEY_VALUE_SEPARATOR}3`];
		for (const key of SUBJECT_KEYS) {
			const value = envelope.subject?.[key];
			if (isNonEmptyString(value)) {
				fields.push(
					`${SUBJECT_CODES[key]}${KEY_VALUE_SEPARATOR}${encodeURIComponent(value)}`
				);
			}
		}

		const bases: string[] = [];
		const basisIndex = new Map<string, number>();
		const categoryFields: string[] = [];
		for (const category of OPTIONAL_CONSENT_CATEGORIES) {
			const decision = envelope.categories[category];
			if (!decision) {
				continue;
			}
			const key = basisKey(decision.basis);
			let index = basisIndex.get(key);
			if (index === undefined) {
				index = bases.length;
				bases.push(key);
				basisIndex.set(key, index);
			}
			categoryFields.push(
				`${CATEGORY_CODES[category]}${KEY_VALUE_SEPARATOR}${decision.value ? '1' : '0'}${TUPLE_SEPARATOR}${decision.confirmedAt}${TUPLE_SEPARATOR}${index}`
			);
		}
		if (bases.length > 0) {
			fields.push(
				`${BASIS_FIELD}${KEY_VALUE_SEPARATOR}${bases.join(LIST_SEPARATOR)}`
			);
		}
		fields.push(...categoryFields);

		for (const key of IAB_KEYS) {
			const map = envelope.iab?.[key];
			if (map && Object.keys(map).length > 0) {
				fields.push(
					`${IAB_CODES[key]}${KEY_VALUE_SEPARATOR}${encodeBooleanMap(map)}`
				);
			}
		}

		return fields.join(FIELD_SEPARATOR);
	};

/**
 * Whether a raw cookie value claims any versioned compact envelope
 * (`v=<digit>` at the start). Reserved before legacy parsing so an
 * unknown future version, or a v2-syntax record smuggled behind a version
 * marker, is rejected instead of being read as v2 data.
 */
export const hasVersionedCompactPrefix = function hasVersionedCompactPrefix(
	rawValue: string
): boolean {
	return /^v=\d/u.test(rawValue);
};

/** Whether a raw cookie value is a compact v3 envelope. */
export const isCompactStoredConsentEnvelope =
	function isCompactStoredConsentEnvelope(rawValue: string): boolean {
		return (
			rawValue === COMPACT_ENVELOPE_PREFIX ||
			rawValue.startsWith(`${COMPACT_ENVELOPE_PREFIX}${FIELD_SEPARATOR}`)
		);
	};

const parseBasisList = function parseBasisList(
	value: string,
	issues: StorageIssue[]
): ChoiceBasis[] | null {
	if (value.length === 0) {
		issues.push({ code: 'malformed-encoding', path: BASIS_FIELD });
		return null;
	}
	const bases: ChoiceBasis[] = [];
	for (const [index, entry] of value.split(LIST_SEPARATOR).entries()) {
		const path = `${BASIS_FIELD}[${index}]`;
		const kind = entry.charAt(0);
		const encoded = entry.slice(1);
		const fingerprint = encoded.length > 0 ? decodeComponent(encoded) : '';
		if (fingerprint === null) {
			issues.push({ code: 'malformed-encoding', path });
			continue;
		}
		if (kind === 'c') {
			if (fingerprint.length === 0) {
				issues.push({ code: 'invalid-fingerprint', path });
				continue;
			}
			bases.push({ fingerprint, kind: 'choice-v1' });
			continue;
		}
		if (kind === 'l') {
			bases.push(
				fingerprint.length === 0
					? { kind: 'legacy-v2' }
					: { kind: 'legacy-v2', materialFingerprint: fingerprint }
			);
			continue;
		}
		issues.push({ code: 'invalid-basis', path });
	}
	return bases;
};

const parseDecision = function parseDecision(
	value: string,
	path: string,
	bases: readonly ChoiceBasis[],
	now: number,
	issues: StorageIssue[]
): CategoryDecision | null {
	const parts = value.split(TUPLE_SEPARATOR);
	if (parts.length !== 3) {
		issues.push({ code: 'malformed-encoding', path });
		return null;
	}
	const [rawValue, rawTime, rawIndex] = parts as [string, string, string];
	let ok = true;
	if (rawValue !== '0' && rawValue !== '1') {
		issues.push({ code: 'invalid-boolean', path: `${path}.value` });
		ok = false;
	}
	let confirmedAt: number | null = null;
	if (DIGITS_ONLY.test(rawTime)) {
		confirmedAt = Number(rawTime);
		const timestampIssue = checkTimestamp(confirmedAt, now);
		if (timestampIssue) {
			issues.push({ code: timestampIssue, path: `${path}.confirmedAt` });
			ok = false;
		}
	} else {
		issues.push({ code: 'invalid-timestamp', path: `${path}.confirmedAt` });
		ok = false;
	}
	let basis: ChoiceBasis | undefined;
	if (DIGITS_ONLY.test(rawIndex)) {
		basis = bases[Number(rawIndex)];
	}
	if (!basis) {
		issues.push({ code: 'invalid-basis', path: `${path}.basis` });
		ok = false;
	}
	if (!ok || confirmedAt === null || !basis) {
		return null;
	}
	return { basis, confirmedAt, value: rawValue === '1' };
};

const parseBooleanMap = function parseBooleanMap(
	value: string,
	path: string,
	issues: StorageIssue[]
): Record<string, boolean> | null {
	if (value.length === 0) {
		issues.push({ code: 'malformed-encoding', path });
		return null;
	}
	const map: Record<string, boolean> = {};
	for (const [index, entry] of value.split(LIST_SEPARATOR).entries()) {
		const entryPath = `${path}[${index}]`;
		const separator = entry.indexOf(TUPLE_SEPARATOR);
		if (separator === -1) {
			issues.push({ code: 'malformed-encoding', path: entryPath });
			continue;
		}
		const flag = entry.slice(0, separator);
		const id = decodeComponent(entry.slice(separator + 1));
		if ((flag !== '0' && flag !== '1') || id === null || id.length === 0) {
			issues.push({ code: 'malformed-encoding', path: entryPath });
			continue;
		}
		if (Object.hasOwn(map, id)) {
			issues.push({ code: 'duplicate-key', path: entryPath });
			continue;
		}
		setOwn(map, id, flag === '1');
	}
	return map;
};

const splitFields = function splitFields(
	rawValue: string,
	issues: StorageIssue[]
): Map<string, string> | null {
	const fields = new Map<string, string>();
	for (const field of rawValue.split(FIELD_SEPARATOR)) {
		const separator = field.indexOf(KEY_VALUE_SEPARATOR);
		if (separator <= 0) {
			issues.push({ code: 'malformed-encoding', path: field });
			return null;
		}
		const key = field.slice(0, separator);
		if (fields.has(key)) {
			issues.push({ code: 'duplicate-key', path: key });
			return null;
		}
		fields.set(key, field.slice(separator + 1));
	}
	return fields;
};

/**
 * Parses a compact cookie value back into a validated envelope. Unknown
 * fields, duplicate fields, malformed tuples, non-boolean value slots,
 * non-integer or future timestamps and dangling basis references all
 * reject the whole value.
 */
// oxlint-disable-next-line complexity -- One pass over a fixed set of typed fields.
export const decodeStoredConsentEnvelopeCompact =
	function decodeStoredConsentEnvelopeCompact(
		rawValue: string,
		now: number
	): DecodeResult<StoredConsentEnvelope> {
		const issues: StorageIssue[] = [];
		if (!isCompactStoredConsentEnvelope(rawValue)) {
			return {
				issues: [{ code: 'unsupported-version', path: VERSION_FIELD }],
				ok: false,
			};
		}
		const fields = splitFields(rawValue, issues);
		if (!fields) {
			return { issues, ok: false };
		}
		fields.delete(VERSION_FIELD);

		const rawBases = fields.get(BASIS_FIELD);
		fields.delete(BASIS_FIELD);
		const bases =
			rawBases === undefined ? [] : parseBasisList(rawBases, issues);

		const subject: ConsentSubject = {};
		const categories: ExplicitChoice['categories'] = {};
		const iab: StoredIabMetadata = {};

		for (const [key, value] of fields) {
			const subjectKey = CODE_TO_SUBJECT_KEY.get(key);
			if (subjectKey) {
				const decoded = decodeComponent(value);
				if (decoded === null || decoded.length === 0) {
					issues.push({ code: 'invalid-identifier', path: key });
				} else {
					subject[subjectKey] = decoded;
				}
				continue;
			}
			const category = CODE_TO_CATEGORY.get(key);
			if (category) {
				const decision = parseDecision(value, key, bases ?? [], now, issues);
				if (decision) {
					categories[category] = decision;
				}
				continue;
			}
			const iabKey = CODE_TO_IAB_KEY.get(key);
			if (iabKey) {
				const map = parseBooleanMap(value, key, issues);
				if (map) {
					iab[iabKey] = map;
				}
				continue;
			}
			issues.push({ code: 'unknown-key', path: key });
		}

		if (issues.length > 0) {
			return { issues, ok: false };
		}
		const envelope: StoredConsentEnvelope = { categories, version: 3 };
		if (Object.keys(subject).length > 0) {
			envelope.subject = subject;
		}
		if (Object.keys(iab).length > 0) {
			envelope.iab = iab;
		}
		return { ok: true, record: envelope };
	};

// ---------------------------------------------------------------------------
// Notice dismissal and privacy opt-outs (local-only, JSON)
// ---------------------------------------------------------------------------

/** Serializes a notice dismissal for localStorage. */
export const encodeNoticeDismissal = function encodeNoticeDismissal(
	record: StoredNoticeDismissal
): string {
	return JSON.stringify({
		dismissedAt: record.dismissedAt,
		fingerprint: record.fingerprint,
		version: 1,
	});
};

/** Validates a parsed notice dismissal. */
export const decodeNoticeDismissal = function decodeNoticeDismissal(
	input: unknown,
	now: number
): DecodeResult<StoredNoticeDismissal> {
	const result = validateNoticeDismissal(input, now);
	if (result.ok === false) {
		return { issues: result.issues, ok: false };
	}
	return { ok: true, record: result.record };
};

const PRIVACY_OPT_OUT_KEYS = ['source', 'categories', 'recordedAt'] as const;

const validatePrivacyOptOut = function validatePrivacyOptOut(
	input: unknown,
	path: string,
	now: number,
	issues: StorageIssue[]
): PrivacyOptOut | null {
	if (!isPlainRecord(input)) {
		issues.push({ code: 'not-an-object', path });
		return null;
	}
	let ok = true;
	for (const key of ownKeys(input)) {
		if (
			!PRIVACY_OPT_OUT_KEYS.includes(
				key as (typeof PRIVACY_OPT_OUT_KEYS)[number]
			)
		) {
			issues.push({ code: 'unknown-key', path: `${path}.${key}` });
			ok = false;
		}
	}
	const source = ownValue(input, 'source');
	if (source !== 'gpc') {
		issues.push({ code: 'invalid-basis', path: `${path}.source` });
		ok = false;
	}
	const recordedAt = ownValue(input, 'recordedAt');
	const timestampIssue = checkTimestamp(recordedAt, now);
	if (timestampIssue) {
		issues.push({ code: timestampIssue, path: `${path}.recordedAt` });
		ok = false;
	}
	const rawCategories = ownValue(input, 'categories');
	const categories: OptionalConsentCategory[] = [];
	if (Array.isArray(rawCategories)) {
		for (const [index, entry] of rawCategories.entries()) {
			if (typeof entry !== 'string' || !isOptionalConsentCategory(entry)) {
				issues.push({
					code: 'unknown-key',
					path: `${path}.categories[${index}]`,
				});
				ok = false;
				continue;
			}
			if (categories.includes(entry)) {
				issues.push({
					code: 'duplicate-key',
					path: `${path}.categories[${index}]`,
				});
				ok = false;
				continue;
			}
			categories.push(entry);
		}
	} else {
		issues.push({ code: 'not-an-object', path: `${path}.categories` });
		ok = false;
	}
	if (!ok) {
		return null;
	}
	return {
		categories: [...categories].sort(),
		recordedAt: recordedAt as number,
		source: 'gpc',
	};
};

/** Serializes standing privacy directives for localStorage. */
export const encodePrivacyOptOuts = function encodePrivacyOptOuts(
	record: StoredPrivacyOptOuts
): string {
	return JSON.stringify({
		directives: record.directives.map((directive) => ({
			categories: [...directive.categories].sort(),
			recordedAt: directive.recordedAt,
			source: directive.source,
		})),
		version: 1,
	});
};

/** Validates a parsed privacy opt-out list. */
export const decodePrivacyOptOuts = function decodePrivacyOptOuts(
	input: unknown,
	now: number
): DecodeResult<StoredPrivacyOptOuts> {
	if (!isPlainRecord(input)) {
		return { issues: [{ code: 'not-an-object', path: '' }], ok: false };
	}
	if (ownValue(input, 'version') !== 1) {
		return {
			issues: [{ code: 'unsupported-version', path: 'version' }],
			ok: false,
		};
	}
	const issues: StorageIssue[] = [];
	for (const key of ownKeys(input)) {
		if (key !== 'version' && key !== 'directives') {
			issues.push({ code: 'unknown-key', path: key });
		}
	}
	const rawDirectives = ownValue(input, 'directives');
	if (!Array.isArray(rawDirectives)) {
		issues.push({ code: 'not-an-object', path: 'directives' });
		return { issues, ok: false };
	}
	const directives: PrivacyOptOut[] = [];
	for (const [index, entry] of rawDirectives.entries()) {
		const directive = validatePrivacyOptOut(
			entry,
			`directives[${index}]`,
			now,
			issues
		);
		if (directive) {
			directives.push(directive);
		}
	}
	if (issues.length > 0) {
		return { issues, ok: false };
	}
	return { ok: true, record: { directives, version: 1 } };
};
