/**
 * Facade parity: every committed umbrella subpath must behave exactly like
 * its scoped counterpart when loaded by a consumer. The drift test in
 * `scripts/generate-umbrella-exports.test.ts` only proves the committed
 * output matches the generator, so a generator bug would be blessed there —
 * this suite is the backstop that loads both sides for real.
 *
 * Loading happens in a plain-Node subprocess (`parity-runner.mjs`), outside
 * Vitest's Vite pipeline, so resolution semantics match a real consumer. For
 * each conditional subpath the runner imports the umbrella entry and the
 * scoped entry and reports the namespace keys.
 *
 * Some scoped entries cannot load in plain Node at all — the v3 component
 * dists import raw `.css` files, and the vue runtime needs a Nuxt/Vite
 * context (`#imports`, `.vue`). Those are listed in the expected-failure
 * sets below and asserted
 * to fail **identically on both sides** instead of being skipped, so parity
 * is still checked: a missing or mistargeted shim fails with a different
 * error than the scoped entry does.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const PACKAGE_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const requireFromTest = createRequire(import.meta.url);

interface LoadOk {
	ok: true;
	keys: string[];
	hasDefault?: boolean;
}

interface LoadFailure {
	ok: false;
	code: string | null;
	name: string | null;
	message: string;
}

type LoadResult = LoadOk | LoadFailure;

interface LoadPair {
	umbrella: LoadResult;
	scoped: LoadResult;
}

interface ParityRow {
	subpath: string;
	umbrella: string;
	scoped: string;
	esm?: LoadPair;
}

const manifest = JSON.parse(
	readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8')
) as { exports: Record<string, string | Record<string, string>> };

const rows = JSON.parse(
	execFileSync(
		process.execPath,
		[join(PACKAGE_DIR, '__tests__', 'parity-runner.mjs')],
		{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
	)
) as ParityRow[];

const EXPECTED_ESM_FAILURES = new Set<string>([
	// The vue plugin/runtime entries need a Nuxt/Vite context (`#imports`)
	// or the `.vue` SFC pipeline.
	'./vue/vue-plugin',
	'./vue/consent-root',
	'./vue/consent-widget',
]);

const describeResult = function describeResult(result: LoadResult): string {
	return result.ok
		? `ok (${result.keys.length} keys)`
		: `${result.name ?? 'Error'}${result.code ? ` [${result.code}]` : ''}: ${result.message}`;
};

const normalizeFailureMessage = function normalizeFailureMessage(
	result: LoadFailure
): string {
	if (result.code !== 'ERR_UNKNOWN_FILE_EXTENSION') {
		return result.message;
	}

	// A barrel can reach any of its CSS imports first. The specific stylesheet
	// is not part of facade parity; Node rejecting the same file type is.
	return result.message.replace(/for .*\.css$/u, 'for <css module>');
};

const assertParity = function assertParity(
	subpath: string,
	pair: LoadPair,
	expectedFailures: Set<string>
) {
	if (expectedFailures.has(subpath)) {
		expect(
			pair.scoped.ok,
			`${subpath}: the scoped entry loads in plain Node now — remove it from the expected-failure list so parity compares namespaces`
		).toBe(false);
		expect(
			pair.umbrella.ok,
			`${subpath}: the umbrella entry must fail exactly like the scoped one, got ${describeResult(pair.umbrella)}`
		).toBe(false);
		if (pair.umbrella.ok || pair.scoped.ok) {
			return;
		}
		// Same error at the same place: the shim resolved into the scoped
		// package and failed there, rather than failing to resolve at all.
		expect(pair.umbrella.code, subpath).toBe(pair.scoped.code);
		expect(pair.umbrella.name, subpath).toBe(pair.scoped.name);
		expect(normalizeFailureMessage(pair.umbrella), subpath).toBe(
			normalizeFailureMessage(pair.scoped)
		);
		return;
	}

	expect(
		pair.scoped.ok,
		`${subpath}: scoped entry failed to load: ${describeResult(pair.scoped)}`
	).toBe(true);
	expect(
		pair.umbrella.ok,
		`${subpath}: umbrella entry failed to load: ${describeResult(pair.umbrella)}`
	).toBe(true);
	if (!(pair.umbrella.ok && pair.scoped.ok)) {
		return;
	}
	expect(pair.umbrella.keys, subpath).toEqual(pair.scoped.keys);
	if (
		pair.umbrella.hasDefault !== undefined &&
		pair.scoped.hasDefault !== undefined
	) {
		expect(
			pair.umbrella.hasDefault,
			`${subpath}: a default export must be forwarded iff the scoped entry has one`
		).toBe(pair.scoped.hasDefault);
	}
};

describe('umbrella facade parity', () => {
	it('ignores nondeterministic CSS traversal order in expected failures', () => {
		const failure = (file: string): LoadFailure => ({
			code: 'ERR_UNKNOWN_FILE_EXTENSION',
			message: `Unknown file extension ".css" for /styles/${file}.css`,
			name: 'TypeError',
			ok: false,
		});

		expect(normalizeFailureMessage(failure('accordion'))).toBe(
			normalizeFailureMessage(failure('button'))
		);
	});

	it('probes every conditional subpath of the committed exports map', () => {
		const probed = new Set(rows.map((row) => row.subpath));
		for (const [subpath, value] of Object.entries(manifest.exports)) {
			if (typeof value === 'string') {
				continue;
			}
			if (subpath.includes('*')) {
				const stem = subpath.slice(0, subpath.indexOf('*'));
				expect(
					rows.some((row) => row.subpath.startsWith(stem)),
					`wildcard ${subpath} expanded to no probed entries`
				).toBe(true);
				continue;
			}
			expect(probed.has(subpath), `${subpath} was not probed`).toBe(true);
		}
	});

	it('lists only real subpaths as expected failures', () => {
		const probed = new Set(rows.map((row) => row.subpath));
		for (const subpath of EXPECTED_ESM_FAILURES) {
			expect(probed.has(subpath), `${subpath} is not a probed subpath`).toBe(
				true
			);
		}
	});

	// `it.each([])` generates zero tests and a green suite — pin non-empty
	// row sets so a runner regression cannot fail open.
	const esmRows = rows.filter((row) => row.esm);
	it('probes at least one subpath as ESM', () => {
		expect(esmRows.length).toBeGreaterThan(0);
	});
	it.each(esmRows)('$subpath (ESM) matches the scoped entry', (row) => {
		assertParity(row.subpath, row.esm as LoadPair, EXPECTED_ESM_FAILURES);
	});
});

/** Mirrors the prefix mapping in `parity-runner.mjs` for file subpaths. */
const rowsScopedSpecifier = function rowsScopedSpecifier(
	subpath: string
): string {
	const segment = subpath.slice(2);
	const prefixes: [string, string][] = [
		['react', '@c15t/react'],
		['next', '@c15t/nextjs'],
		['tanstack-start', '@c15t/tanstack-start'],
		['vue', '@c15t/vue'],
	];
	for (const [prefix, packageName] of prefixes) {
		if (segment === prefix) {
			return packageName;
		}
		if (segment.startsWith(`${prefix}/`)) {
			return `${packageName}/${segment.slice(prefix.length + 1)}`;
		}
	}
	return `@c15t/core/${segment}`;
};

