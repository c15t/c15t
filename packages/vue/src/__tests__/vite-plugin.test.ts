/**
 * The plain-Vue Vite plugin, and the runtime specifiers the package resolves
 * itself. The published dist ships `.js`, so the `imports` targets are
 * checked against the emitted `dist/` tree when the package is built, as it
 * always is under `turbo run test`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
			await plugin.configResolved({ root });
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
