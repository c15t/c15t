import type { PolicyDecision, ResolvedPolicy } from '~/api/init';
import type { jurisdictionCodes } from './constants';
import { createPolicyFingerprint } from './policy-fingerprint';
import {
	compactDefined,
	dedupeDefinedValues,
	dedupeTrimmedStrings,
	hasRealPolicyUiHints,
} from './policy-utils';

export {
	createPolicyFingerprint,
	type FingerprintHashStrategy,
	hashSha256Hex,
} from './policy-fingerprint';

export type JurisdictionCode = (typeof jurisdictionCodes)[number];
export type PolicyModel = 'opt-in' | 'opt-out' | 'none' | 'iab';
export type PolicyScopeMode = 'strict' | 'permissive';
export type PolicyUiMode = 'none' | 'banner' | 'dialog';
export type PolicyUiAction = 'accept' | 'reject' | 'customize';
export type PolicyUiActionDirection = 'row' | 'column';
export type PolicyUiActionGroup = PolicyUiAction | PolicyUiAction[];
export type PolicyUiProfile = 'balanced' | 'compact' | 'strict';

/**
 * UI customizations for a single consent surface within a policy.
 *
 * @remarks
 * This is used by `ui.banner` and `ui.dialog` on {@link PolicyConfig}. These
 * overrides are ignored for IAB policies because TCF mode controls that UI.
 *
 * @see {@link https://v2.c15t.com/docs/frameworks/react/concepts/policy-packs}
 */
export interface PolicyUiSurfaceConfig {
	allowedActions?: PolicyUiAction[];
	primaryAction?: PolicyUiAction;
	layout?: PolicyUiActionGroup[];
	direction?: PolicyUiActionDirection;
	uiProfile?: PolicyUiProfile;
	scrollLock?: boolean;
}

/**
 * Canonical runtime policy definition shared across backend and frontend.
 *
 * @remarks
 * Policy packs are ordered arrays of `PolicyConfig`. On the backend they are
 * configured via `c15tInstance({ policyPacks })`; on the frontend they can be
 * previewed in offline mode with `offlinePolicy.policyPacks`.
 *
 * c15t resolves packs with fixed precedence:
 *
 * 1. region
 * 2. country
 * 3. fallback (only when geo-location is unknown)
 * 4. default
 *
 * Within the same matcher type, first match wins by array order.
 *
 * @see {@link https://v2.c15t.com/docs/frameworks/react/concepts/policy-packs}
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export interface PolicyConfig {
	id: string;
	match: {
		regions?: Array<{ country: string; region: string }>;
		countries?: string[];
		isDefault?: boolean;
		fallback?: boolean;
	};
	i18n?: {
		language?: string;
		messageProfile?: string;
	};
	consent?: {
		model?: PolicyModel;
		expiryDays?: number;
		/**
		 * Controls how categories outside the `categories` allowlist are treated.
		 *
		 * - `'permissive'` (default): out-of-scope categories are not blocked by
		 *   c15t runtime — scripts and iframes for those categories load normally.
		 * - `'strict'`: out-of-scope categories remain blocked and are enforced on
		 *   consent writes (the backend rejects preferences for disallowed categories).
		 */
		scopeMode?: PolicyScopeMode;
		categories?: string[];
		preselectedCategories?: string[];
		/**
		 * Whether this policy should respect the Global Privacy Control (GPC) signal.
		 *
		 * When `true`, the presence of a GPC signal (`Sec-GPC: 1` header or
		 * `navigator.globalPrivacyControl`) causes marketing and measurement
		 * categories to be treated as opted-out for auto-granted consents.
		 *
		 * Defaults to `false`. Typically enabled for CCPA/California policies
		 * where GPC is a legally recognized opt-out mechanism, and left disabled
		 * for GDPR/EEA policies where consent is already opt-in.
		 */
		gpc?: boolean;
	};
	ui?: {
		mode?: PolicyUiMode;
		banner?: PolicyUiSurfaceConfig;
		dialog?: PolicyUiSurfaceConfig;
	};
	proof?: {
		storeIp?: boolean;
		storeUserAgent?: boolean;
		storeLanguage?: boolean;
	};
}

/**
 * @deprecated Use `PolicyConfig[]` directly instead. This alias will be
 * removed in a future version.
 */
export type PolicyPack = PolicyConfig[];

