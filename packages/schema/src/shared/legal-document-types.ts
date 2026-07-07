/**
 * Base legal-document policy families recognized by c15t.
 *
 * A concrete consent `type` is valid when it equals one of these prefixes or is
 * a suffixed variant of one (see {@link isLegalDocumentType}). Declared
 * `as const`, so the entries are literal types and the array is read-only.
 */
export const LEGAL_DOCUMENT_TYPE_PREFIXES = [
	'privacy_policy',
	'dpa',
	'terms_and_conditions',
] as const;

export type LegalDocumentTypePrefix =
	(typeof LEGAL_DOCUMENT_TYPE_PREFIXES)[number];

export type LegalDocumentPolicyType =
	| LegalDocumentTypePrefix
	| `${LegalDocumentTypePrefix}_${string}`;

/**
 * Type guard for legal-document consent types.
 *
 * Matches when `value` is a string that either equals one of
 * {@link LEGAL_DOCUMENT_TYPE_PREFIXES} or starts with a prefix followed by `_`
 * (e.g. `terms_and_conditions_b2b`). The `_` boundary plus a non-empty suffix
 * are both required, so near matches like `terms_and_conditions2` and
 * empty-suffix values like `terms_and_conditions_` are rejected. Fail-closed:
 * unknown families and non-string values return `false`.
 *
 * @param value - Candidate consent type; may be any value.
 * @returns `true` when `value` is a base or suffixed legal-document type,
 * narrowing it to `string`; otherwise `false`.
 *
 * @example
 * ```ts
 * isLegalDocumentType('terms_and_conditions'); // true (base family)
 * isLegalDocumentType('terms_and_conditions_b2b'); // true (suffixed variant)
 * isLegalDocumentType('terms_and_conditions2'); // false (missing `_` boundary)
 * isLegalDocumentType('terms_and_conditions_'); // false (empty suffix)
 * isLegalDocumentType('cookie_banner'); // false (not a legal-document type)
 * isLegalDocumentType(42); // false (not a string)
 * ```
 */
export const isLegalDocumentType = (
	value: unknown
): value is LegalDocumentPolicyType =>
	typeof value === 'string' &&
	LEGAL_DOCUMENT_TYPE_PREFIXES.some(
		(prefix) =>
			value === prefix ||
			(value.startsWith(`${prefix}_`) && value.length > prefix.length + 1)
	);
