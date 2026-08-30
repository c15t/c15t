import * as v from 'valibot';

import type { LegalDocumentPolicyType } from '../shared/legal-document-types';
import { isLegalDocumentType } from '../shared/legal-document-types';

export type {
	LegalDocumentPolicyType,
	LegalDocumentTypePrefix,
} from '../shared/legal-document-types';
export {
	isLegalDocumentType,
	LEGAL_DOCUMENT_TYPE_PREFIXES,
} from '../shared/legal-document-types';

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

/**
 * Valibot schema validating any consent policy type that can be stored or
 * returned by c15t.
 *
 * This preserves the closed built-in {@link policyTypeSchema} while also
 * accepting suffixed legal-document variants through
 * {@link legalDocumentPolicyTypeSchema}.
 */
export const consentPolicyTypeSchema = v.union([
	policyTypeSchema,
	legalDocumentPolicyTypeSchema,
]);

export const consentPolicySchema = v.object({
	id: v.string(),
	version: v.string(),
	type: consentPolicyTypeSchema,
	hash: v.nullish(v.string()),
	effectiveDate: v.date(),
	isActive: v.optional(v.boolean(), true),
	createdAt: v.optional(v.date(), () => new Date()),
	tenantId: v.nullish(v.string()),
});

export type PolicyType = v.InferOutput<typeof policyTypeSchema>;
export type ConsentPolicyType = PolicyType | LegalDocumentPolicyType;
export type ConsentPolicy = Omit<
	v.InferOutput<typeof consentPolicySchema>,
	'type'
> & {
	type: ConsentPolicyType;
};
