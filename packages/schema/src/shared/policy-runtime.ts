import * as v from 'valibot';
import type { PolicyDecision, ResolvedPolicy } from '~/api/init';
import type { jurisdictionCodes } from './constants';
import { createPolicyFingerprint } from './policy-fingerprint';
import { policyConfigArraySchema } from './policy-schema';
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
export type PolicyUiActionLayout = 'split' | 'inline';
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
	actionOrder?: PolicyUiAction[];
	actionLayout?: PolicyUiActionLayout;
	uiProfile?: PolicyUiProfile;
	scrollLock?: boolean;
}

/**
 * Canonical runtime policy definition shared across backend and frontend.
 *
 * @remarks
 * Policy packs are ordered arrays of `PolicyConfig`. On the backend they are
 * configured via `c15tInstance({ policyPacks })`; on the frontend they can be
 * previewed in offline mode with `offlinePolicy.policies`.
 *
 * c15t resolves packs with fixed precedence:
 *
 * 1. region
 * 2. country
 * 3. jurisdiction
 * 4. default
 *
 * Within the same matcher type, first match wins by array order.
 *
 * @see {@link https://v2.c15t.com/docs/frameworks/react/concepts/policy-packs}
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export interface PolicyConfig {
	id: string;
	name?: string;
	match: {
		regions?: Array<{ country: string; region: string }>;
		countries?: string[];
		jurisdictions?: JurisdictionCode[];
		isDefault?: boolean;
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
 * Ordered collection of policies resolved with first-match-wins semantics.
 *
 * @remarks
 * On the backend this is configured via `policyPacks`; in frontend offline
 * mode it is provided via `offlinePolicy.policies`.
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

// Manual matcher-data revision marker. Update this whenever the jurisdiction
// or built-in matcher tables change.
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
export const IAB_POLICY_JURISDICTIONS = ['GDPR', 'UK_GDPR'] as const;

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

function dedupeJurisdictions(values: JurisdictionCode[]): JurisdictionCode[] {
	return dedupeDefinedValues(values) ?? [];
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

	jurisdictions(jurisdictions: JurisdictionCode[]): PolicyMatch {
		return {
			jurisdictions: dedupeJurisdictions(jurisdictions),
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
		return {
			jurisdictions: [...IAB_POLICY_JURISDICTIONS],
		};
	},

	merge(...matches: PolicyMatch[]): PolicyMatch {
		const merged: PolicyMatch = {};

		for (const match of matches) {
			if (match.isDefault) {
				merged.isDefault = true;
			}
			if (match.countries?.length) {
				merged.countries =
					dedupeDefinedValues([
						...(merged.countries ?? []),
						...match.countries.map((country) => normalizeCountry(country)),
					]) ?? [];
			}
			if (match.regions?.length) {
				merged.regions = [
					...(merged.regions ?? []),
					...match.regions.map((region) => normalizeRegion(region)),
				];
			}
			if (match.jurisdictions?.length) {
				merged.jurisdictions = dedupeJurisdictions([
					...(merged.jurisdictions ?? []),
					...match.jurisdictions,
				]);
			}
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
	jurisdictions: Map<JurisdictionCode, PolicyConfig>;
	defaultPolicy?: PolicyConfig;
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
		(policy.match.regions?.length ?? 0) > 0 ||
		(policy.match.jurisdictions?.length ?? 0) > 0
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

		if (!policy.match.isDefault && !hasExplicitMatchers(policy)) {
			errors.push(
				`Policy '${id}' has no matcher. Add countries, regions, jurisdictions, or set match.isDefault=true.`
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
			'No default policy configured. Requests that do not match region/country/jurisdiction will have no active policy.'
		);
	}

	const seenCountries = new Map<string, string>();
	const seenRegions = new Map<string, string>();
	const seenJurisdictions = new Map<string, string>();

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

		for (const jurisdiction of policy.match.jurisdictions ?? []) {
			const key = jurisdiction.toUpperCase();
			const existing = seenJurisdictions.get(key);
			if (existing) {
				warnings.add(
					`Jurisdiction matcher '${key}' appears in multiple policies (${existing} and '${id}'). First match wins by array order.`
				);
			} else {
				seenJurisdictions.set(key, `'${id}'`);
			}
		}
	}

	return [...warnings];
}

function formatPolicyParseIssues(issues: unknown[]): string[] {
	return issues.map((issue, index) => {
		if (!issue || typeof issue !== 'object') {
			return `Policy config is invalid at issue ${index + 1}.`;
		}

		const issueRecord = issue as {
			message?: unknown;
			path?: Array<{ key?: unknown }>;
		};
		const message =
			typeof issueRecord.message === 'string'
				? issueRecord.message
				: 'Invalid policy config value.';
		const path =
			Array.isArray(issueRecord.path) && issueRecord.path.length > 0
				? issueRecord.path
						.map((segment) =>
							typeof segment.key === 'string' || typeof segment.key === 'number'
								? String(segment.key)
								: null
						)
						.filter((segment): segment is string => segment !== null)
						.join('.')
				: '';

		return path ? `${path}: ${message}` : message;
	});
}

function parsePolicyConfigs(
	policies: unknown
): { ok: true; output: PolicyConfig[] } | { ok: false; errors: string[] } {
	const result = v.safeParse(policyConfigArraySchema, policies);
	if (result.success) {
		return {
			ok: true,
			output: result.output as PolicyConfig[],
		};
	}

	return {
		ok: false,
		errors: formatPolicyParseIssues(result.issues),
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

function normalizeActionOrder(
	surface: PolicyUiSurfaceConfig | undefined,
	allowedActions?: PolicyUiAction[]
): PolicyUiAction[] | undefined {
	const order = surface?.actionOrder;
	const normalized = dedupeDefinedValues(order);
	if (!normalized) {
		return undefined;
	}

	if (!allowedActions || allowedActions.length === 0) {
		return normalized;
	}

	const allowedSet = new Set(allowedActions);
	const filtered = normalized.filter((action) => allowedSet.has(action));

	for (const action of allowedActions) {
		if (!filtered.includes(action)) {
			filtered.push(action);
		}
	}

	return filtered.length > 0 ? filtered : undefined;
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

function normalizeActionLayout(
	surface?: PolicyUiSurfaceConfig
): PolicyUiActionLayout | undefined {
	const actionLayout = surface?.actionLayout;
	return actionLayout === 'split' || actionLayout === 'inline'
		? actionLayout
		: undefined;
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
	const actionOrder = normalizeActionOrder(surface, allowedActions);
	const normalized = {
		allowedActions,
		primaryAction: normalizePrimaryAction(surface, allowedActions),
		actionOrder,
		actionLayout: normalizeActionLayout(surface),
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
		jurisdictions: new Map<JurisdictionCode, PolicyConfig>(),
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

		for (const jurisdiction of policy.match.jurisdictions ?? []) {
			if (!compiled.jurisdictions.has(jurisdiction)) {
				compiled.jurisdictions.set(jurisdiction, policy);
			}
		}

		if (!compiled.defaultPolicy && policy.match.isDefault === true) {
			compiled.defaultPolicy = policy;
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
	jurisdiction: JurisdictionCode;
}): IndexedPolicyMatch | undefined {
	const { compiled, countryCode, regionCode, jurisdiction } = params;

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

	const jurisdictionPolicy = compiled.jurisdictions.get(jurisdiction);
	if (jurisdictionPolicy) {
		return { policy: jurisdictionPolicy, matchedBy: 'jurisdiction' };
	}

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
 * Returns `undefined` when no pack is configured or no configured policy
 * matches the request and no default is present.
 *
 * @see {@link https://v2.c15t.com/docs/frameworks/react/concepts/policy-packs}
 * @see {@link https://v2.c15t.com/docs/self-host/guides/policy-packs}
 */
export async function resolvePolicyDecision(params: {
	policies?: unknown;
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction: JurisdictionCode;
	iabEnabled?: boolean;
}): Promise<ResolvedPolicyDecision | undefined> {
	const { jurisdiction } = params;
	const parsedPolicies = parseOptionalPolicyConfigs(params.policies);

	if (!parsedPolicies || parsedPolicies.length === 0) {
		return undefined;
	}

	validatePolicies(
		parsedPolicies,
		params.iabEnabled === undefined
			? undefined
			: { iabEnabled: params.iabEnabled }
	);

	const countryCode = normalizeCountryCode(params.countryCode);
	const regionCode = normalizeRegionCode(params.regionCode);

	const matchedPolicy = resolveIndexedPolicyMatch({
		compiled: getCompiledPolicyResolver(parsedPolicies),
		countryCode,
		regionCode,
		jurisdiction,
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
