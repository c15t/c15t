import { normalizeBannerVersion } from '$lib/bench/banner-state';

export const load = function load({ url }: { url: URL }) {
	return {
		version: normalizeBannerVersion(url.searchParams.get('version')),
	};
};
