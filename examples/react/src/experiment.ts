import type { ConsentExperiment } from 'c15t';

/**
 * The banner-shape experiment, or `undefined` when the URL did not ask for
 * one. `control` is the default banner; `wall` blocks the page until the
 * visitor chooses. `?experiment=1` lets c15t pick the arm; `&arm=wall` sets
 * it the way a flag provider would.
 */
export const experimentFromSearch = function experimentFromSearch(
	search: string
): ConsentExperiment | undefined {
	const params = new URLSearchParams(search);
	if (params.get('experiment') !== '1') {
		return undefined;
	}
	const experiment: ConsentExperiment<'wall'> = {
		arms: { wall: { prompt: { variant: 'wall' } } },
		id: 'banner-shape',
	};
	const arm = params.get('arm');
	if (arm === null) {
		return experiment;
	}
	// From your flag provider. Omit it to let c15t pick.
	return { ...experiment, arm: arm === 'wall' ? 'wall' : 'control' };
};
