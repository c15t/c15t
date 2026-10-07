import type { GlobalVendorList } from '@c15t/core';

type GvlVendor = GlobalVendorList['vendors'][number];

/** A registered vendor's privacy links, for the visitor's language. */
export interface IABVendorUrls {
	/** Privacy policy URL, or `''` when the vendor declares none. */
	policyUrl: string;
	/** Legitimate interest claim URL, or `null` when the vendor declares none. */
	legitimateInterestUrl: string | null;
}

/**
 * Picks a vendor's privacy policy and legitimate interest links.
 *
 * GVL v3 vendors list their links per language in `urls[]`. The entry for
 * `language` wins (`'de-AT'` falls back to `'de'`), then English, then the
 * vendor's first entry. Lists older than v3 carry a single `policyUrl`,
 * used when no `urls[]` entry has a privacy link.
 *
 * @param vendor - A vendor from the Global Vendor List.
 * @param language - The language the consent UI shows, such as `'de'`.
 * @returns The links to show, empty when the vendor declares none.
 */
export const resolveIABVendorUrls = function resolveIABVendorUrls(
	vendor: GvlVendor,
	language?: string
): IABVendorUrls {
	const wanted = (language ?? 'en').toLowerCase();
	const [wantedBase] = wanted.split('-');
	const rank = (langId: string): number => {
		const lang = langId.toLowerCase();
		if (lang === wanted) {
			return 0;
		}
		if (lang === wantedBase) {
			return 1;
		}
		return lang === 'en' ? 2 : 3;
	};
	const urls = [...(vendor.urls ?? [])].sort(
		(left, right) => rank(left.langId) - rank(right.langId)
	);
	const legacy = (vendor as { policyUrl?: unknown }).policyUrl;
	return {
		legitimateInterestUrl:
			urls.find((url) => url.legIntClaim)?.legIntClaim ?? null,
		policyUrl:
			urls.find((url) => url.privacy)?.privacy ??
			(typeof legacy === 'string' ? legacy : ''),
	};
};
