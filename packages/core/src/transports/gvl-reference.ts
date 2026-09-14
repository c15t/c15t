import type { GlobalVendorList, InitOutput } from '@c15t/schema/types';

import { resolveIABBannerSummary } from '../libs/iab-banner-summary';

/**
 * Replace a fetched list with a reference and its banner summary.
 * The same summary renders on the server and during browser hydration.
 * @param payload - Init payload, left unchanged.
 * @param url - Public GVL URL, or a same-origin init route serving versioned lists.
 * @returns Init data without the full list.
 */
export const deferInitGvl = <
	Payload extends {
		gvl?: GlobalVendorList | null;
		translations?: { language: string } | null;
	},
>(
	payload: Payload,
	url: string,
	format?: 'init'
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
	const summary = resolveIABBannerSummary(
		{ gvl: payload.gvl },
		{ maxItems: Number.POSITIVE_INFINITY }
	);
	return {
		...payload,
		gvl: null,
		gvlReference: {
			format,
			language: payload.translations?.language.split('-')[0] || 'en',
			summary: {
				items: summary.displayItems,
				vendorCount: summary.vendorCount,
			},
			url,
			vendorListVersion: payload.gvl.vendorListVersion,
		},
	};
};

/** Builds a versioned list URL on an existing init route. */
export const createGvlReferenceURL = (
	initURL: string,
	gvl: GlobalVendorList,
	language: string
): string => {
	const url = new URL(initURL, 'http://c15t.local');
	url.searchParams.set('c15t-gvl', String(gvl.vendorListVersion));
	url.searchParams.set('language', language);
	return initURL.startsWith('/') ? `${url.pathname}${url.search}` : url.href;
};

/**
 * Serve only a public vendor list for a versioned request. A changed version
 * must never be cached under the old URL. Policy and visitor data stay out.
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

/** Prepare init data for an adapter whose init route also serves the list. */
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
					payload.translations?.language.split('-')[0] || 'en'
				)
			)
		: payload;
