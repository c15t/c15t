import type {
	JurisdictionCode,
	PolicyConfig,
	PolicyModel,
	PolicyScopeMode,
	PolicyUiAction,
	PolicyUiActionLayout,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
} from '~/types';

export type PolicyMatchedBy = 'region' | 'country' | 'jurisdiction' | 'default';
const POLICY_PURPOSE_WILDCARD = '*';

export interface ResolvedRuntimePolicy {
	id: string;
	model: PolicyModel;
	i18n?: {
		language?: string;
		messageProfile?: string;
	};
	consent?: {
		expiryDays?: number;
		scopeMode?: PolicyScopeMode;
		purposeIds?: string[];
	};
	ui?: {
		mode?: 'none' | 'banner' | 'dialog';
		banner?: {
			allowedActions?: Array<'accept' | 'reject' | 'customize'>;
			primaryAction?: 'accept' | 'reject' | 'customize';
			actionOrder?: Array<'accept' | 'reject' | 'customize'>;
			actionLayout?: 'split' | 'inline';
			uiProfile?: 'balanced' | 'compact' | 'strict';
		};
		dialog?: {
			allowedActions?: Array<'accept' | 'reject' | 'customize'>;
			primaryAction?: 'accept' | 'reject' | 'customize';
			actionOrder?: Array<'accept' | 'reject' | 'customize'>;
			actionLayout?: 'split' | 'inline';
			uiProfile?: 'balanced' | 'compact' | 'strict';
		};
	};
	proof?: {
		storeIp?: boolean;
		storeUserAgent?: boolean;
		storeLanguage?: boolean;
	};
}

type ResolvedRuntimePolicyUiSurface = NonNullable<
	ResolvedRuntimePolicy['ui']
>['banner'];

export interface ResolvedPolicyDecision {
	policy: ResolvedRuntimePolicy;
	matchedBy: PolicyMatchedBy;
	fingerprint: string;
}

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

function normalizeModel(policy: PolicyConfig): PolicyModel {
	return policy.consent?.model ?? 'opt-in';
}

function normalizePurposeIds(policy: PolicyConfig): string[] | undefined {
	const model = normalizeModel(policy);
	if (model === 'iab') {
		return [POLICY_PURPOSE_WILDCARD];
	}

	return policy.consent?.purposeIds;
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

	// Keep any allowed actions not explicitly ordered to avoid hidden controls.
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

function normalizeUiSurface(
	surface?: PolicyUiSurfaceConfig
): ResolvedRuntimePolicyUiSurface {
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
	};

	return Object.values(normalized).some((value) => value !== undefined)
		? normalized
		: undefined;
}

function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}

	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(',')}]`;
	}

	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([, v]) => v !== undefined)
		.sort(([a], [b]) => a.localeCompare(b));

	return `{${entries
		.map(([key, v]) => `${JSON.stringify(key)}:${stableStringify(v)}`)
		.join(',')}}`;
}

async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const hash = await crypto.subtle.digest('SHA-256', data);
	const bytes = new Uint8Array(hash);
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

function matchesRegion(
	policy: PolicyConfig,
	countryCode: string | null,
	regionCode: string | null
): boolean {
	if (!countryCode || !regionCode || !policy.match.regions?.length) {
		return false;
	}

	return policy.match.regions.some(
		(region) =>
			region.country.toUpperCase() === countryCode &&
			region.region.toUpperCase() === regionCode
	);
}

function matchesCountry(
	policy: PolicyConfig,
	countryCode: string | null
): boolean {
	if (!countryCode || !policy.match.countries?.length) {
		return false;
	}

	return policy.match.countries.some(
		(country) => country.toUpperCase() === countryCode
	);
}

function matchesJurisdiction(
	policy: PolicyConfig,
	jurisdiction: JurisdictionCode
): boolean {
	return policy.match.jurisdictions?.includes(jurisdiction) ?? false;
}

function matchesDefault(policy: PolicyConfig): boolean {
	return policy.match.isDefault === true;
}

function mapPolicy(policy: PolicyConfig): ResolvedRuntimePolicy {
	const model = normalizeModel(policy);

	return {
		id: policy.id,
		model,
		i18n: policy.i18n,
		consent: {
			expiryDays: policy.consent?.expiryDays,
			scopeMode: normalizeScopeMode(policy),
			purposeIds: normalizePurposeIds(policy),
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
	const defaults = policies.filter((policy) => policy.match.isDefault);
	if (defaults.length > 1) {
		throw new Error('Only one default policy is allowed');
	}

	const usesIabModel = policies.some(
		(policy) => policy.consent?.model === 'iab'
	);
	if (usesIabModel && options && options.iabEnabled !== true) {
		throw new Error(
			'Policies using consent.model="iab" require top-level iab.enabled=true'
		);
	}

	const iabWithUiCustomization = policies.find(
		(policy) => policy.consent?.model === 'iab' && hasUiConfig(policy)
	);
	if (iabWithUiCustomization) {
		throw new Error(
			`Policy '${iabWithUiCustomization.id}' uses consent.model="iab" and cannot define ui.* overrides. IAB banner/dialog controls are fixed by TCF mode.`
		);
	}
}

export async function resolvePolicyDecision(params: {
	policies?: PolicyConfig[];
	countryCode: string | null;
	regionCode: string | null;
	jurisdiction: JurisdictionCode;
}): Promise<ResolvedPolicyDecision | undefined> {
	const { policies, jurisdiction } = params;

	if (!policies || policies.length === 0) {
		return undefined;
	}

	validatePolicies(policies);

	const countryCode = normalizeCountryCode(params.countryCode);
	const regionCode = normalizeRegionCode(params.regionCode);

	let matchedBy: PolicyMatchedBy | undefined;
	let matchedPolicy: PolicyConfig | undefined;

	matchedPolicy = policies.find((policy) =>
		matchesRegion(policy, countryCode, regionCode)
	);
	if (matchedPolicy) {
		matchedBy = 'region';
	}

	if (!matchedPolicy) {
		matchedPolicy = policies.find((policy) =>
			matchesCountry(policy, countryCode)
		);
		if (matchedPolicy) {
			matchedBy = 'country';
		}
	}

	if (!matchedPolicy) {
		matchedPolicy = policies.find((policy) =>
			matchesJurisdiction(policy, jurisdiction)
		);
		if (matchedPolicy) {
			matchedBy = 'jurisdiction';
		}
	}

	if (!matchedPolicy) {
		matchedPolicy = policies.find(matchesDefault);
		if (matchedPolicy) {
			matchedBy = 'default';
		}
	}

	if (!matchedPolicy || !matchedBy) {
		return undefined;
	}

	const policy = mapPolicy(matchedPolicy);
	const fingerprint = await sha256Hex(stableStringify(policy));

	return {
		policy,
		matchedBy,
		fingerprint,
	};
}
