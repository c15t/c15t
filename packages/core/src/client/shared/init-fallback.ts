import { policyDefaults } from '@c15t/schema/types';
import { enTranslations, type Translations } from '@c15t/translations';
import type { InitResponse } from '../client-interface';

type InitFallbackPolicy = NonNullable<InitResponse['policy']>;

interface ResolveFallbackPolicyOptions {
	explicitPolicy?: InitResponse['policy'];
	iabEnabled?: boolean;
}

interface BuildFallbackInitDataOptions {
	jurisdiction?: InitResponse['jurisdiction'];
	countryCode?: string | null;
	regionCode?: string | null;
	language?: string;
	translations?: Translations;
	gvl?: InitResponse['gvl'];
	policy?: InitResponse['policy'];
	policyDecision?: InitResponse['policyDecision'];
	policySnapshotToken?: InitResponse['policySnapshotToken'];
}

export function resolveFallbackPolicy(
	options: ResolveFallbackPolicyOptions
): InitFallbackPolicy {
	if (options.explicitPolicy) {
		return options.explicitPolicy;
	}

	return options.iabEnabled
		? policyDefaults.offlineIab()
		: policyDefaults.offlineOptInBanner();
}

export function buildFallbackInitData(
	options: BuildFallbackInitDataOptions
): InitResponse {
	const data: InitResponse = {
		jurisdiction: options.jurisdiction ?? 'NONE',
		location: {
			countryCode: options.countryCode ?? null,
			regionCode: options.regionCode ?? null,
		},
		translations: {
			language: options.language ?? 'en',
			translations: options.translations ?? enTranslations,
		},
		branding: 'c15t',
		gvl: options.gvl ?? null,
	};

	if (options.policy) {
		data.policy = options.policy;
	}

	if (options.policyDecision) {
		data.policyDecision = options.policyDecision;
	}

	if (options.policySnapshotToken) {
		data.policySnapshotToken = options.policySnapshotToken;
	}

	return data;
}
