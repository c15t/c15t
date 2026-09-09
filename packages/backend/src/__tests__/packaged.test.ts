/**
 * The package as a consumer receives it.
 *
 * Every other test in this package imports from `src/`. That proves the code
 * works and says nothing about whether the *published artifact* does — and the
 * two can differ in ways no source test can see:
 *
 * - an `exports` entry pointing at a path `rslib` does not emit;
 * - a subpath added to `src/` but never added to the exports map, so it
 *   resolves for us and 404s for everyone else;
 * - `files` omitting something the exports map references;
 * - a type declaration that does not exist next to the JS it describes.
 *
 * `./cache` and `./db/migrations/*` were both added to that map during this
 * rewrite and never once resolved the way npm resolves them.
 *
 * This reads `dist/` rather than packing a tarball: `test` already depends on
 * `build` in `turbo.json`, so the artifact is there, and packing per test run
 * would cost more than it tells us. `scripts/check-publish-artifacts.ts`
 * remains the check on what the tarball *contains*; this is the check on
 * whether it *loads*.
 */

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assert, describe, it } from '@effect/vitest';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(
	readFileSync(join(packageRoot, 'package.json'), 'utf8')
) as {
	name: string;
	exports: Record<string, { types: string; import: string; require: string }>;
	files: string[];
};

const built = existsSync(join(packageRoot, 'dist'));
const suite = built ? describe : describe.skip;

/** Every concrete export path, with `*` patterns resolved to a real entry. */
const entries = Object.entries(manifest.exports).flatMap(
	([subpath, targets]) =>
		subpath.includes('*')
			? [
					[
						subpath.replace('*', '1-baseline'),
						Object.fromEntries(
							Object.entries(targets).map(([k, v]) => [
								k,
								v.replace('*', '1-baseline'),
							])
						) as typeof targets,
					] as const,
				]
			: [[subpath, targets] as const]
);

suite('the published artifact', () => {
	it('has a file behind every exports entry', () => {
		for (const [subpath, targets] of entries) {
			for (const [condition, target] of Object.entries(targets)) {
				assert.isTrue(
					existsSync(join(packageRoot, target)),
					`${manifest.name}${subpath.slice(1)} (${condition}) points at ${target}, which was not built`
				);
			}
		}
	});

	it('ships every path the exports map references', () => {
		// `files` decides what npm uploads. An exports entry pointing outside it
		// resolves locally and fails for everyone else.
		for (const [, targets] of entries) {
			for (const target of Object.values(targets)) {
				const top = target.replace(/^\.\//u, '').split('/')[0] ?? '';
				assert.include(
					manifest.files,
					top,
					`exports references ${target}, but "${top}" is not in "files"`
				);
			}
		}
	});

	it('loads the main entry and exposes the public API', async () => {
		const entry = manifest.exports['.']?.import ?? '';
		const module = (await import(join(packageRoot, entry))) as Record<
			string,
			unknown
		>;

		// The names the 9 dependents and the docs actually import. A missing one
		// is a broken install, not a failing test.
		for (const name of [
			'c15tInstance',
			'createMigrator',
			'migrate',
			'classify',
			'defineConfig',
			'toLayer',
			'policyRulePresets',
			'policyBuilder',
			'composePacks',
			'version',
		]) {
			assert.isDefined(module[name], `${name} is missing from the entry point`);
		}
	});

	it('loads every subpath', async () => {
		for (const [subpath, targets] of entries) {
			if (subpath === '.') {
				continue;
			}
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const module = (await import(join(packageRoot, targets.import))) as
				| Record<string, unknown>
				| undefined;
			assert.isDefined(module, `${subpath} failed to load`);
		}
	});

	it('exposes the cache adapters consumers were told to use', async () => {
		// examples/demo imports this by subpath; it was added to the exports map
		// during the rewrite and nothing resolved it as npm would.
		const cache = (await import(
			join(packageRoot, manifest.exports['./cache']?.import ?? '')
		)) as Record<string, unknown>;

		for (const name of [
			'createMemoryCacheAdapter',
			'createUpstashRedisAdapter',
			'createCloudflareKVAdapter',
			'createGVLCacheKey',
		]) {
			assert.isDefined(cache[name], `${name} is missing from ./cache`);
		}
	});

	it('resolves through the exports map, not just by file path', () => {
		// The above import concrete paths, which would pass even if the map were
		// malformed. This asks Node to resolve the specifier a consumer writes.
		const require = createRequire(join(packageRoot, 'package.json'));
		for (const [subpath] of entries) {
			const specifier = `${manifest.name}${subpath.slice(1)}`;
			assert.doesNotThrow(
				() => require.resolve(specifier),
				`${specifier} does not resolve through the exports map`
			);
		}
	});

	it('has types next to every entry', () => {
		for (const [subpath, targets] of entries) {
			assert.isTrue(
				existsSync(join(packageRoot, targets.types)),
				`${subpath} has no type declaration at ${targets.types}`
			);
		}
	});
});
