/**
 * The plain-Vue Vite plugin resolves its runtime modules relative to its own
 * file: source builds ship `.ts`, the published dist ships `.js`. Hardcoding
 * `.ts` broke every consumer of the published package, so both shapes are
 * pinned here — the source plugin against `src/`, and (when the package is
 * built, as it always is under `turbo run test`) the dist plugin against the
 * emitted `dist/` tree.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { c15tVue, consentManifest } from '../vite';

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

interface ResolvedPluginPaths {
	stubPath: string;
	composablesPath: string;
}

const resolvePluginPaths = function resolvePluginPaths(
	factory: () => unknown
): ResolvedPluginPaths {
	const plugin = factory() as {
		resolveId: (id: string) => string | undefined;
		config: () => { resolve: { alias: Record<string, string> } };
	};
	const stubPath = plugin.resolveId('#imports');
	const composablesPath = plugin.config().resolve.alias['#c15t/composables'];
	if (!(stubPath && composablesPath)) {
		throw new Error('plugin did not resolve its runtime modules');
	}
	return { composablesPath, stubPath };
};

describe('c15tVue plugin runtime resolution', () => {
	it('resolves the committed .ts runtime modules from source', () => {
		const { composablesPath, stubPath } = resolvePluginPaths(c15tVue);

		expect(stubPath).toBe(join(packageDir, 'src/runtime/vue/stubs.ts'));
		expect(existsSync(stubPath)).toBe(true);
		expect(composablesPath).toBe(
			join(packageDir, 'src/runtime/composables/index.ts')
		);
		expect(existsSync(composablesPath)).toBe(true);
	});

	it.runIf(existsSync(distVitePath))(
		'resolves the emitted .js runtime modules from dist',
		async () => {
			const distModule = (await import(pathToFileURL(distVitePath).href)) as {
				c15tVue: () => unknown;
			};
			const { composablesPath, stubPath } = resolvePluginPaths(
				distModule.c15tVue
			);

			expect(stubPath).toBe(join(packageDir, 'dist/runtime/vue/stubs.js'));
			expect(existsSync(stubPath)).toBe(true);
			expect(composablesPath).toBe(
				join(packageDir, 'dist/runtime/composables/index.js')
			);
			expect(existsSync(composablesPath)).toBe(true);
		}
	);
});
