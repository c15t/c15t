import { policyMatchers } from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';

/** Canonical rule fields with flat geographic matcher inputs. */
export interface PolicyBuilderInput extends Omit<PolicyRule, 'match'> {
	countries?: string[];
	regions?: { country: string; region: string }[];
	isDefault?: boolean;
	fallback?: boolean;
}

/**
 * Builds a canonical rule while preserving invalid inputs for validation.
 * @param input - Rule fields and geographic matcher inputs.
 * @returns The authored rule for `policyRules` configuration.
 */
export const buildPolicyRule = function buildPolicyRule(
	input: PolicyBuilderInput
): PolicyRule {
	const { countries, regions, isDefault, fallback, ...rule } = input;
	return {
		...rule,
		match: policyMatchers.merge(
			countries ? policyMatchers.countries(countries) : {},
			regions ? policyMatchers.regions(regions) : {},
			isDefault ? policyMatchers.default() : {},
			fallback ? policyMatchers.fallback() : {}
		),
	};
};

/**
 * Builds ordered canonical rules, preserving first-match precedence.
 * @param inputs - Ordered rule authoring inputs.
 * @returns Rules in the supplied order.
 */
export const buildPolicyPack = function buildPolicyPack(
	inputs: PolicyBuilderInput[]
): PolicyRule[] {
	return inputs.map(buildPolicyRule);
};

/**
 * Appends an explicitly supplied default rule if no default already exists.
 * @param inputs - Ordered regional and fallback inputs.
 * @param defaultPolicy - Explicit behavior for the default, with geography removed.
 * @returns The ordered rules including their default.
 */
export const buildPolicyPackWithDefault = function buildPolicyPackWithDefault(
	inputs: PolicyBuilderInput[],
	defaultPolicy: PolicyBuilderInput
): PolicyRule[] {
	const pack = buildPolicyPack(inputs);
	if (pack.some((rule) => rule.match.isDefault)) {
		return pack;
	}
	const {
		countries: _countries,
		regions: _regions,
		fallback: _fallback,
		...rule
	} = defaultPolicy;
	return [...pack, buildPolicyRule({ ...rule, isDefault: true })];
};

/**
 * Combines rule lists; the first occurrence of each ID wins.
 * @param packs - Ordered rule lists.
 * @returns Rules with duplicate IDs removed.
 */
export const composePacks = function composePacks(
	...packs: PolicyRule[][]
): PolicyRule[] {
	const seen = new Set<string>();
	return packs.flat().filter((rule) => {
		if (seen.has(rule.id)) {
			return false;
		}
		seen.add(rule.id);
		return true;
	});
};

/** Canonical rule authoring helpers. */
export const policyBuilder = {
	composePacks,
	create: buildPolicyRule,
	createPack: buildPolicyPack,
	createPackWithDefault: buildPolicyPackWithDefault,
};
