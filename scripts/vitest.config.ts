import { fileURLToPath } from 'node:url';

import { transformWithOxc } from 'vite';
import { defineConfig } from 'vitest/config';

const demoScriptPath = fileURLToPath(
	new URL(
		'../examples/sveltekit-demo/src/lib/consent-manager/demo-scripts.ts',
		import.meta.url
	)
);

export default defineConfig({
	// Root tooling tests run before package builds or SvelteKit preparation.
	oxc: { exclude: [demoScriptPath] },
	plugins: [
		{
			enforce: 'pre',
			name: 'demo-scripts-without-sveltekit-config',
			resolveId(source, importer) {
				// The manifest runtime only imports core's debug emitter at runtime.
				// Resolve that real implementation without requiring a core build.
				if (
					source === '@c15t/core' &&
					importer?.endsWith('/packages/scripts/src/engine/runtime.ts')
				) {
					return fileURLToPath(
						new URL(
							'../packages/core/src/libs/script-loader/debug.ts',
							import.meta.url
						)
					);
				}
			},
			transform(code, id) {
				if (id === demoScriptPath) {
					return transformWithOxc(code, id, { tsconfig: false });
				}
			},
		},
	],
	resolve: {
		alias: Object.fromEntries(
			[
				['google-tag', 'analytics/google-tag'],
				['meta-pixel', 'ads-and-pixels/meta-pixel'],
				['microsoft-clarity', 'analytics/microsoft-clarity'],
				['tiktok-pixel', 'ads-and-pixels/tiktok-pixel'],
			].map(([entry, source]) => [
				`@c15t/scripts/${entry}`,
				fileURLToPath(
					new URL(
						`../packages/scripts/src/vendors/${source}.ts`,
						import.meta.url
					)
				),
			])
		),
	},
	root: fileURLToPath(new URL('.', import.meta.url)),
	test: {
		coverage: {
			enabled: true,
			include: ['**/*.ts', '!**/*.d.ts', '!**/node_modules/**'],
			provider: 'istanbul',
			reportOnFailure: true,
			reporter: ['text', 'json-summary', 'json', 'html'],
			reportsDirectory: './coverage',
		},
		environment: 'node',
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/.cache/**',
			'**/coverage/**',
		],
		include: ['**/*.test.ts'],
	},
});
