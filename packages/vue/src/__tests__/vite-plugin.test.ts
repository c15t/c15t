/**
 * The plain-Vue Vite plugin, and the runtime specifiers the package resolves
 * itself. The published dist ships `.js`, so the `imports` targets are
 * checked against the emitted `dist/` tree when the package is built, as it
 * always is under `turbo run test`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { build } from 'vite';
import type { Rollup } from 'vite';
import { describe, expect, it, vi } from 'vitest';

import { consentManifest } from '../vite';

const packageDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const distVitePath = join(packageDir, 'dist/vite.mjs');

describe('Vue manifest module', () => {
	it('serves the snapshot to the browser of a Vue single-page app', async () => {
		const root = await mkdtemp(join(tmpdir(), 'c15t-vue-manifest-'));
		try {
			const plugin = consentManifest({
				backendURL: 'https://consent.example.com',
				fetch: vi.fn<typeof globalThis.fetch>().mockImplementation(() =>
					Promise.resolve(
						Response.json({
							branding: 'c15t',
							revision: 'vue-build',
							schemaVersion: 2,
						})
					)
				),
			});
			await plugin.configResolved({ command: 'serve', root });
			const source = await plugin.load.call(
				{ environment: { config: { consumer: 'client' } } },
				plugin.resolveId('c15t/generated') as string
			);
			expect(source).toContain('vue-build');
			expect(existsSync(join(root, 'src/c15t-manifest.ts'))).toBe(false);
		} finally {
			await rm(root, { force: true, recursive: true });
		}
	});
});

describe('Vue production builds', () => {
	const modesPath = join(packageDir, 'src/runtime/modes.ts');
	/** Builds an app entry that imports the Vue plugin's modes. */
	const buildApp = async (source: string, fetch: typeof globalThis.fetch) => {
		const root = await mkdtemp(join(tmpdir(), 'c15t-vue-build-'));
		try {
			const entry = join(root, 'entry.ts');
			await writeFile(entry, source.replace('MODES', modesPath));
			const output = (await build({
				build: {
					minify: false,
					rollupOptions: { input: entry },
					write: false,
				},
				configFile: false,
				logLevel: 'silent',
				plugins: [
					consentManifest({
						backendURL: 'https://unreachable.invalid',
						fetch,
					}),
				],
				root,
			})) as Rollup.RollupOutput;
			return output.output
				.map((chunk) => (chunk.type === 'chunk' ? chunk.code : ''))
				.join('\n');
		} finally {
			await rm(root, { force: true, recursive: true });
		}
	};
	const unreachable = () =>
		vi
			.fn<typeof globalThis.fetch>()
			.mockRejectedValue(new TypeError('fetch failed'));

	it.each(['hosted()', 'offline()'])(
		'builds an app that uses %s while the backend is down',
		async (mode) => {
			const fetch = unreachable();
			await buildApp(
				`import { hosted, offline } from 'MODES';\nexport const mode = ${mode};\n`,
				fetch
			);
			expect(fetch).not.toHaveBeenCalled();
		}
	);

	it('stops a manifest() build while the backend is down', async () => {
		const fetch = unreachable();
		await expect(
			buildApp(
				"import { manifest } from 'MODES';\nexport const mode = manifest();\n",
				fetch
			)
		).rejects.toThrow('could not fetch the consent manifest');
		expect(fetch).toHaveBeenCalledTimes(1);
	});
});

