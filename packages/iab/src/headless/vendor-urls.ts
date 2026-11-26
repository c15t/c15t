import type { GlobalVendorList } from '@c15t/core';

type GvlVendor = GlobalVendorList['vendors'][number];

/** A registered vendor's privacy links, for the visitor's language. */
export interface IABVendorUrls {
	/** Privacy policy URL, or `''` when the vendor declares no safe one. */
	policyUrl: string;
	/** Legitimate interest claim URL, or `null` when the vendor declares no safe one. */
	legitimateInterestUrl: string | null;
}

/**
 * Returns a vendor link only if it is safe to put in an `href`.
 *
 * Vendor links come from the Global Vendor List and from custom vendor
 * config, so c15t does not control them. Only absolute `http:` and `https:`
 * URLs with a host pass. Other schemes, relative paths, protocol-relative
 * URLs and strings that do not parse return `null`, and the vendor lists
 * show no link for them. A URL that passes is returned unchanged.
 *
 * The URL must start with `http://` or `https://`. `new URL` reads
 * `https:example.com` as absolute, but a link on an https page resolves it
 * as a path on the current site.
 *
 * @param value - A link from vendor data.
 * @returns The link, or `null` when it is missing or unsafe.
 * @example
 * ```ts
 * resolveIABSafeUrl('https://example.com/privacy'); // 'https://example.com/privacy'
 * resolveIABSafeUrl('javascript:alert(1)'); // null
 * ```
 */
export const resolveIABSafeUrl = function resolveIABSafeUrl(
	value: string | null | undefined
): string | null {
	if (typeof value !== 'string' || !/^https?:\/\//iu.test(value)) {
		return null;
	}
	try {
		const { hostname, protocol } = new URL(value);
		return (protocol === 'https:' || protocol === 'http:') && hostname
			? value
			: null;
	} catch {
		return null;
	}
};

/**
 * Picks a vendor's privacy policy and legitimate interest links.
 *
 * GVL v3 vendors list their links per language in `urls[]`. The entry for
 * `language` wins (`'de-AT'` falls back to `'de'`), then English, then the
 * vendor's first entry. Lists older than v3 carry a single `policyUrl`,
 * used when no `urls[]` entry has a privacy link. Links that
 * {@link resolveIABSafeUrl} rejects are skipped, so the next language's
 * link is used, or none.
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
	const first = (
		pick: (url: (typeof urls)[number]) => string | undefined
	): string | null => {
		for (const url of urls) {
			const safe = resolveIABSafeUrl(pick(url));
			if (safe) {
				return safe;
			}
		}
		return null;
	};
	const legacy = (vendor as { policyUrl?: unknown }).policyUrl;
	return {
		legitimateInterestUrl: first((url) => url.legIntClaim),
		policyUrl:
			first((url) => url.privacy) ??
			resolveIABSafeUrl(typeof legacy === 'string' ? legacy : null) ??
			'',
	};
};
