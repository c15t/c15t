/**
 * Client manifest mode loads its resolver and translations as one chunk.
 *
 * `kernel.ts` used to call `import('@c15t/core/transports/manifest')` and
 * `import('@c15t/translations/all')` separately. In a Nuxt 4 build (Vite 8,
 * Rolldown) the translations chunk then carried the shared `__export`
 * namespace helper, and the app entry imported it statically, so every page
 * downloaded all locales in its first load whatever the manifest mode. The
 * runtime now imports `./client-manifest`, which re-exports both, so its
 * chunk exports the bindings directly and needs no namespace helper.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ConsentManifest } from '@c15t/schema/types';
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { afterEach, describe, expect, test, vi } from 'vitest';

import * as clientManifest from '../runtime/client-manifest';
import type { ConsentConfig } from '../runtime/config';
import {
	createVueConsentKernelContext,
	registerClientManifest,
} from '../runtime/kernel';

const runtimeDir = join(__dirname, '../runtime');

const runtimeFiles = (readdirSync(runtimeDir, { recursive: true }) as string[])
	.filter((file) => file.endsWith('.ts') || file.endsWith('.vue'))
	.filter((file) => !file.startsWith('server/'))
	.map((file) => join(runtimeDir, file));

const dynamicImports = (source: string) =>
	[...source.matchAll(/\bimport\(\s*['"](?<specifier>[^'"]+)['"]\s*\)/gu)].map(
		(match) => match.groups?.specifier
	);

afterEach(() => {
	registerClientManifest(undefined);
});

describe('client manifest chunk', () => {
	test('no client module imports the resolver or all-locale translations on its own', () => {
		const offenders = runtimeFiles
			.filter((file) => !file.endsWith('client-manifest.ts'))
			.flatMap((file) =>
				dynamicImports(readFileSync(file, 'utf8'))
					.filter(
						(specifier) =>
							specifier === '@c15t/translations/all' ||
							specifier === '@c15t/core/transports/manifest'
					)
					.map((specifier) => `${file}: import('${specifier}')`)
			);

		expect(offenders).toEqual([]);
	});

	test('the kernel loads them through the client-manifest module', () => {
		const kernel = readFileSync(join(runtimeDir, 'kernel.ts'), 'utf8');

		expect(dynamicImports(kernel)).toContain('./client-manifest');
		expect(typeof clientManifest.createManifestTransport).toBe('function');
		expect(clientManifest.baseTranslations.en).toBeDefined();
	});

	test('client manifest mode uses resources registered with the entry', async () => {
		const createManifestTransport = vi.fn(
			clientManifest.createManifestTransport
		);
		registerClientManifest({ ...clientManifest, createManifestTransport });
		const manifest: ConsentManifest = {
			branding: 'c15t',
			policyPacks: [
				createConsentManifestPolicyPack({
					categories: ['marketing'],
					id: 'fallback',
					match: { fallback: true },
					model: 'opt-in',
					prompt: 'choice',
					scopeMode: 'strict',
				}),
			],
			revision: 'rev-1',
			schemaVersion: 2,
		} as ConsentManifest;
		const context = createVueConsentKernelContext({
			config: {
				backendURL: 'https://backend.example',
				customFetch: (() =>
					Promise.resolve(
						new Response(JSON.stringify(manifest), { status: 200 })
					)) as unknown as typeof fetch,
				manifest: 'client',
				manifestURL: 'https://cdn.example/manifest',
			} as ConsentConfig,
		});
		try {
			await context.kernel.commands.init();

			expect(createManifestTransport).toHaveBeenCalledTimes(1);
			expect(context.snapshot.value.policyRule.id).toBe('fallback');
		} finally {
			context.dispose();
		}
	});
});
