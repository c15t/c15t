import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const projectDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(projectDir, '../..');

/**
 * CSS delivery toggle for the `banner-css` page:
 * - default build: `bench-css-entry` imports the aggregate `styles.css`.
 * - `C15T_CSS=styles` build: `bench-css-entry` imports only the component
 *   stylesheets the banner renders. It builds into `.next-css-styles`, so
 *   the two builds can sit side by side.
 * Both builds load the same JavaScript. Each imports its CSS explicitly
 * rather than relying on `@c15t/ui` class maps to import it.
 */
const useStylesCss = process.env.C15T_CSS === 'styles';

const cssEntryRel = useStylesCss
	? './app/_bench/css-entry/styles.ts'
	: './app/_bench/css-entry/control.ts';
const cssEntryAbs = resolve(projectDir, cssEntryRel);

const transpilePackages = [
	'@c15t/benchmarking',
	'@c15t/iab',
	'@c15t/react',
	'@c15t/nextjs',
	'@c15t/ui',
	'@c15t/core',
];

const config: NextConfig = {
	distDir: useStylesCss ? '.next-css-styles' : '.next',
	transpilePackages,
	turbopack: {
		resolveAlias: { 'bench-css-entry': cssEntryRel },
		root: monorepoRoot,
	},
	webpack: (webpackConfig) => {
		webpackConfig.resolve ??= {};
		webpackConfig.resolve.alias = {
			...webpackConfig.resolve.alias,
			'bench-css-entry$': cssEntryAbs,
		};
		return webpackConfig;
	},
};

export default config;