describe('location advice', () => {
	it('suggests hosted() when a manifest() build bundles a policy that depends on location', async () => {
		const warn = vi.fn();
		const plugin = consentManifest({
			backendURL: 'https://consent.example.com',
			fetch: vi.fn<typeof globalThis.fetch>().mockImplementation(() =>
				Promise.resolve(
					Response.json({
						branding: 'c15t',
						policyPacks: [
							createConsentManifestPolicyPack({
								id: 'regional',
								match: { countries: ['DE'] },
								model: 'opt-in',
								prompt: 'choice',
							}),
						],
						revision: 'vue-regional',
						schemaVersion: 2,
					})
				)
			),
		});
		plugin.configResolved({
			command: 'build',
			logger: { info: vi.fn(), warn },
			root: tmpdir(),
		});
		const source = await plugin.load.call(
			undefined,
			plugin.resolveId('c15t/generated') as string
		);
		await plugin.renderChunk(source as string);
		expect(warn).toHaveBeenCalledWith(
			expect.stringMatching(/^@c15t\/vue\/vite: .*location.*hosted\(\)/u)
		);
	});
});

interface PackageImports {
	imports: Record<string, { default: string; types: string }>;
}

describe('consentManifest()', () => {
	it('keeps the packages that ship .vue files out of dependency pre-bundling', () => {
		const { optimizeDeps } = consentManifest().config();

		expect(optimizeDeps.exclude).toEqual(
			expect.arrayContaining(['@c15t/core/generated', '@c15t/vue', 'c15t'])
		);
	});
});

describe('runtime specifiers', () => {
	// `#imports` and `#c15t/composables` resolve through the package's own
	// `imports` field in a plain Vue app, so it needs no resolver plugin.
	// Nuxt aliases both first.
	it.runIf(existsSync(distVitePath))(
		'point at runtime modules the build emits',
		() => {
			const { imports } = JSON.parse(
				readFileSync(join(packageDir, 'package.json'), 'utf8')
			) as PackageImports;

			expect(Object.keys(imports).sort()).toEqual([
				'#c15t/composables',
				'#imports',
			]);
			for (const target of Object.values(imports)) {
				expect(existsSync(join(packageDir, target.default))).toBe(true);
				expect(existsSync(join(packageDir, target.types))).toBe(true);
			}
		}
	);
});

describe('Vue backend URL variables', () => {
	/** The `backendURL` the generated module exports, for the given env. */
	const resolveBackendURL = async (
		env: Record<string, unknown>,
		options: { backendURL?: string } = {}
	) => {
		const root = await mkdtemp(join(tmpdir(), 'c15t-inth-env-'));
		try {
			const plugin = consentManifest({
				...options,
				fetch: vi
					.fn<typeof globalThis.fetch>()
					.mockRejectedValue(new Error('unreachable')),
				onBuildError: 'runtime',
			});
			await plugin.configResolved({
				command: 'serve',
				env,
				logger: { info: () => undefined, warn: () => undefined },
				root,
			});
			const source = String(
				await plugin.load.call(
					{ environment: { config: { consumer: 'server' } } },
					plugin.resolveId('@c15t/core/generated') as string
				)
			);
			return {
				backendURL: /export const backendURL = "(?<url>[^"]*)";/u.exec(source)
					?.groups?.url,
				env,
			};
		} finally {
			await rm(root, { force: true, recursive: true });
		}
	};
	const INTH = 'https://inth.example.com';
	const C15T = 'https://c15t.example.com';

	it('VITE_INTH_PROJECT_URL alone gives the backend URL', async () => {
		const { backendURL, env } = await resolveBackendURL({
			VITE_INTH_PROJECT_URL: INTH,
		});
		expect(backendURL).toBe(INTH);
		expect(env.VITE_C15T_BACKEND_URL).toBe(INTH);
	});

	it('VITE_C15T_BACKEND_URL wins when both are set', async () => {
		const { backendURL } = await resolveBackendURL({
			VITE_C15T_BACKEND_URL: C15T,
			VITE_INTH_PROJECT_URL: INTH,
		});
		expect(backendURL).toBe(C15T);
	});

	it('an explicit backendURL beats both variables', async () => {
		const { backendURL } = await resolveBackendURL(
			{ VITE_C15T_BACKEND_URL: C15T, VITE_INTH_PROJECT_URL: INTH },
			{ backendURL: 'https://option.example.com' }
		);
		expect(backendURL).toBe('https://option.example.com');
	});
});
