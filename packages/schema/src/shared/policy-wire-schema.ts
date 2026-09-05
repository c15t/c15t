/**
 * Valibot mirrors of the v3 policy wire contract.
 *
 * Backends validate and document `/init` with these. Clients use the plain
 * reader in `policy-resolution.ts` so `@c15t/schema/types` stays free of the
 * valibot runtime. A test keeps the two in agreement.
 */

import * as v from 'valibot';

import { POLICY_CONTRACT_VERSION } from './policy-resolution';
import {
	collectResolvedPolicyRuleIssues,
	isPlainPolicyObject,
	POLICY_OPTIONAL_CATEGORIES,
	POLICY_PROMPT_ACTIONS,
	POLICY_PROMPTS,
	POLICY_RIGHTS,
	POLICY_RULE_MODELS,
} from './policy-rule';
import type { ResolvedPolicyRule } from './policy-rule';

export const policyRuleModelSchema = v.picklist(POLICY_RULE_MODELS);
export const policyPromptSchema = v.picklist(POLICY_PROMPTS);
export const policyPromptActionSchema = v.picklist(POLICY_PROMPT_ACTIONS);
export const policyRightSchema = v.picklist(POLICY_RIGHTS);
export const policyOptionalCategorySchema = v.picklist(
	POLICY_OPTIONAL_CATEGORIES
);

/**
 * Plain object with a plain or null prototype. Applied before every object
 * schema so inherited fields never reach the projection.
 */
export const plainObjectSchema = v.custom<Record<string, unknown>>(
	(input) => isPlainPolicyObject(input),
	'Expected a plain object'
);

const positiveNumberSchema = v.pipe(
	v.number(),
	v.finite(),
	v.gtValue(0),
	v.maxValue(Number.MAX_SAFE_INTEGER)
);

export const policyActionConstraintsSchema = v.pipe(
	plainObjectSchema,
	v.strictObject({
		allowed: v.array(policyPromptActionSchema),
		equivalent: v.array(v.array(policyPromptActionSchema)),
		required: v.array(policyPromptActionSchema),
	})
);

const resolvedPolicyRuleFieldsSchema = v.pipe(
	plainObjectSchema,
	v.strictObject({
		actions: policyActionConstraintsSchema,
		copyRevision: v.nullable(v.string()),
		i18n: v.optional(
			v.pipe(
				plainObjectSchema,
				v.strictObject({
					language: v.optional(v.string()),
					messageProfile: v.optional(v.string()),
				})
			)
		),
		id: v.pipe(v.string(), v.minLength(1)),
		model: policyRuleModelSchema,
		preselectedCategories: v.array(policyOptionalCategorySchema),
		privacySignals: v.pipe(
			plainObjectSchema,
			v.strictObject({
				gpc: v.pipe(
					plainObjectSchema,
					v.strictObject({
						denyCategories: v.array(policyOptionalCategorySchema),
					})
				),
			})
		),
		prompt: policyPromptSchema,
		proof: v.pipe(
			plainObjectSchema,
			v.strictObject({
				storeIp: v.boolean(),
				storeLanguage: v.boolean(),
				storeUserAgent: v.boolean(),
			})
		),
		rights: v.array(policyRightSchema),
		scope: v.array(policyOptionalCategorySchema),
		scopeMode: v.picklist(['strict', 'permissive']),
		validity: v.pipe(
			plainObjectSchema,
			v.strictObject({
				choiceMs: positiveNumberSchema,
				noticeMs: positiveNumberSchema,
			})
		),
	})
);

/**
 * Normalized v3 rule as carried on the wire.
 *
 * Structure plus the same semantic invariants the authored path and the
 * client reader enforce, so the backend never accepts a weaker rule.
 */
export const resolvedPolicyRuleSchema = v.pipe(
	resolvedPolicyRuleFieldsSchema,
	v.rawCheck(({ dataset, addIssue }) => {
		if (!dataset.typed) {
			return;
		}
		for (const issue of collectResolvedPolicyRuleIssues(
			dataset.value as ResolvedPolicyRule
		)) {
			addIssue({ message: issue });
		}
	})
);

export const policyFingerprintsSchema = v.pipe(
	plainObjectSchema,
	v.strictObject({
		choice: v.pipe(v.string(), v.minLength(1)),
		legacyMaterial: v.optional(v.string()),
		notice: v.pipe(v.string(), v.minLength(1)),
		policy: v.pipe(v.string(), v.minLength(1)),
	})
);

export const policyResolutionFailureSchema = v.picklist([
	'invalid-configuration',
	'insufficient-inputs',
	'transport',
	'unsupported-contract',
	'invalid-payload',
]);

const contractVersionSchema = v.literal(POLICY_CONTRACT_VERSION);

const policyResolutionVariantSchema = v.variant('status', [
	v.strictObject({
		policy: v.null(),
		status: v.literal('unconfigured'),
		version: contractVersionSchema,
	}),
	v.strictObject({
		policy: v.null(),
		status: v.literal('no-match'),
		version: contractVersionSchema,
	}),
	v.strictObject({
		policy: v.null(),
		reason: policyResolutionFailureSchema,
		status: v.literal('failed'),
		version: contractVersionSchema,
	}),
	v.strictObject({
		fingerprints: policyFingerprintsSchema,
		matchedBy: v.picklist(['region', 'country', 'default', 'fallback']),
		policy: resolvedPolicyRuleSchema,
		policyId: v.pipe(v.string(), v.minLength(1)),
		status: v.literal('matched'),
		version: contractVersionSchema,
	}),
]);

/**
 * `policyResolution` as emitted by `/init` and manifests.
 *
 * Rejects inherited fields, unknown fields, unknown enum values, semantic
 * invariant violations and a `policyId` that differs from `policy.id`, the
 * same set the client reader rejects.
 */
export const policyResolutionWireSchema = v.pipe(
	plainObjectSchema,
	policyResolutionVariantSchema,
	v.rawCheck(({ dataset, addIssue }) => {
		if (
			dataset.typed &&
			dataset.value.status === 'matched' &&
			dataset.value.policyId !== dataset.value.policy.id
		) {
			addIssue({ message: 'policyId must equal policy.id' });
		}
	})
);

export type PolicyResolutionWireOutput = v.InferOutput<
	typeof policyResolutionWireSchema
>;