/**
 * Matcher portion of a {@link PolicyConfig}.
 *
 * @see {@link https://v2.c15t.com/docs/frameworks/react/concepts/policy-packs#matching-order}
 */
export type PolicyMatch = PolicyConfig['match'];
export type PolicyMatchedBy = PolicyDecision['matchedBy'];
const POLICY_PURPOSE_WILDCARD = '*';

/**
 * Result of resolving a policy pack for one request.
 *
 * @remarks
 * This is the explainable runtime output behind `/init.policyDecision` and
 * offline policy preview metadata.
 *
 * @see {@link https://v2.c15t.com/docs/frameworks/react/concepts/policy-packs#snapshots-and-debugging}
 */
export interface ResolvedPolicyDecision {
	policy: ResolvedPolicy;
	matchedBy: PolicyMatchedBy;
	fingerprint: string;
}

/**
 * Same as {@link ResolvedPolicyDecision} but without the fingerprint.
 * Returned by the synchronous {@link resolvePolicySync}.
 */
export interface ResolvedPolicyMatch {
	policy: ResolvedPolicy;
	matchedBy: PolicyMatchedBy;
}

/**
 * Validation report for a policy pack.
 *
 * @remarks
 * Errors indicate invalid configuration. Warnings indicate ambiguous or risky
 * configuration such as overlapping matchers without a clear default.
 */
export interface PolicyValidationResult {
	errors: string[];
	warnings: string[];
}

// Manual matcher-data revision marker. Update this whenever the built-in
// country or region matcher tables change.
export const POLICY_MATCH_DATASET_VERSION = '2026-03-10';

export const EU_COUNTRY_CODES = [
	'AT',
	'BE',
	'BG',
	'HR',
	'CY',
	'CZ',
	'DK',
	'EE',
	'FI',
	'FR',
	'DE',
	'GR',
	'HU',
	'IE',
	'IT',
	'LV',
	'LT',
	'LU',
	'MT',
	'NL',
	'PL',
	'PT',
	'RO',
	'SK',
	'SI',
	'ES',
	'SE',
] as const;

export const EEA_COUNTRY_CODES = [
	...EU_COUNTRY_CODES,
	'IS',
	'LI',
	'NO',
] as const;
export const UK_COUNTRY_CODES = ['GB'] as const;

function normalizeCountry(code: string): string {
	return code.trim().toUpperCase();
}

function normalizeRegion(input: { country: string; region: string }): {
	country: string;
	region: string;
} {
	return {
		country: normalizeCountry(input.country),
		region: input.region.trim().toUpperCase(),
	};
}

type PolicyRegionMatcher = NonNullable<PolicyMatch['regions']>[number];

function mergeCountries(
	existing: PolicyMatch['countries'],
	countries: string[]
): PolicyMatch['countries'] {
	return (
		dedupeDefinedValues([
			...(existing ?? []),
			...countries.map((country) => normalizeCountry(country)),
		]) ?? []
	);
}

