/**
 * Validates the policy projection the evaluator consumes.
 *
 * Fingerprints arrive precomputed from policy resolution; this module
 * neither hashes nor imports a hash implementation. Its job is to reject
 * invalid model/prompt pairings, durations, scope entries and GPC
 * mappings before anything reaches the evaluator, and to canonicalize
 * the category sets it accepts.
 *
 * @internal
 */

import type {
	EvaluationPolicy,
	OptionalConsentCategory,
	PolicyModel,
	PolicyPrompt,
	RecordValidity,
} from './types';
import { isNonEmptyString, isOptionalConsentCategory } from './validation';

/** Fully specified policy input. Fingerprints are supplied, not computed. */
export interface EvaluationPolicyInput {
	model: PolicyModel;
	prompt: PolicyPrompt;
	/** Optional categories the policy governs. Wildcards already expanded. */
	scope: readonly OptionalConsentCategory[];
	scopeMode: 'strict' | 'permissive';
	/** Choice prompt fingerprint and semantic validity. */
	choice: RecordValidity;
	/** Notice prompt fingerprint and semantic validity. */
	notice: RecordValidity;
	/** Explicit GPC deny mapping. Omit or leave empty when GPC is not honored. */
	gpcDenyCategories?: readonly OptionalConsentCategory[];
	/** Legacy material fingerprint of the same policy, when resolution has it. */
	legacyMaterialFingerprint?: string | null;
}

/** Sorted, deduplicated copy of a category set. */
export const canonicalizeCategories = function canonicalizeCategories<
	CategoryType extends string,
>(categories: readonly CategoryType[]): CategoryType[] {
	return [...new Set(categories)].sort((left, right) =>
		left.localeCompare(right)
	);
};

const assertPromptForModel = function assertPromptForModel(
	model: PolicyModel,
	prompt: PolicyPrompt
): void {
	if (model !== 'opt-out' && prompt !== 'choice') {
		throw new TypeError(
			`Policy model "${model}" requires prompt "choice", received "${prompt}"`
		);
	}
};

const assertValidity = function assertValidity(
	validity: RecordValidity,
	name: string
): void {
	if (!isNonEmptyString(validity.fingerprint)) {
		throw new TypeError(`${name}.fingerprint must be a non-empty string`);
	}
	const { maxAgeMs } = validity;
	if (maxAgeMs !== null && !(Number.isFinite(maxAgeMs) && maxAgeMs >= 0)) {
		throw new TypeError(
			`${name}.maxAgeMs must be null or a finite non-negative number`
		);
	}
};

const assertScope = function assertScope(scope: readonly string[]): void {
	for (const category of scope) {
		if (!isOptionalConsentCategory(category)) {
			throw new TypeError(`Scope has unknown category "${category}"`);
		}
	}
};

const assertGpcMapping = function assertGpcMapping(
	mapping: readonly string[],
	scope: readonly OptionalConsentCategory[]
): void {
	const seen = new Set<string>();
	for (const category of mapping) {
		if (category === 'necessary') {
			throw new TypeError('GPC mapping cannot deny "necessary"');
		}
		if (!isOptionalConsentCategory(category)) {
			throw new TypeError(`GPC mapping has unknown category "${category}"`);
		}
		if (seen.has(category)) {
			throw new TypeError(`GPC mapping repeats category "${category}"`);
		}
		if (!scope.includes(category)) {
			throw new TypeError(
				`GPC mapping category "${category}" is outside the policy scope`
			);
		}
		seen.add(category);
	}
};

/**
 * Validates and canonicalizes a policy projection.
 *
 * @throws {TypeError} when the model/prompt pairing, fingerprints,
 * durations, scope, or GPC mapping are invalid.
 */
export const createEvaluationPolicy = function createEvaluationPolicy(
	input: EvaluationPolicyInput
): EvaluationPolicy {
	assertPromptForModel(input.model, input.prompt);
	assertValidity(input.choice, 'choice');
	assertValidity(input.notice, 'notice');
	assertScope(input.scope);
	const scope = canonicalizeCategories(input.scope);
	const gpcDenyCategories = input.gpcDenyCategories ?? [];
	assertGpcMapping(gpcDenyCategories, scope);

	return {
		choice: { ...input.choice },
		gpcDenyCategories: canonicalizeCategories(gpcDenyCategories),
		legacyMaterialFingerprint: input.legacyMaterialFingerprint ?? null,
		model: input.model,
		notice: { ...input.notice },
		prompt: input.prompt,
		scope,
		scopeMode: input.scopeMode,
	};
};
