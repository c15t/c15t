import type { PolicyDecision, ResolvedPolicy } from '~/api/init';
import { jurisdictionCodes } from './constants';
import { createPolicyFingerprint } from './policy-fingerprint';

export {
	createPolicyFingerprint,
	type FingerprintHashStrategy,
	hashSha256Hex,
} from './policy-fingerprint';

export type JurisdictionCode = (typeof jurisdictionCodes)[number];
export type PolicyModel = 'opt-in' | 'opt-out' | 'none' | 'iab';
export type PolicyScopeMode = 'strict' | 'unmanaged';
export type PolicyUiMode = 'none' | 'banner' | 'dialog';
export type PolicyUiAction = 'accept' | 'reject' | 'customize';
export type PolicyUiActionLayout = 'split' | 'inline';
export type PolicyUiProfile = 'balanced' | 'compact' | 'strict';

export interface PolicyUiSurfaceConfig {
	allowedActions?: PolicyUiAction[];
	primaryAction?: PolicyUiAction;
	actionOrder?: PolicyUiAction[];
	actionLayout?: PolicyUiActionLayout;
	uiProfile?: PolicyUiProfile;
	scrollLock?: boolean;
}

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

export type PolicyMatch = PolicyConfig['match'];
export type PolicyMatchedBy = PolicyDecision['matchedBy'];
const POLICY_PURPOSE_WILDCARD = '*';

export interface ResolvedPolicyDecision {
	policy: ResolvedPolicy;
	matchedBy: PolicyMatchedBy;
	fingerprint: string;
}

export interface PolicyValidationResult {
	errors: string[];
	warnings: string[];
}

export const POLICY_MATCH_DATASET_VERSION = '2026-03-02';

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

function dedupeStrings(values: string[]): string[] {
	return [...new Set(values)];
}

function dedupeJurisdictions(values: JurisdictionCode[]): JurisdictionCode[] {
	return [...new Set(values)];
}

export const policyMatchers = {
	default(): PolicyMatch {
		return { isDefault: true };
	},

	countries(countries: string[]): PolicyMatch {
		return {
			countries: dedupeStrings(
				countries.map((country) => normalizeCountry(country))
			),
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
				merged.countries = dedupeStrings([
					...(merged.countries ?? []),
					...match.countries.map((country) => normalizeCountry(country)),
				]);
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

	return policy.consent?.categories;
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
		return dedupeStrings(preselectedCategories);
	}

	return dedupeStrings(
		preselectedCategories.filter((category) => categories.includes(category))
	);
}

function normalizeScopeMode(policy: PolicyConfig): PolicyScopeMode {
	return policy.consent?.scopeMode ?? 'unmanaged';
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
	if (!surface) {
		return false;
	}

	return Object.values(surface).some((value) => value !== undefined);
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

export function inspectPolicies(
	policies: PolicyConfig[],
	options?: { iabEnabled?: boolean }
): PolicyValidationResult {
	return {
		errors: collectPolicyErrors(policies, options),
		warnings: collectPolicyWarnings(policies),
	};
}

function normalizeAllowedActions(
	surface?: PolicyUiSurfaceConfig
): PolicyUiAction[] | undefined {
	const actions = surface?.allowedActions;
	if (!actions || actions.length === 0) {
		return undefined;
	}

	return [...new Set(actions)];
}

function normalizeActionOrder(
	surface: PolicyUiSurfaceConfig | undefined,
	allowedActions?: PolicyUiAction[]
): PolicyUiAction[] | undefined {
	const order = surface?.actionOrder;
	if (!order || order.length === 0) {
		return undefined;
	}

	const normalized = [...new Set(order)];
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

	return Object.values(normalized).some((value) => value !== undefined)
		? normalized
		: undefined;
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

export function validatePolicies(
	policies: PolicyConfig[],
	options?: { iabEnabled?: boolean }
): void {
	const { errors } = inspectPolicies(policies, options);
	if (errors.length > 0) {
		throw new Error(errors[0]);
	}
}

export async function resolvePolicyDecision(params: {
	policies?: PolicyConfig[];
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction: JurisdictionCode;
	iabEnabled?: boolean;
}): Promise<ResolvedPolicyDecision | undefined> {
	const { policies, jurisdiction } = params;

	if (!policies || policies.length === 0) {
		return undefined;
	}

	validatePolicies(
		policies,
		params.iabEnabled === undefined
			? undefined
			: { iabEnabled: params.iabEnabled }
	);

	const countryCode = normalizeCountryCode(params.countryCode);
	const regionCode = normalizeRegionCode(params.regionCode);

	const matchedPolicy = resolveIndexedPolicyMatch({
		compiled: getCompiledPolicyResolver(policies),
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
