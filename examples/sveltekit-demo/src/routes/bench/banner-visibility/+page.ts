import { normalizeBannerVersion } from '$lib/bench/banner-state';

export function load({ url }: { url: URL }) {
	return {
		version: normalizeBannerVersion(url.searchParams.get('version')),
	};
}
