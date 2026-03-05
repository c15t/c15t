import type { JurisdictionCode, PolicyConfig } from '~/types';

type PolicyMatch = PolicyConfig['match'];

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

export type { PolicyMatch };
