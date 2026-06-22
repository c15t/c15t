import * as v from 'valibot';

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
export const isLegalDocumentType = (value: unknown): value is string =>
	typeof value === 'string' &&
	LEGAL_DOCUMENT_TYPE_PREFIXES.some(
		(prefix) =>
			value === prefix ||
			(value.startsWith(`${prefix}_`) && value.length > prefix.length + 1)
	);

/**
 * Valibot schema validating a legal-document policy `type`.
 *
 * Accepts any string for which {@link isLegalDocumentType} returns `true` — a
 * base family or a suffixed variant — and reports `Invalid legal document type`
 * for anything else. Output type is `string` (see {@link LegalDocumentPolicyType}).
 *
 * @example
 * ```ts
 * import * as v from 'valibot';
 *
 * v.parse(legalDocumentPolicyTypeSchema, 'terms_and_conditions_b2c'); // 'terms_and_conditions_b2c'
 * v.is(legalDocumentPolicyTypeSchema, 'marketing_communications'); // false
 * ```
 */
export const legalDocumentPolicyTypeSchema = v.pipe(
	v.string(),
	v.check(
		(value: string): boolean => isLegalDocumentType(value),
		'Invalid legal document type'
	)
);

export const policyTypeSchema = v.picklist([
	// Deprecated in 2.0 RC. Runtime banner behavior should use backend policies.
	'cookie_banner',
	'privacy_policy',
	'dpa',
	'terms_and_conditions',
	'marketing_communications',
	'age_verification',
	'other',
]);

export const consentPolicySchema = v.object({
	id: v.string(),
	version: v.string(),
	type: policyTypeSchema,
	hash: v.nullish(v.string()),
	effectiveDate: v.date(),
	isActive: v.optional(v.boolean(), true),
	createdAt: v.optional(v.date(), () => new Date()),
	tenantId: v.nullish(v.string()),
});

export type ConsentPolicy = v.InferOutput<typeof consentPolicySchema>;
export type LegalDocumentPolicyType = v.InferOutput<
	typeof legalDocumentPolicyTypeSchema
>;
export type PolicyType = v.InferOutput<typeof policyTypeSchema>;
