import { extractConsentRequestInputs } from '@c15t/schema/types';
import type { GlobalVendorList, InitOutput } from '@c15t/schema/types';

import { resolveIABBannerSummary } from '../libs/iab-banner-summary';

const normalizeLanguage = (language?: string): string =>
	language?.split('-')[0]?.toLowerCase() || 'en';

/**
 * Replace a fetched list with a reference and its banner summary.
 * The same summary renders on the server and during browser hydration.
 * @param payload - Init payload, left unchanged.
 * @param url - Public GVL URL, or a same-origin init route serving versioned lists.
 * @param format - Set to `init` when the URL returns an init envelope.
 * @param requestHeaders - Server request headers; only geo and GPC inputs are retained.
 * @returns Init data without the full list.
 */
export const deferInitGvl = <
	Payload extends {
		gvl?: GlobalVendorList | null;
		translations?: { language: string } | null;
		location?: { countryCode?: string | null; regionCode?: string | null };
		resolvedPrivacySignals?: { gpc?: boolean };
	},
>(
	payload: Payload,
	url: string,
	format?: 'init',
	requestHeaders?: HeadersInit
): Omit<Payload, 'gvl'> & {
	gvl?: GlobalVendorList | null;
	gvlReference?: InitOutput['gvlReference'];
} => {
	if (
		!payload.gvl?.vendors ||
		!payload.gvl.purposes ||
		!payload.gvl.vendorListVersion
	) {
		return payload;
	}
	const inputs =
		format === 'init'
			? extractConsentRequestInputs(new Headers(requestHeaders))
			: undefined;
	const summary = resolveIABBannerSummary(
		{ gvl: payload.gvl },
		{ maxItems: Number.POSITIVE_INFINITY }
	);
	return {
		...payload,
		gvl: null,
		gvlReference: {
			context: inputs
				? {
						country: payload.location?.countryCode ?? inputs.country,
						gpc: payload.resolvedPrivacySignals?.gpc ?? inputs.gpc ?? false,
						region: payload.location?.regionCode ?? inputs.region,
					}
				: undefined,
			format,
			language: normalizeLanguage(payload.translations?.language),
			summary: {
				items: summary.displayItems,
				vendorCount: summary.vendorCount,
			},
			url,
			vendorListVersion: payload.gvl.vendorListVersion,
		},
	};
};

/**
 * Builds a versioned list URL on an existing init route.
 * @param initURL - Absolute or root-relative init route.
 * @param gvl - List whose version the route must serve.
 * @param language - Language of the public list.
 * @returns The init URL with version and language query parameters.
 */
export const createGvlReferenceURL = (
	initURL: string,
	gvl: GlobalVendorList,
	language: string
): string => {
	const url = new URL(initURL, 'http://c15t.local');
	url.searchParams.set('c15t-gvl', String(gvl.vendorListVersion));
	url.searchParams.set('language', normalizeLanguage(language));
	return initURL.startsWith('/') ? `${url.pathname}${url.search}` : url.href;
};

/**
 * Serve only a public vendor list for a versioned request. A changed version
 * must never be cached under the old URL. Policy and visitor data stay out.
 * @param request - Incoming init or versioned-list request.
 * @param load - Loads the public list for the requested language.
 * @returns A list response, or null when this is an ordinary init request.
 */
export const serveGvlReference = async (
	request: Request,
	load: (language: string) => Promise<GlobalVendorList | null>
): Promise<Response | null> => {
	const url = new URL(request.url);
	const version = url.searchParams.get('c15t-gvl');
	if (version === null) {
		return null;
	}
	const language = url.searchParams.get('language') ?? 'en';
	if (!/^\d+$/u.test(version) || !/^[a-z]{2,3}$/u.test(language)) {
		return new Response(null, { status: 400 });
	}
	const gvl = await load(language);
	if (!gvl || gvl.vendorListVersion !== Number(version)) {
		return new Response(null, {
			headers: { 'cache-control': 'no-store' },
			status: 409,
		});
	}
	return Response.json(gvl, {
		headers: { 'cache-control': 'public, max-age=86400' },
	});
};

/**
 * Prepare init data for an adapter whose init route also serves the list.
 * @param payload - Resolved init data; left unchanged.
 * @param route - Init route that handles versioned-list requests.
 * @returns Init data carrying a versioned reference in place of a full list.
 */
export const deferInitGvlToRoute = (
	payload: InitOutput,
	route: string
): InitOutput =>
	payload.gvl
		? deferInitGvl(
				payload,
				createGvlReferenceURL(
					route,
					payload.gvl,
					normalizeLanguage(payload.translations?.language)
				)
			)
		: payload;
