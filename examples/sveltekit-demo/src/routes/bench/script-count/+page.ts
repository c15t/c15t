import {
	normalizeCount,
	normalizeScriptCountVersion,
} from '$lib/bench/script-count-state';

export const load = function load({ url }: { url: URL }) {
	return {
		count: normalizeCount(url.searchParams.get('count')),
		version: normalizeScriptCountVersion(url.searchParams.get('version')),
	};
};
