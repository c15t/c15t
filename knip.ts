import type { KnipConfig } from 'knip';

import c15tConfig from './packages/c15t/knip.json';
import cliConfig from './packages/cli/knip.json';
import coreConfig from './packages/core/knip.json';
import loggerConfig from './packages/logger/knip.json';
import nextjsConfig from './packages/nextjs/knip.json';
import reactConfig from './packages/react/knip.json';
import svelteConfig from './packages/svelte/knip.json';
import tanstackstartConfig from './packages/tanstack-start/knip.json';
import translationsConfig from './packages/translations/knip.json';

// Package files also work as standalone Knip configs. Workspace entries
// accept their paths and plugins, but not these root-level settings.
const workspaceConfig = <
	Config extends {
		$schema?: string;
		rules?: unknown;
		ignoreExportsUsedInFile?: boolean;
	},
>(
	config: Config
) => {
	const {
		$schema: _schema,
		rules: _rules,
		ignoreExportsUsedInFile: _ignoreExports,
		...workspace
	} = config;
	return workspace;
};

const config: KnipConfig = {
	ignoreBinaries: ['turbo', 'oxfmt', 'oxlint', 'rslib'],
	ignoreExportsUsedInFile: true,
	ignoreWorkspaces: ['apps/*'],
	rules: {
		dependencies: 'error',
		exports: 'warn',
		files: 'warn',
		types: 'warn',
	},
	workspaces: {
		'packages/*': {
			entry: ['src/index.ts'],
			ignore: ['**/*.spec.{js,ts}', '**/*.test.{js,ts}', '**/dist/**'],
			ignoreDependencies: ['typescript'],
			project: '**/*.{js,ts,jsx,tsx}',
		},
		'packages/astro': {
			entry: [
				'src/index.ts',
				'src/integration.ts',
				'src/client.ts',
				'src/server.ts',
				'src/middleware.ts',
				'src/api/{init,manifest}.ts',
				'src/components/**/*.astro',
			],
			ignore: ['src/**/__tests__/**'],
			project: ['src/**/*.{ts,astro}'],
		},
		'packages/backend': {
			entry: ['src/index.ts', 'src/sql/*.ts'],
			ignore: ['src/**/*.test.ts', 'src/**/__tests__/**'],
			project: ['src/**/*.ts'],
		},
		'packages/c15t': workspaceConfig(c15tConfig),
		'packages/cli': workspaceConfig(cliConfig),
		'packages/core': workspaceConfig(coreConfig),
		'packages/logger': workspaceConfig(loggerConfig),
		'packages/nextjs': workspaceConfig(nextjsConfig),
		'packages/react': workspaceConfig(reactConfig),
		'packages/svelte': workspaceConfig(svelteConfig),
		'packages/tanstack-start': workspaceConfig(tanstackstartConfig),
		'packages/translations': workspaceConfig(translationsConfig),
		'packages/vue': {
			entry: [
				'src/{index,module,vite,devtools,composables}.ts',
				'src/runtime/plugin.nuxt.ts',
				'src/runtime/server/{init,manifest}.get.ts',
				'src/runtime/components/index.ts',
				'src/runtime/components/nuxt-consent-root.vue',
				// Compatibility entries available through the package runtime wildcard.
				'src/runtime/manifest.ts',
				'src/runtime/vue/stubs.ts',
				'src/runtime/components/lazy-surfaces.ts',
				'src/runtime/primitives/accordion-trigger.ts',
				'schema/*.ts',
				'playground/nuxt.config.ts',
				'playground/app.config.ts',
				'playground/server/**/*.ts',
			],
			ignore: ['src/**/__tests__/**'],
			project: ['src/**/*.{ts,vue}'],
		},
	},
};

export default config;
