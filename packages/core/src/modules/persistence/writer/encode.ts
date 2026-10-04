/**
 * Encoders for every stored record: the JSON written to localStorage and
 * the compact forms written to cookies. Their decoders live in
 * `../record-codec.ts`, which the first load needs to read stored records;
 * these only run on a write, so they load with the write code.
 *
 * The codes below are the wire format the decoders read back. They are
 * repeated here rather than imported so this file stays out of the first
 * load; `codec-tables.test.ts` fails when the two copies disagree.
 *
 * Pure.
 */
import type {
	CategoryDecision,
	ChoiceBasis,
	ConsentSubject,
	ExplicitChoice,
} from '../../../consent-record/types';
import type {
	StoredConsentEnvelope,
	StoredIabMetadata,
	StoredNoticeDismissal,
	StoredVendorChoice,
} from '../record-codec';

const FIELD_SEPARATOR = '&';
const KEY_VALUE_SEPARATOR = '=';
const LIST_SEPARATOR = '|';
const TUPLE_SEPARATOR = '.';

/**
 * Compact category codes, in the canonical optional-category order every
 * encoding writes categories in.
 *
 * @internal
 */
export const CATEGORY_CODES = [
	['functionality', 'fn'],
	['experience', 'ex'],
	['measurement', 'me'],
	['marketing', 'mk'],
] as const;

/** Compact subject codes, in the order they are written. @internal */
export const SUBJECT_CODES = [
	['subjectId', 'sid'],
	['externalId', 'eid'],
	['identityProvider', 'idp'],
] as const satisfies readonly (readonly [keyof ConsentSubject, string])[];

/** Compact IAB metadata codes, in the order they are written. @internal */
export const IAB_CODES = [
	['customVendorConsents', 'icv'],
	['customVendorLegitimateInterests', 'icvli'],
] as const satisfies readonly (readonly [keyof StoredIabMetadata, string])[];

const field = function field(key: string, value: string | number): string {
	return `${key}${KEY_VALUE_SEPARATOR}${value}`;
};

const subjectFields = function subjectFields(
	subject: ConsentSubject | undefined
): string[] {
	const fields: string[] = [];
	for (const [key, code] of SUBJECT_CODES) {
		const value = subject?.[key];
		if (value) {
			fields.push(field(code, encodeURIComponent(value)));
		}
	}
	return fields;
};

// ---------------------------------------------------------------------------
// Consent envelope
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
		for (const [category] of CATEGORY_CODES) {
			const decision = envelope.categories[category];
			if (decision) {
				categories[category] = orderedDecision(decision);
			}
		}
		const ordered: Record<string, unknown> = { version: 3 };
		if (envelope.subject && Object.keys(envelope.subject).length > 0) {
			ordered.subject = envelope.subject;
		}
		if (envelope.epoch) {
			ordered.epoch = envelope.epoch;
		}
		ordered.categories = categories;
		if (envelope.iab) {
			ordered.iab = envelope.iab;
		}
		return JSON.stringify(ordered);
	};

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
 * e=<clear epoch>                      (optional, only after a clear)
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
		const fields = [field('v', 3), ...subjectFields(envelope.subject)];
		if (envelope.epoch) {
			fields.push(field('e', envelope.epoch));
		}

		const bases: string[] = [];
		const categoryFields: string[] = [];
		for (const [category, code] of CATEGORY_CODES) {
			const decision = envelope.categories[category];
			if (!decision) {
				continue;
			}
			const key = basisKey(decision.basis);
			let index = bases.indexOf(key);
			if (index < 0) {
				index = bases.push(key) - 1;
			}
			categoryFields.push(
				field(
					code,
					`${decision.value ? '1' : '0'}${TUPLE_SEPARATOR}${decision.confirmedAt}${TUPLE_SEPARATOR}${index}`
				)
			);
		}
		if (bases.length > 0) {
			fields.push(field('b', bases.join(LIST_SEPARATOR)));
		}
		fields.push(...categoryFields);

		for (const [key, code] of IAB_CODES) {
			const map = envelope.iab?.[key];
			if (map && Object.keys(map).length > 0) {
				fields.push(field(code, encodeBooleanMap(map)));
			}
		}

		return fields.join(FIELD_SEPARATOR);
	};

// ---------------------------------------------------------------------------
// Notice dismissal
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

/**
 * Compact notice dismissal for the `<key>-notice` cookie:
 * `v=1&t=<dismissedAt>&f=<uri-encoded fingerprint>`.
 */
export const encodeNoticeDismissalCompact =
	function encodeNoticeDismissalCompact(record: StoredNoticeDismissal): string {
		return [
			field('v', 1),
			field('t', record.dismissedAt),
			field('f', encodeURIComponent(record.fingerprint)),
		].join(FIELD_SEPARATOR);
	};

// ---------------------------------------------------------------------------
// Vendor denial list
// ---------------------------------------------------------------------------

/** Serializes the vendor denial list for localStorage. */
export const encodeVendorChoice = function encodeVendorChoice(
	record: StoredVendorChoice
): string {
	const encoded: StoredVendorChoice = {
		confirmedAt: record.confirmedAt,
		denied: [...record.denied].sort(),
		version: 1,
	};
	if (record.subject && Object.keys(record.subject).length > 0) {
		encoded.subject = { ...record.subject };
	}
	return JSON.stringify(encoded);
};

/**
 * Compact vendor denials for the `<key>-vendors` cookie:
 * `v=1&t=<confirmedAt>&d=<uri-encoded id>|<uri-encoded id>`, followed by the
 * subject fields the consent envelope also uses (`sid`, `eid`, `idp`).
 * The `d` field is omitted when nothing is denied.
 */
export const encodeVendorChoiceCompact = function encodeVendorChoiceCompact(
	record: StoredVendorChoice
): string {
	const fields = [field('v', 1), field('t', record.confirmedAt)];
	if (record.denied.length > 0) {
		fields.push(
			field(
				'd',
				[...record.denied]
					.sort()
					.map((id) => encodeURIComponent(id))
					.join(LIST_SEPARATOR)
			)
		);
	}
	fields.push(...subjectFields(record.subject));
	return fields.join(FIELD_SEPARATOR);
};

// ---------------------------------------------------------------------------
// Clear epoch
// ---------------------------------------------------------------------------

/**
 * Serializes the clear epoch record: the time of the last `clear()` in
 * epoch milliseconds, as plain decimal digits. The same text is stored in
 * the `<key>-epoch` cookie and localStorage entry.
 */
export const encodeClearEpoch = function encodeClearEpoch(
	epoch: number
): string {
	return String(epoch);
};
