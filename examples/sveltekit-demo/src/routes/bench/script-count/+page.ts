import {
	normalizeCount,
	normalizeScriptCountVersion,
} from '$lib/bench/script-count-state';

export function load({ url }: { url: URL }) {
	return {
		version: normalizeScriptCountVersion(url.searchParams.get('version')),
		count: normalizeCount(url.searchParams.get('count')),
	};
}
