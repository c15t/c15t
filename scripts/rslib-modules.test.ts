import { execFileSync } from 'node:child_process';
import {
	mkdtempSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BuildResult, RslibConfig, RsbuildPlugin } from '@rslib/core';
import { createRslib } from '@rslib/core';
import { afterEach, expect, test } from 'vitest';

import coreConfig from '../packages/core/rslib.config';
import schemaConfig from '../packages/schema/rslib.config';
import {
	compactModuleMinify,
	publicEntryAliases,
} from '../packages/shared/rslib-modules';

const repository = fileURLToPath(new URL('..', import.meta.url));
const directories: string[] = [];
const builds: BuildResult[] = [];

afterEach(async () => {
	await Promise.all(builds.splice(0).map((build) => build.close()));
	for (const directory of directories.splice(0)) {
		rmSync(directory, { force: true, recursive: true });
	}
});

const temporaryDirectory = function temporaryDirectory() {
	const directory = mkdtempSync(join(tmpdir(), 'c15t-modules-'));
	directories.push(directory);
	return directory;
};

const inventory = function inventory(directory: string) {
	return Object.fromEntries(
		readdirSync(directory, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile())
			.map((entry) => {
				const filename = join(entry.parentPath, entry.name);
				return [
					filename.slice(directory.length),
					readFileSync(filename, 'utf8'),
				];
			})
	);
};

// These build the actual package configs without declarations or dependency
// builds, just as the dev scripts do. The output remains isolated from dist.
for (const [name, config] of [
	['core', coreConfig],
	['schema', schemaConfig],
] satisfies [string, RslibConfig][]) {
	test(`${name} emits every public alias on repeated production builds`, async () => {
		const output = join(temporaryDirectory(), 'output');
		const cwd = join(repository, 'packages', name);
		const manifest = JSON.parse(
			readFileSync(join(cwd, 'package.json'), 'utf8')
		);
		const buildConfig: RslibConfig = {
			...config,
			lib: config.lib?.map((lib) => ({ ...lib, dts: false })),
			output: { ...config.output, distPath: { root: output } },
		};
		const first = await createRslib({ config: buildConfig, cwd });
		builds.push(await first.build());
		const original = inventory(output);
		for (const conditions of Object.values<{ import: string; types: string }>(
			manifest.exports
		)) {
			const publicFile = conditions.import.replace('./dist/', '');
			const canonical = conditions.types
				.replace('./dist-types/', '')
				.replace(/\.d\.ts$/u, '.js');
			const emitted = readFileSync(join(output, publicFile), 'utf8');
			if (publicFile !== canonical) {
				expect(emitted).toBe(`export * from './${canonical}';\n`);
			}
			expect(readFileSync(join(output, canonical), 'utf8')).toBeTruthy();
		}
		expect(
			Object.keys(original).some((file) =>
				/__tests__|\.test\.|\.spec\./u.test(file)
			)
		).toBe(false);
		// A fresh compiler must recreate aliases after cleanDistPath, even with
		// any pre-existing Rslib disk cache left in the package directory.
		const second = await createRslib({ config: buildConfig, cwd });
		builds.push(await second.build());
		expect(inventory(output)).toEqual(original);
	}, 30_000);
}

const fixture = function fixture() {
	const cwd = temporaryDirectory();
	mkdirSync(join(cwd, 'src', 'nested'), { recursive: true });
	writeFileSync(join(cwd, 'package.json'), '{"type":"module"}');
	writeFileSync(
		join(cwd, 'tsconfig.json'),
		'{"compilerOptions":{"target":"ES2022"}}'
	);
	writeFileSync(
		join(cwd, 'src', 'index.ts'),
		"export * from './nested/state';\n"
	);
	const source = join(cwd, 'src', 'nested', 'state.ts');
	const config: RslibConfig = {
		lib: [{ bundle: false, dts: false, format: 'esm', outBase: './src' }],
		output: { minify: compactModuleMinify, target: 'node' },
		performance: { buildCache: false },
		plugins: [publicEntryAliases({ 'state.js': './nested/state.js' })],
		source: { entry: { index: ['./src/**/*.ts'] } },
	};
	return { config, cwd, source };
};

const readFixture = function readFixture(cwd: string) {
	// Fresh Node process avoids module caching between watch compilations and
	// checks aliases and canonical imports really share one stateful instance.
	return JSON.parse(
		execFileSync(
			process.execPath,
			[
				'--input-type=module',
				'-e',
				`
		import assert from 'node:assert/strict';
		import * as root from './dist/index.js';
		import * as alias from './dist/state.js';
		import * as canonical from './dist/nested/state.js';
		assert.equal(root.state, alias.state);
		assert.equal(alias.state, canonical.state);
		assert.equal(alias.namedFunction.name, 'namedFunction');
		assert.equal(alias.NamedClass.name, 'NamedClass');
		assert.equal(alias.createEmitter().name, 'emit');
		console.log(JSON.stringify(alias.state));
	`,
			],
			{ cwd, encoding: 'utf8' }
		)
	);
};

const fixtureSource = function fixtureSource(value: number) {
	return `/*! Fixture license */
export function namedFunction() { return ${value}; }
export class NamedClass {}
export function createEmitter() { return function emit() {}; }
export const state = /*#__PURE__*/ Object.freeze({ value: namedFunction() });
`;
};

test('watch emits aliases and preserves identity through edits and compiler recovery', async () => {
	const { config, cwd, source } = fixture();
	writeFileSync(source, fixtureSource(1));
	const outcomes: boolean[] = [];
	const observeCompilation: RsbuildPlugin = {
		name: 'observe-compilation',
		setup(api) {
			api.onAfterBuild(({ stats }) => {
				outcomes.push(stats?.hasErrors() ?? true);
			});
		},
	};
	config.plugins?.push(observeCompilation);
	const rslib = await createRslib({ config, cwd });
	builds.push(await rslib.build({ watch: true }));
	await expect.poll(() => outcomes.length).toBeGreaterThanOrEqual(1);
	expect(readFixture(cwd)).toEqual({ value: 1 });
	const emitted = readFileSync(join(cwd, 'dist/nested/state.js'), 'utf8');
	expect(emitted).toContain('/*! Fixture license */');
	expect(emitted).toContain('#__PURE__');

	writeFileSync(source, fixtureSource(2));
	await expect.poll(() => readFixture(cwd)).toEqual({ value: 2 });

	writeFileSync(source, 'export const broken = ;');
	await expect.poll(() => outcomes.includes(true)).toBe(true);

	writeFileSync(source, fixtureSource(3));
	await expect.poll(() => readFixture(cwd)).toEqual({ value: 3 });
	expect(outcomes.at(-1)).toBe(false);
}, 30_000);

test('a missing alias target fails the production build', async () => {
	const { config, cwd, source } = fixture();
	writeFileSync(source, fixtureSource(1));
	config.plugins = [publicEntryAliases({ 'state.js': './missing.js' })];
	const rslib = await createRslib({ config, cwd });
	await expect(rslib.build()).rejects.toThrow('Missing public entry target');
});

test('an initial compiler failure is not masked by alias writes and can recover', async () => {
	const { config, cwd, source } = fixture();
	writeFileSync(source, 'export const broken = ;');
	const failed = await createRslib({ config, cwd });
	await expect(failed.build()).rejects.toThrow('Rspack build failed');
	writeFileSync(source, fixtureSource(4));
	const recovered = await createRslib({ config, cwd });
	builds.push(await recovered.build());
	expect(readFixture(cwd)).toEqual({ value: 4 });
});