const listFiles = function listFiles(directory: string, prefix = ''): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			files.push(...listFiles(join(directory, entry.name), relative));
		} else {
			files.push(relative);
		}
	}
	return files;
};

describe('umbrella file subpaths', () => {
	const fileSubpaths = Object.entries(manifest.exports).filter(
		(entry): entry is [string, string] =>
			typeof entry[1] === 'string' && !entry[0].includes('*')
	);

	it.each(fileSubpaths.map(([subpath]) => ({ subpath })))(
		'$subpath resolves on both the umbrella and the scoped package',
		({ subpath }) => {
			const segment = subpath.slice(2);
			const umbrellaPath = requireFromTest.resolve(`c15t/${segment}`);
			expect(
				existsSync(umbrellaPath),
				`missing built file for ${subpath}`
			).toBe(true);

			const scoped = rowsScopedSpecifier(subpath);
			const scopedPath = requireFromTest.resolve(scoped);
			expect(existsSync(scopedPath), `missing scoped file for ${subpath}`).toBe(
				true
			);
		}
	);

	it('mirrors every vue wildcard shim onto a real scoped runtime file', () => {
		for (const wildcard of ['./vue/runtime/*', './vue/composables/*']) {
			const target = manifest.exports[wildcard];
			expect(typeof target, `${wildcard} must be a string wildcard`).toBe(
				'string'
			);
			const shimRoot = (target as string).slice(2, -2);
			const files = listFiles(join(PACKAGE_DIR, shimRoot)).filter(
				(file) => !(file.endsWith('.d.ts') || file.endsWith('.d.vue.ts'))
			);
			expect(files.length, `${wildcard} matched no shim files`).toBeGreaterThan(
				0
			);
			for (const file of files) {
				const specifier = `@c15t/vue/${wildcard.slice(6, -2)}/${file}`;
				expect(
					() => requireFromTest.resolve(specifier),
					`${wildcard}: shim ${file} has no scoped counterpart (${specifier})`
				).not.toThrow();

				if (!file.endsWith('.js')) {
					continue;
				}
				// The counterpart existing is not enough: a `.js` shim
				// re-exporting the wrong (but real) scoped module would pass.
				// Parse the specifiers the generator actually emitted, pin them
				// to this shim's own subpath, and resolve them through the
				// scoped package's exports map.
				const shimSource = readFileSync(
					join(PACKAGE_DIR, shimRoot, file),
					'utf8'
				);
				const emittedSpecifiers = [
					// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
					...shimSource.matchAll(/from '([^']+)'/gu),
				].flatMap((match) => (match[1] ? [match[1]] : []));
				expect(
					emittedSpecifiers.length,
					`${wildcard}: shim ${file} emits no re-export`
				).toBeGreaterThan(0);
				for (const emittedSpecifier of emittedSpecifiers) {
					expect(
						emittedSpecifier,
						`${wildcard}: shim ${file} re-exports the wrong scoped module`
					).toBe(specifier);
					const resolved = requireFromTest.resolve(emittedSpecifier);
					expect(
						existsSync(resolved),
						`${wildcard}: shim ${file} re-export target does not resolve to a real file (${emittedSpecifier})`
					).toBe(true);
				}
			}
		}
	});
});