function mergeRegions(
	existing: PolicyMatch['regions'],
	regions: PolicyRegionMatcher[]
): PolicyMatch['regions'] {
	const merged = [
		...(existing ?? []),
		...regions.map((region) => normalizeRegion(region)),
	];
	const seen = new Set<string>();
	return merged.filter((region) => {
		const key = createRegionMatcherKey(region.country, region.region);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

function applyPolicyMatchFragment(
	merged: PolicyMatch,
	match: PolicyMatch
): void {
	if (match.isDefault) {
		merged.isDefault = true;
	}
	if (match.fallback) {
		merged.fallback = true;
	}
	if (match.countries?.length) {
		merged.countries = mergeCountries(merged.countries, match.countries);
	}
	if (match.regions?.length) {
		merged.regions = mergeRegions(merged.regions, match.regions);
	}
}

/**
 * Matcher helpers for composing {@link PolicyConfig.match} objects.
 *
 * @remarks
 * These helpers normalize country and region casing and make intent explicit in
 * both backend config and tests.
 *
 * @see {@link https://v2.c15t.com/docs/frameworks/react/concepts/policy-packs#matching-order}
 */
export const policyMatchers = {
	default(): PolicyMatch {
		return { isDefault: true };
	},

	fallback(): PolicyMatch {
		return { fallback: true };
	},

	countries(countries: string[]): PolicyMatch {
		return {
			countries:
				dedupeDefinedValues(
					countries.map((country) => normalizeCountry(country))
				) ?? [],
		};
	},

	regions(regions: Array<{ country: string; region: string }>): PolicyMatch {
		return {
			regions: regions.map((region) => normalizeRegion(region)),
		};
	},

	eu(): PolicyMatch {
		return {
			countries: [...EU_COUNTRY_CODES],
		};
	},

	eea(): PolicyMatch {
		return {
			countries: [...EEA_COUNTRY_CODES],
		};
	},

	uk(): PolicyMatch {
		return {
			countries: [...UK_COUNTRY_CODES],
		};
	},

	iab(): PolicyMatch {
		return policyMatchers.merge(policyMatchers.eea(), policyMatchers.uk());
	},

	merge(...matches: PolicyMatch[]): PolicyMatch {
		const merged: PolicyMatch = {};

		for (const match of matches) {
			applyPolicyMatchFragment(merged, match);
		}

		return merged;
	},
};

type ResolvedPolicyUiSurface = NonNullable<ResolvedPolicy['ui']>['banner'];
type IndexedPolicyMatch = {
	policy: PolicyConfig;
	matchedBy: PolicyMatchedBy;
};
type CompiledPolicyResolver = {
	regions: Map<string, PolicyConfig>;
	countries: Map<string, PolicyConfig>;
	defaultPolicy?: PolicyConfig;
	fallbackPolicy?: PolicyConfig;
};

const compiledPolicyResolverCache = new WeakMap<
	PolicyConfig[],
	CompiledPolicyResolver
>();

function normalizeCountryCode(countryCode: string | null): string | null {
	if (!countryCode) {
		return null;
	}

	return countryCode.toUpperCase();
}

function normalizeRegionCode(regionCode: string | null): string | null {
	if (!regionCode) {
		return null;
	}

	return (
		(regionCode.includes('-') ? regionCode.split('-').pop() : regionCode)
			?.toUpperCase()
			.trim() ?? null
	);
}

function createRegionMatcherKey(
	countryCode: string,
	regionCode: string
): string {
	return `${countryCode}:${regionCode}`;
}

function normalizeModel(policy: PolicyConfig): PolicyModel {
	return policy.consent?.model ?? 'opt-in';
}

function normalizeCategories(policy: PolicyConfig): string[] | undefined {
	const model = normalizeModel(policy);
	if (model === 'iab') {
		return [POLICY_PURPOSE_WILDCARD];
	}

	return dedupeTrimmedStrings(policy.consent?.categories);
}

function normalizePreselectedCategories(
	policy: PolicyConfig
): string[] | undefined {
	const model = normalizeModel(policy);
	if (model === 'iab') {
		return undefined;
	}

	const preselectedCategories = policy.consent?.preselectedCategories;
	if (!preselectedCategories || preselectedCategories.length === 0) {
		return undefined;
	}

	const categories = normalizeCategories(policy);
	if (!categories || categories.length === 0 || categories.includes('*')) {
		return dedupeTrimmedStrings(preselectedCategories);
	}

	return dedupeTrimmedStrings(
		preselectedCategories.filter((category) => categories.includes(category))
	);
}

function normalizeScopeMode(policy: PolicyConfig): PolicyScopeMode {
	return policy.consent?.scopeMode ?? 'permissive';
}

function hasUiConfig(policy: PolicyConfig): boolean {
	if (!policy.ui) {
		return false;
	}

	if (policy.ui.mode !== undefined) {
		return true;
	}

	return (
		hasUiSurfaceConfig(policy.ui.banner) || hasUiSurfaceConfig(policy.ui.dialog)
	);
}

function hasUiSurfaceConfig(surface?: PolicyUiSurfaceConfig): boolean {
	return hasRealPolicyUiHints(surface);
}

function hasExplicitMatchers(policy: PolicyConfig): boolean {
	return (
		(policy.match.countries?.length ?? 0) > 0 ||
		(policy.match.regions?.length ?? 0) > 0
	);
}

function policyLabel(policy: PolicyConfig, index: number): string {
	const id = policy.id?.trim();
	if (id) {
		return `'${id}'`;
	}

	return `at index ${index}`;
}

function collectPolicyErrors(
	policies: PolicyConfig[],
	options?: { iabEnabled?: boolean }
): string[] {
	const errors: string[] = [];
	const defaults = policies.filter((policy) => policy.match.isDefault);
	if (defaults.length > 1) {
		errors.push('Only one default policy is allowed');
	}

	const fallbacks = policies.filter((policy) => policy.match.fallback);
	if (fallbacks.length > 1) {
		errors.push('Only one fallback policy is allowed');
	}

	const usesIabModel = policies.some(
		(policy) => policy.consent?.model === 'iab'
	);
	if (usesIabModel && options && options.iabEnabled !== true) {
		errors.push(
			'Policies using consent.model="iab" require top-level iab.enabled=true'
		);
	}

	const iabWithUiCustomization = policies.find(
		(policy) => policy.consent?.model === 'iab' && hasUiConfig(policy)
	);
	if (iabWithUiCustomization) {
		errors.push(
			`Policy '${iabWithUiCustomization.id}' uses consent.model="iab" and cannot define ui.* overrides. IAB banner/dialog controls are fixed by TCF mode.`
		);
	}

	const iabWithPreselectedCategories = policies.find(
		(policy) =>
			policy.consent?.model === 'iab' &&
			(policy.consent?.preselectedCategories?.length ?? 0) > 0
	);
	if (iabWithPreselectedCategories) {
		errors.push(
			`Policy '${iabWithPreselectedCategories.id}' uses consent.model="iab" and cannot define consent.preselectedCategories.`
		);
	}

	for (const [index, policy] of policies.entries()) {
		const label = policyLabel(policy, index);
		for (const surfaceName of ['banner', 'dialog'] as const) {
			const surface = policy.ui?.[surfaceName];
			if (!surface) {
				continue;
			}
			const allowed = surface.allowedActions;
			if (allowed && allowed.length > 0) {
				if (surface.primaryAction && !allowed.includes(surface.primaryAction)) {
					errors.push(
						`Policy ${label} ui.${surfaceName}.primaryAction '${surface.primaryAction}' is not in allowedActions [${allowed.join(', ')}].`
					);
				}
			}

			const layout = surface.layout;
			if (layout) {
				const seen = new Set<PolicyUiAction>();
				const effectiveActions = allowed
					? new Set<PolicyUiAction>(allowed)
					: undefined;
				for (const group of layout) {
					const actions = Array.isArray(group) ? group : [group];
					if (actions.length === 0) {
						errors.push(
							`Policy ${label} ui.${surfaceName}.layout contains an empty action group.`
						);
						continue;
					}
					for (const action of actions) {
						if (effectiveActions && !effectiveActions.has(action)) {
							errors.push(
								`Policy ${label} ui.${surfaceName}.layout contains '${action}' which is not in allowedActions [${allowed?.join(', ')}].`
							);
						}
						if (seen.has(action)) {
							errors.push(
								`Policy ${label} ui.${surfaceName}.layout contains duplicate action '${action}'.`
							);
						}
						seen.add(action);
					}
				}

				if (allowed && seen.size !== allowed.length) {
					const missing = allowed.filter((action) => !seen.has(action));
					if (missing.length > 0) {
						errors.push(
							`Policy ${label} ui.${surfaceName}.layout must include every allowed action. Missing [${missing.join(', ')}].`
						);
					}
				}
			}
		}
	}

	const idToIndex = new Map<string, number>();
	for (const [index, policy] of policies.entries()) {
		const id = policy.id?.trim();
		if (!id) {
			errors.push(
				`Policy ${policyLabel(policy, index)} is missing a non-empty id.`
			);
			continue;
		}

		const previousIndex = idToIndex.get(id);
		if (previousIndex !== undefined) {
			errors.push(
				`Policy IDs must be unique. Duplicate id '${id}' found at indexes ${previousIndex} and ${index}.`
			);
		} else {
			idToIndex.set(id, index);
		}

		if (
			!policy.match.isDefault &&
			!policy.match.fallback &&
			!hasExplicitMatchers(policy)
		) {
			errors.push(
				`Policy '${id}' has no matcher. Add countries or regions, or set match.isDefault=true.`
			);
		}
	}

	return errors;
}

function collectPolicyWarnings(policies: PolicyConfig[]): string[] {
	if (policies.length === 0) {
		return [];
	}

	const warnings = new Set<string>();
	const defaults = policies.filter((policy) => policy.match.isDefault);
	if (defaults.length === 0) {
		warnings.add(
			'No default policy configured. Requests that do not match region/country will have no active policy.'
		);
	}

	const fallbacks = policies.filter((policy) => policy.match.fallback);
	if (fallbacks.length === 0) {
		warnings.add(
			'No fallback policy configured. If geo-location fails, no policy will apply. Mark a strict policy with match.fallback=true.'
		);
	}

	const seenCountries = new Map<string, string>();
	const seenRegions = new Map<string, string>();

	for (const [index, policy] of policies.entries()) {
		const id = policy.id?.trim() || `policy_index_${index}`;
		const label = policyLabel(policy, index);

		if (policy.match.isDefault && hasExplicitMatchers(policy)) {
			warnings.add(
				`Policy ${label} is marked as default and also defines explicit matchers. Explicit matchers are ignored for default resolution.`
			);
		}

		for (const country of policy.match.countries ?? []) {
			const key = country.toUpperCase();
			const existing = seenCountries.get(key);
			if (existing) {
				warnings.add(
					`Country matcher '${key}' appears in multiple policies (${existing} and '${id}'). First match wins by array order.`
				);
			} else {
				seenCountries.set(key, `'${id}'`);
			}
		}

		for (const region of policy.match.regions ?? []) {
			const key = `${region.country.toUpperCase()}-${region.region.toUpperCase()}`;
			const existing = seenRegions.get(key);
			if (existing) {
				warnings.add(
					`Region matcher '${key}' appears in multiple policies (${existing} and '${id}'). First match wins by array order.`
				);
			} else {
				seenRegions.set(key, `'${id}'`);
			}
		}
	}

	return [...warnings];
}

function parsePolicyConfigs(
	policies: unknown
): { ok: true; output: PolicyConfig[] } | { ok: false; errors: string[] } {
	if (!Array.isArray(policies)) {
		return {
			ok: false,
			errors: ['Policy config must be an array of policy objects.'],
		};
	}

	const errors: string[] = [];
	for (let i = 0; i < policies.length; i++) {
		const p = policies[i];
		if (!p || typeof p !== 'object' || !('match' in p) || !p.match) {
			errors.push(
				`Policy at index ${i} is invalid: missing required 'match' property.`
			);
		}
	}

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		output: policies as PolicyConfig[],
	};
}

function parseOptionalPolicyConfigs(
	policies?: unknown
): PolicyConfig[] | undefined {
	if (policies === undefined) {
		return undefined;
	}

	const parsed = parsePolicyConfigs(policies);
	if (!parsed.ok) {
		throw new Error(parsed.errors[0]);
	}

	return parsed.output;
}

/**
 * Inspects a policy pack and returns both errors and warnings.
 *
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export function inspectPolicies(
	policies: unknown,
	options?: { iabEnabled?: boolean }
): PolicyValidationResult {
	const parsedPolicies = parsePolicyConfigs(policies);
	if (!parsedPolicies.ok) {
		return {
			errors: parsedPolicies.errors,
			warnings: [],
		};
	}

	return {
		errors: collectPolicyErrors(parsedPolicies.output, options),
		warnings: collectPolicyWarnings(parsedPolicies.output),
	};
}

function normalizeAllowedActions(
	surface?: PolicyUiSurfaceConfig
): PolicyUiAction[] | undefined {
	return dedupeDefinedValues(surface?.allowedActions);
}

function flattenActionGroups(
	layout?: PolicyUiAction[][]
): PolicyUiAction[] | undefined {
	if (!layout || layout.length === 0) {
		return undefined;
	}

	return layout.flat();
}

function normalizeActionGroups(
	surface: PolicyUiSurfaceConfig | undefined,
	allowedActions?: PolicyUiAction[]
): PolicyUiAction[][] | undefined {
	const layout = surface?.layout;
	if (!layout || layout.length === 0) {
		return allowedActions && allowedActions.length > 0
			? [allowedActions]
			: undefined;
	}

	const allowedSet =
		allowedActions && allowedActions.length > 0
			? new Set<PolicyUiAction>(allowedActions)
			: undefined;
	const groups: PolicyUiAction[][] = [];
	const seen = new Set<PolicyUiAction>();

	for (const group of layout) {
		const actions = dedupeDefinedValues(Array.isArray(group) ? group : [group]);
		if (!actions || actions.length === 0) {
			continue;
		}

		const normalizedGroup = actions.filter((action) => {
			if (seen.has(action)) {
				return false;
			}
			if (allowedSet && !allowedSet.has(action)) {
				return false;
			}

			seen.add(action);
			return true;
		});

		if (normalizedGroup.length > 0) {
			groups.push(normalizedGroup);
		}
	}

	if (groups.length === 0) {
		return undefined;
	}

	return groups;
}

function normalizePrimaryAction(
	surface: PolicyUiSurfaceConfig | undefined,
	allowedActions?: PolicyUiAction[]
): PolicyUiAction | undefined {
	const primaryAction = surface?.primaryAction;
	if (!primaryAction) {
		return undefined;
	}

	if (allowedActions && allowedActions.length > 0) {
		return allowedActions.includes(primaryAction)
			? primaryAction
			: allowedActions[0];
	}

	return primaryAction;
}

function normalizeDirection(
	surface?: PolicyUiSurfaceConfig
): PolicyUiActionDirection | undefined {
	const direction = surface?.direction;
	return direction === 'row' || direction === 'column' ? direction : undefined;
}

function normalizeUiProfile(
	surface?: PolicyUiSurfaceConfig
): PolicyUiProfile | undefined {
	const uiProfile = surface?.uiProfile;
	return uiProfile === 'balanced' ||
		uiProfile === 'compact' ||
		uiProfile === 'strict'
		? uiProfile
		: undefined;
}

function normalizeScrollLock(
	surface?: PolicyUiSurfaceConfig
): boolean | undefined {
	return typeof surface?.scrollLock === 'boolean'
		? surface.scrollLock
		: undefined;
}

function normalizeUiSurface(
	surface?: PolicyUiSurfaceConfig
): ResolvedPolicyUiSurface {
	if (!surface) {
		return undefined;
	}

	const allowedActions = normalizeAllowedActions(surface);
	const layout = normalizeActionGroups(surface, allowedActions);
	const flattenedActions = flattenActionGroups(layout) ?? allowedActions;
	const normalized = {
		allowedActions,
		primaryAction: normalizePrimaryAction(surface, flattenedActions),
		layout,
		direction: normalizeDirection(surface),
		uiProfile: normalizeUiProfile(surface),
		scrollLock: normalizeScrollLock(surface),
	};

	return compactDefined(normalized);
}

function compilePolicyResolver(
	policies: PolicyConfig[]
): CompiledPolicyResolver {
	const compiled: CompiledPolicyResolver = {
		regions: new Map<string, PolicyConfig>(),
		countries: new Map<string, PolicyConfig>(),
	};

	for (const policy of policies) {
		for (const region of policy.match.regions ?? []) {
			const normalizedRegion = normalizeRegion(region);
			const key = createRegionMatcherKey(
				normalizedRegion.country,
				normalizedRegion.region
			);
			if (!compiled.regions.has(key)) {
				compiled.regions.set(key, policy);
			}
		}

		for (const country of policy.match.countries ?? []) {
			const normalizedCountry = normalizeCountry(country);
			if (!compiled.countries.has(normalizedCountry)) {
				compiled.countries.set(normalizedCountry, policy);
			}
		}

		if (!compiled.defaultPolicy && policy.match.isDefault === true) {
			compiled.defaultPolicy = policy;
		}

		if (!compiled.fallbackPolicy && policy.match.fallback === true) {
			compiled.fallbackPolicy = policy;
		}
	}

	return compiled;
}

function getCompiledPolicyResolver(
	policies: PolicyConfig[]
): CompiledPolicyResolver {
	const cached = compiledPolicyResolverCache.get(policies);
	if (cached) {
		return cached;
	}

	const compiled = compilePolicyResolver(policies);
	compiledPolicyResolverCache.set(policies, compiled);
	return compiled;
}

function resolveIndexedPolicyMatch(params: {
	compiled: CompiledPolicyResolver;
	countryCode: string | null;
	regionCode: string | null;
}): IndexedPolicyMatch | undefined {
	const { compiled, countryCode, regionCode } = params;

	if (countryCode && regionCode) {
		const regionPolicy = compiled.regions.get(
			createRegionMatcherKey(countryCode, regionCode)
		);
		if (regionPolicy) {
			return { policy: regionPolicy, matchedBy: 'region' };
		}
	}

	if (countryCode) {
		const countryPolicy = compiled.countries.get(countryCode);
		if (countryPolicy) {
			return { policy: countryPolicy, matchedBy: 'country' };
		}
	}

	// Fallback — only when location is unknown (geo-headers missing)
	if (!countryCode && compiled.fallbackPolicy) {
		return { policy: compiled.fallbackPolicy, matchedBy: 'fallback' };
	}

	// Default catch-all
	if (compiled.defaultPolicy) {
		return { policy: compiled.defaultPolicy, matchedBy: 'default' };
	}

	return undefined;
}

function mapPolicy(policy: PolicyConfig): ResolvedPolicy {
	const model = normalizeModel(policy);

	return {
		id: policy.id,
		model,
		i18n: policy.i18n,
		consent: {
			expiryDays: policy.consent?.expiryDays,
			scopeMode: normalizeScopeMode(policy),
			categories: normalizeCategories(policy),
			preselectedCategories: normalizePreselectedCategories(policy),
			gpc: policy.consent?.gpc,
		},
		ui:
			model === 'iab'
				? undefined
				: {
						mode: policy.ui?.mode,
						banner: normalizeUiSurface(policy.ui?.banner),
						dialog: normalizeUiSurface(policy.ui?.dialog),
					},
		proof: {
			storeIp: policy.proof?.storeIp,
			storeUserAgent: policy.proof?.storeUserAgent,
			storeLanguage: policy.proof?.storeLanguage,
		},
	};
}

/**
 * Validates a policy pack and throws on the first error.
 *
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export function validatePolicies(
	policies: unknown,
	options?: { iabEnabled?: boolean }
): void {
	const { errors } = inspectPolicies(policies, options);
	if (errors.length > 0) {
		throw new Error(errors[0]);
	}
}

/**
 * Resolves the active policy for a single request.
 *
 * @remarks
 * Returns `undefined` when no pack is configured, when the configured pack is
 * invalid, or when no configured policy matches the request and no default is
 * present.
 *
 * @see {@link https://v2.c15t.com/docs/frameworks/react/concepts/policy-packs}
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export async function resolvePolicyDecision(params: {
	policies?: unknown;
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction?: JurisdictionCode;
	iabEnabled?: boolean;
}): Promise<ResolvedPolicyDecision | undefined> {
	let parsedPolicies: PolicyConfig[] | undefined;
	try {
		parsedPolicies = parseOptionalPolicyConfigs(params.policies);
		if (parsedPolicies && parsedPolicies.length > 0) {
			validatePolicies(
				parsedPolicies,
				params.iabEnabled === undefined
					? undefined
					: { iabEnabled: params.iabEnabled }
			);
		}
	} catch {
		return undefined;
	}

	if (!parsedPolicies || parsedPolicies.length === 0) {
		return undefined;
	}

	const countryCode = normalizeCountryCode(params.countryCode);
	const regionCode = normalizeRegionCode(params.regionCode);

	const matchedPolicy = resolveIndexedPolicyMatch({
		compiled: getCompiledPolicyResolver(parsedPolicies),
		countryCode,
		regionCode,
	});

	if (!matchedPolicy) {
		return undefined;
	}

	const policy = mapPolicy(matchedPolicy.policy);
	const fingerprint = await createPolicyFingerprint(policy);

	return {
		policy,
		matchedBy: matchedPolicy.matchedBy,
		fingerprint,
	};
}

/**
 * Synchronous variant of {@link resolvePolicyDecision} that skips fingerprint
 * computation. Use this when you only need the resolved policy and match
 * metadata but not the cryptographic fingerprint.
 *
 * @see {@link https://v2.c15t.com/docs/frameworks/react/concepts/policy-packs}
 */
export function resolvePolicySync(params: {
	policies?: unknown;
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction?: JurisdictionCode;
	iabEnabled?: boolean;
}): ResolvedPolicyMatch | undefined {
	let parsedPolicies: PolicyConfig[] | undefined;
	try {
		parsedPolicies = parseOptionalPolicyConfigs(params.policies);
		if (parsedPolicies && parsedPolicies.length > 0) {
			validatePolicies(
				parsedPolicies,
				params.iabEnabled === undefined
					? undefined
					: { iabEnabled: params.iabEnabled }
			);
		}
	} catch {
		return undefined;
	}

	if (!parsedPolicies || parsedPolicies.length === 0) {
		return undefined;
	}

	const countryCode = normalizeCountryCode(params.countryCode);
	const regionCode = normalizeRegionCode(params.regionCode);

	const matchedPolicy = resolveIndexedPolicyMatch({
		compiled: getCompiledPolicyResolver(parsedPolicies),
		countryCode,
		regionCode,
	});

	if (!matchedPolicy) {
		return undefined;
	}

	const policy = mapPolicy(matchedPolicy.policy);

	return {
		policy,
		matchedBy: matchedPolicy.matchedBy,
	};
}
