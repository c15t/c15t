import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const projectDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(projectDir, '../..');

/**
 * CSS experiment toggle (see app/react-v3-banner-css):
 * - default build: `bench-css-entry` -> the @c15t/ui monolith stylesheet
 * - C15T_CSS=styles build: `bench-css-entry` -> empty; the consent-banner
 *   style-map is aliased to the @c15t/ui/styles/v3 CSS Modules shim.
 * Aliases are defined for webpack AND turbopack so the experiment is
 * bundler-agnostic. JS is byte-identical between builds apart from these
 * two module resolutions.
 */
const useStylesCss = process.env.C15T_CSS === 'styles';

const cssEntryRel = useStylesCss
	? './app/_bench/css-entry/styles.ts'
	: './app/_bench/css-entry/control.ts';
const bannerShimRel = './app/_bench/css-shim/consent-banner-shim.ts';
const cssEntryAbs = resolve(projectDir, cssEntryRel);
const bannerShimAbs = resolve(projectDir, bannerShimRel);

const transpilePackages = [
	'@c15t/benchmarking',
	'@c15t/iab',
	'@c15t/react',
	'@c15t/nextjs',
	'@c15t/ui',
	'@c15t/core',
];

const config: NextConfig = {
	transpilePackages,
	turbopack: {
		root: monorepoRoot,
		resolveAlias: {
			'bench-css-entry': cssEntryRel,
			...(useStylesCss
				? {
						'@c15t/ui/styles/components/consent-banner.module.js':
							bannerShimRel,
					}
				: {}),
		},
	},
	webpack: (webpackConfig) => {
		webpackConfig.resolve = webpackConfig.resolve ?? {};
		webpackConfig.resolve.alias = {
			...webpackConfig.resolve.alias,
			'bench-css-entry$': cssEntryAbs,
			...(useStylesCss
				? {
						'@c15t/ui/styles/components/consent-banner.module.js$':
							bannerShimAbs,
					}
				: {}),
		};
		return webpackConfig;
	},
};

export default config;
