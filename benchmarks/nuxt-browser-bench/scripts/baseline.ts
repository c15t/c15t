import { fileURLToPath } from 'node:url';

// Keep generated package.json outside the root benchmarks/** workspace glob.
export const baselineServerOutputDir = fileURLToPath(
	new URL('../../../.benchmarks/builds/nuxt-browser-baseline', import.meta.url)
);

/** Refuse measurements from a consent-enabled zero-consent build. */
export const assertConsentFreeBaseline = (observation: {
	bannerInFirstHtml: boolean;
	bannerCount: number;
	initRequests: number;
	manifestRequests: number;
}): void => {
	if (
		observation.bannerInFirstHtml ||
		observation.bannerCount > 0 ||
		observation.initRequests > 0 ||
		observation.manifestRequests > 0
	) {
		throw new Error('Zero-consent baseline loaded consent UI or transport');
	}
};
