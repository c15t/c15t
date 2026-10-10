/**
 * What the shared Vue runtime and the Nuxt plugin may import statically.
 *
 * Every Nuxt page loads `kernel.ts` and `plugin.nuxt.ts` in its first load.
 * The kernel used to carry the Vue manifest transport, so the browser
 * resolver's code (and its error literals) shipped to every Nuxt page even
 * when the server resolved the policy. The modes now come in as transport
 * factories: the Nuxt plugin builds them with core's `clientMode()`, which
 * loads the resolver with `import()` only for `resolve: 'browser'`, and the
 * Vue plugin takes the one the app imported.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

const runtimeDir = join(__dirname, '../runtime');

const runtimeFiles = (readdirSync(runtimeDir, { recursive: true }) as string[])
	.filter((file) => file.endsWith('.ts') || file.endsWith('.vue'))
	.filter((file) => !file.startsWith('server/'))
	.map((file) => join(runtimeDir, file));

const dynamicImports = (source: string) =>
	[...source.matchAll(/\bimport\(\s*['"](?<specifier>[^'"]+)['"]\s*\)/gu)].map(
		(match) => match.groups?.specifier
	);

const staticImports = (source: string) =>
	[...source.matchAll(/\bfrom\s+['"](?<specifier>[^'"]+)['"]/gu)].map(
		(match) => match.groups?.specifier
	);

describe('client boundary', () => {
	test('no client module imports the server resolver or all-locale translations', () => {
		const offenders = runtimeFiles.flatMap((file) => {
			const source = readFileSync(file, 'utf8');
			return [...dynamicImports(source), ...staticImports(source)]
				.filter(
					(specifier) =>
						specifier === '@c15t/translations/all' ||
						specifier === '@c15t/core/transports/manifest'
				)
				.map((specifier) => `${file}: ${specifier}`);
		});

		expect(offenders).toEqual([]);
	});

	test('the kernel and the Nuxt plugin import no transport', () => {
		for (const file of ['kernel.ts', 'plugin.nuxt.ts']) {
			const source = readFileSync(join(runtimeDir, file), 'utf8');
			expect(staticImports(source)).not.toContain(
				'@c15t/core/transports/manifest-browser'
			);
			expect(dynamicImports(source)).not.toContain(
				'@c15t/core/transports/manifest-browser'
			);
			expect(source).not.toMatch(/\bcreateHostedTransport\b/u);
			expect(source).not.toContain('manifest transport:');
		}
	});
});
