import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const projectDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(projectDir, '../../..');
const appDir = join(projectDir, 'app');
const c15tPackagesRegex = /[\\/]node_modules[\\/]@c15t[\\/]/u;

/**
 * Next 15 builds with webpack, which resolves the workspace symlinks to
 * `packages/*\/dist`. That path sits outside `node_modules`, so Next compiles
 * the built c15t packages as first-party code and its React Server Components
 * checks reject them: the dist carries no `'use client'` directives, and the
 * `@c15t/nextjs` barrel reaches `next/headers` code from client modules.
 * A real install resolves inside `node_modules` and skips those checks.
 *
 * Keep the symlinked `node_modules` paths for requests issued from fixture
 * code and from the c15t packages themselves so Next treats them like an
 * installed dependency. Next's own resolution stays untouched; turning
 * `resolve.symlinks` off globally breaks the Bun store layout Next's
 * dependencies rely on.
 */
const config: NextConfig = {
	transpilePackages: ['@c15t/next-compat-shared'],
	turbopack: {
		root: monorepoRoot,
	},
	webpack(webpackConfig) {
		webpackConfig.module.rules.push({
			resolve: { symlinks: false },
			// An empty resource is one of Next's loader-generated entries; the
			// client-component entries among them re-resolve the modules found
			// in the server build by absolute path.
			test: (resource: string) =>
				resource === '' ||
				resource.startsWith(appDir) ||
				c15tPackagesRegex.test(resource),
		});
		// Each package is linked under several nested `node_modules`
		// directories; with symlink resolution off those are distinct paths, so
		// pin every package root to one copy.
		const nextjsDir = join(projectDir, 'node_modules/@c15t/nextjs');
		webpackConfig.resolve.alias = {
			...webpackConfig.resolve.alias,
			'@c15t/core$': join(nextjsDir, 'node_modules/@c15t/core/dist/index.js'),
			'@c15t/core/transports$': join(
				nextjsDir,
				'node_modules/@c15t/core/dist/transports.js'
			),
			'@c15t/core/transports/manifest$': join(
				nextjsDir,
				'node_modules/@c15t/core/dist/transport-manifest.js'
			),
			'@c15t/nextjs$': join(nextjsDir, 'dist/index.js'),
			'@c15t/react$': join(nextjsDir, 'node_modules/@c15t/react/dist/index.js'),
		};
		return webpackConfig;
	},
};

export default config;
