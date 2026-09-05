import { dedupeDefinedValues } from './policy-utils';

export type PolicyModel = 'opt-in' | 'opt-out' | 'iab';
export type PolicyScopeMode = 'strict' | 'permissive';
export interface PolicyMatch {
	regions?: { country: string; region: string }[];
	countries?: string[];
	isDefault?: boolean;
	fallback?: boolean;
}
export type PolicyMatchedBy = 'region' | 'country' | 'default' | 'fallback';
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

const normalizeCountry = function normalizeCountry(code: string): string {
	return code.trim().toUpperCase();
};

const normalizeRegion = function normalizeRegion(input: {
	country: string;
	region: string;
}): {
	country: string;
	region: string;
} {
	return {
		country: normalizeCountry(input.country),
		region: input.region.trim().toUpperCase(),
	};
};

type PolicyRegionMatcher = NonNullable<PolicyMatch['regions']>[number];

const mergeCountries = function mergeCountries(
	existing: PolicyMatch['countries'],
	countries: string[]
): PolicyMatch['countries'] {
	return (
		dedupeDefinedValues([
			...(existing ?? []),
			...countries.map((country) => normalizeCountry(country)),
		]) ?? []
	);
};

const createRegionMatcherKey = function createRegionMatcherKey(
	countryCode: string,
	regionCode: string
): string {
	return `${countryCode}:${regionCode}`;
};

const mergeRegions = function mergeRegions(
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
};

const applyPolicyMatchFragment = function applyPolicyMatchFragment(
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
};

/**
 * Matcher helpers for composing {@link PolicyMatch} objects.
 *
 * @remarks
 * These helpers normalize country and region casing and make intent explicit in
 * both backend config and tests.
 *
 * @see {@link https://c15t.com/docs/frameworks/react/concepts/policy-packs#matching-order}
 */
export const policyMatchers = {
	countries(countries: string[]): PolicyMatch {
		return {
			countries:
				dedupeDefinedValues(
					countries.map((country) => normalizeCountry(country))
				) ?? [],
		};
	},

	default(): PolicyMatch {
		return { isDefault: true };
	},

	eea(): PolicyMatch {
		return {
			countries: [...EEA_COUNTRY_CODES],
		};
	},

	eu(): PolicyMatch {
		return {
			countries: [...EU_COUNTRY_CODES],
		};
	},

	fallback(): PolicyMatch {
		return { fallback: true };
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

	regions(regions: { country: string; region: string }[]): PolicyMatch {
		return {
			regions: regions.map((region) => normalizeRegion(region)),
		};
	},

	uk(): PolicyMatch {
		return {
			countries: [...UK_COUNTRY_CODES],
		};
	},
};
