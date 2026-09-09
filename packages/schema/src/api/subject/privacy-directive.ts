/**
 * Privacy directive schemas (POST/GET /subjects/:id/privacy-directives and
 * the authenticated /privacy-directives routes).
 *
 * A directive is a privacy request recorded from a user-agent signal such as
 * Global Privacy Control. It is not a consent record and never travels
 * through the consent-saving endpoint. `recordedAt` is validated
 * structurally here; the not-in-the-future bound takes the server's clock at
 * request time and belongs to the route.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

import {
	isPlainPolicyObject,
	POLICY_OPTIONAL_CATEGORIES,
} from '../../shared/policy-rule';
import { wireTimestampSchema } from './choice-wire';

const plainObjectSchema = v.custom<Record<string, unknown>>(
	(input) => isPlainPolicyObject(input),
	'Expected a plain object'
);

/** Signals a directive can come from. Only GPC exists in v3. */
export const privacyDirectiveSourceSchema = v.picklist(['gpc']);

/** Who asserted a directive, which decides how far it reaches. */
export const privacyDirectiveAuthoritySchema = v.picklist(['subject', 'api']);

const categoriesSchema = v.pipe(
	v.array(v.picklist(POLICY_OPTIONAL_CATEGORIES)),
	v.minLength(1),
	v.check(
		(categories) => new Set(categories).size === categories.length,
		'Categories must not repeat'
	),
	v.description('Optional categories the directive denies.')
);

/** Body of `POST /subjects/:id/privacy-directives`. */
export const subjectPrivacyDirectiveInputSchema = v.pipe(
	plainObjectSchema,
	v.strictObject({
		categories: categoriesSchema,
		recordedAt: wireTimestampSchema,
		source: privacyDirectiveSourceSchema,
	})
);

/** Body of the authenticated `POST /privacy-directives`. */
export const identityPrivacyDirectiveInputSchema = v.pipe(
	plainObjectSchema,
	v.strictObject({
		categories: categoriesSchema,
		externalId: v.pipe(v.string(), v.minLength(1)),
		identityProvider: v.pipe(v.string(), v.minLength(1)),
		recordedAt: wireTimestampSchema,
		source: privacyDirectiveSourceSchema,
	})
);

/** One recorded directive as the read routes return it. */
export const privacyDirectiveWireSchema = v.object({
	authority: privacyDirectiveAuthoritySchema,
	categories: categoriesSchema,
	id: v.string(),
	recordedAt: wireTimestampSchema,
	/** Whether the recording request itself carried `Sec-GPC: 1`. */
	signalHeader: v.nullable(v.boolean()),
	source: privacyDirectiveSourceSchema,
});

/** Output of the directive-recording routes. */
export const recordPrivacyDirectiveOutputSchema = v.object({
	created: v.boolean(),
	directive: privacyDirectiveWireSchema,
	ok: v.literal(true),
	/** Subjects currently linked to the identity. Identity routes only. */
	subjects: v.optional(v.number()),
});

/** Output of the directive-reading routes. */
export const listPrivacyDirectivesOutputSchema = v.object({
	directives: v.array(privacyDirectiveWireSchema),
});

export type SubjectPrivacyDirectiveInput = v.InferOutput<
	typeof subjectPrivacyDirectiveInputSchema
>;
export type IdentityPrivacyDirectiveInput = v.InferOutput<
	typeof identityPrivacyDirectiveInputSchema
>;
export type PrivacyDirectiveWire = v.InferOutput<
	typeof privacyDirectiveWireSchema
>;
export type RecordPrivacyDirectiveOutput = v.InferOutput<
	typeof recordPrivacyDirectiveOutputSchema
>;
export type ListPrivacyDirectivesOutput = v.InferOutput<
	typeof listPrivacyDirectivesOutputSchema
>;
