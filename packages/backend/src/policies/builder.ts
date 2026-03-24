import { compactDefined, dedupeTrimmedStrings } from '@c15t/schema';
import type {
	PolicyConfig,
	PolicyModel,
	PolicyScopeMode,
	PolicyUiMode,
	PolicyUiSurfaceConfig,
} from '~/types';
import { policyMatchers } from './matchers';

/**
 * High-level builder input for creating a backend policy config.
 *
 * @remarks
 * This shape is intentionally flatter than {@link PolicyConfig} so backend
 * configuration stays readable in `c15tInstance({ policyPacks })` setup files.
 * Use the builder helpers to normalize this input into runtime-ready policy
 * configs.
 *
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 * @see {@link https://v2.c15t.com/docs/frameworks/react/concepts/policy-packs}
 */
export interface PolicyBuilderInput {
	id: string;
	/**
	 * @deprecated Metadata-only label. Not used at runtime, not sent to clients,
	 * and not fingerprinted. Will be removed in a future version.
	 */
	name?: string;
	countries?: string[];
	regions?: Array<{ country: string; region: string }>;
	isDefault?: boolean;
	model?: PolicyModel;
	expiryDays?: number;
	scopeMode?: PolicyScopeMode;
	/**
	 * Consent categories scoped by the policy.
	 */
	categories?: string[];
	preselectedCategories?: string[];
	/**
	 * Whether the policy should respect the Global Privacy Control signal.
	 */
	gpc?: boolean;
	uiMode?: PolicyUiMode;
	banner?: PolicyUiSurfaceConfig;
	dialog?: PolicyUiSurfaceConfig;
	i18n?: {
		language?: string;
		messageProfile?: string;
	};
	proof?: {
		storeIp?: boolean;
		storeUserAgent?: boolean;
		storeLanguage?: boolean;
	};
}

const DEFAULT_FALLBACK_POLICY_INPUT: PolicyBuilderInput = {
	id: 'world_no_banner',
	isDefault: true,
	model: 'none',
	uiMode: 'none',
};

function mergeMatch(input: PolicyBuilderInput): PolicyConfig['match'] {
	return policyMatchers.merge(
		input.countries?.length ? policyMatchers.countries(input.countries) : {},
		input.regions?.length ? policyMatchers.regions(input.regions) : {},
		input.isDefault ? policyMatchers.default() : {}
	);
}

function compactUiSurface(
	value?: PolicyUiSurfaceConfig
): PolicyUiSurfaceConfig | undefined {
	if (!value) {
		return undefined;
	}

	return compactDefined({
		allowedActions: dedupeTrimmedStrings(value.allowedActions) as
			| PolicyUiSurfaceConfig['allowedActions']
			| undefined,
		primaryAction: value.primaryAction,
		layout: value.layout,
		direction: value.direction,
		uiProfile: value.uiProfile,
		scrollLock: value.scrollLock,
	});
}

/**
 * Converts a single {@link PolicyBuilderInput} into a normalized
 * backend-compatible {@link PolicyConfig}.
 *
 * @remarks
 * Empty optional fields are removed from the final output, matcher input is
 * merged into `match`, and duplicate string arrays are deduplicated.
 *
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export function buildPolicyConfig(input: PolicyBuilderInput): PolicyConfig {
	const categories = dedupeTrimmedStrings(input.categories);
	const preselectedCategories = dedupeTrimmedStrings(
		input.preselectedCategories
	);

	return {
		id: input.id,
		match: mergeMatch(input),
		i18n: input.i18n,
		consent: compactDefined({
			model: input.model,
			expiryDays: input.expiryDays,
			scopeMode: input.scopeMode,
			categories,
			preselectedCategories,
			gpc: input.gpc,
		}),
		ui: compactDefined({
			mode: input.uiMode,
			banner: compactUiSurface(input.banner),
			dialog: compactUiSurface(input.dialog),
		}),
		proof: compactDefined({
			storeIp: input.proof?.storeIp,
			storeUserAgent: input.proof?.storeUserAgent,
			storeLanguage: input.proof?.storeLanguage,
		}),
	};
}

/**
 * Converts an ordered list of builder inputs into a policy pack.
 *
 * @remarks
 * The resulting array preserves input order. That order matters because
 * duplicate region/country matchers use first-match-wins semantics within the
 * same matcher type.
 *
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export function buildPolicyPack(inputs: PolicyBuilderInput[]): PolicyConfig[] {
	return inputs.map((input) => buildPolicyConfig(input));
}

/**
 * Creates a policy pack and guarantees that it ends with a default policy.
 *
 * @remarks
 * If the provided inputs already contain a default matcher, the pack is
 * returned unchanged. Otherwise c15t appends either:
 *
 * - the supplied `defaultPolicy`, coerced to `match.isDefault = true`
 * - or the built-in "World No Banner" fallback
 *
 * When `defaultPolicy` is provided, its `countries` and `regions` fields are
 * stripped and replaced with `match.isDefault = true`.
 *
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export function buildPolicyPackWithDefault(
	inputs: PolicyBuilderInput[],
	defaultPolicy?: PolicyBuilderInput
): PolicyConfig[] {
	const pack = buildPolicyPack(inputs);
	const hasDefault = pack.some((policy) => policy.match.isDefault);

	if (hasDefault) {
		return pack;
	}

	const fallbackInput = defaultPolicy
		? {
				...defaultPolicy,
				isDefault: true,
				countries: undefined,
				regions: undefined,
			}
		: DEFAULT_FALLBACK_POLICY_INPUT;

	return [...pack, buildPolicyConfig(fallbackInput)];
}

/**
 * Merges multiple policy packs or individual policies into a single pack.
 *
 * @remarks
 * Useful for combining preset packs with custom policies without manual
 * spread and deduplication. Policies are deduplicated by `id` — the first
 * occurrence wins.
 *
 * @example
 * ```ts
 * import { composePacks, policyPackPresets, policyBuilder } from '@c15t/backend';
 *
 * const pack = composePacks(
 *   [policyPackPresets.europeOptIn()],
 *   [policyPackPresets.californiaOptOut()],
 *   [policyBuilder.create({ id: 'custom', countries: ['JP'], model: 'opt-in' })],
 *   [policyPackPresets.worldNoBanner()],
 * );
 * ```
 *
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export function composePacks(...packs: PolicyConfig[][]): PolicyConfig[] {
	const seen = new Set<string>();
	const result: PolicyConfig[] = [];

	for (const pack of packs) {
		for (const policy of pack) {
			if (!seen.has(policy.id)) {
				seen.add(policy.id);
				result.push(policy);
			}
		}
	}

	return result;
}

/**
 * Convenience namespace for the policy builder helpers.
 *
 * @remarks
 * Useful when you prefer a grouped API such as `policyBuilder.createPack()`
 * inside backend config files.
 *
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export const policyBuilder = {
	create: buildPolicyConfig,
	createPack: buildPolicyPack,
	createPackWithDefault: buildPolicyPackWithDefault,
	composePacks,
};
