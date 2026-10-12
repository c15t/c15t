import { normalizeCount } from '#lib/bench/script-count-state.js';

export const load = function load({ url }: { url: URL }) {
	return {
		count: normalizeCount(url.searchParams.get('count')),
	};
};
