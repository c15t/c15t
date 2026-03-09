import type {
	JurisdictionCode,
	PolicyConfig,
	PolicyModel,
	PolicyScopeMode,
	PolicyUiMode,
	PolicyUiSurfaceConfig,
} from '~/types';
import { policyMatchers } from './matchers';

export interface PolicyBuilderInput {
	id: string;
	name?: string;
	countries?: string[];
	regions?: Array<{ country: string; region: string }>;
	jurisdictions?: JurisdictionCode[];
	isDefault?: boolean;
	model?: PolicyModel;
	expiryDays?: number;
	scopeMode?: PolicyScopeMode;
	/**
	 * Consent categories scoped by the policy.
	 */
	categories?: string[];
	preselectedCategories?: string[];
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
	id: 'policy_default_world_no_banner',
	name: 'World No Banner',
	isDefault: true,
	model: 'none',
	uiMode: 'none',
};

function dedupeStrings(values?: string[]): string[] | undefined {
	if (!values || values.length === 0) {
		return undefined;
	}
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function mergeMatch(input: PolicyBuilderInput): PolicyConfig['match'] {
	return policyMatchers.merge(
		input.countries?.length ? policyMatchers.countries(input.countries) : {},
		input.regions?.length ? policyMatchers.regions(input.regions) : {},
		input.jurisdictions?.length
			? policyMatchers.jurisdictions(input.jurisdictions)
			: {},
		input.isDefault ? policyMatchers.default() : {}
	);
}

function compact<T extends Record<string, unknown>>(value: T): T | undefined {
	const entries = Object.entries(value).filter(
		([, field]) => field !== undefined
	);
	if (entries.length === 0) {
		return undefined;
	}
	return Object.fromEntries(entries) as T;
}

function compactUiSurface(
	value?: PolicyUiSurfaceConfig
): PolicyUiSurfaceConfig | undefined {
	if (!value) {
		return undefined;
	}

	return compact({
		allowedActions: dedupeStrings(value.allowedActions) as
			| PolicyUiSurfaceConfig['allowedActions']
			| undefined,
		primaryAction: value.primaryAction,
		actionOrder: dedupeStrings(value.actionOrder) as
			| PolicyUiSurfaceConfig['actionOrder']
			| undefined,
		actionLayout: value.actionLayout,
		uiProfile: value.uiProfile,
		scrollLock: value.scrollLock,
	});
}

export function buildPolicyConfig(input: PolicyBuilderInput): PolicyConfig {
	const categories = dedupeStrings(input.categories);
	const preselectedCategories = dedupeStrings(input.preselectedCategories);

	return {
		id: input.id,
		name: input.name,
		match: mergeMatch(input),
		i18n: input.i18n,
		consent: compact({
			model: input.model,
			expiryDays: input.expiryDays,
			scopeMode: input.scopeMode,
			categories,
			preselectedCategories,
		}),
		ui: compact({
			mode: input.uiMode,
			banner: compactUiSurface(input.banner),
			dialog: compactUiSurface(input.dialog),
		}),
		proof: compact({
			storeIp: input.proof?.storeIp,
			storeUserAgent: input.proof?.storeUserAgent,
			storeLanguage: input.proof?.storeLanguage,
		}),
	};
}

export function buildPolicyPack(inputs: PolicyBuilderInput[]): PolicyConfig[] {
	return inputs.map((input) => buildPolicyConfig(input));
}

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
				jurisdictions: undefined,
			}
		: DEFAULT_FALLBACK_POLICY_INPUT;

	return [...pack, buildPolicyConfig(fallbackInput)];
}

export const policyBuilder = {
	create: buildPolicyConfig,
	createPack: buildPolicyPack,
	createPackWithDefault: buildPolicyPackWithDefault,
};
