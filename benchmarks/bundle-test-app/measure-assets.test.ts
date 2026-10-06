import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import type { Metafile } from 'esbuild';
import { expect, it } from 'vitest';

import {
	classifyEntryChunks,
	compressedSize,
	measureAsset,
	measureEntryOutputs,
} from './measure-assets';

type ChunkImports = Metafile['outputs'][string]['imports'];

const chunk = (imports: ChunkImports = []) => ({
	bytes: 1,
	exports: [],
	imports,
	inputs: {},
});

it('rejects missing and empty assets instead of reporting zero bytes', async () => {
	expect(() => compressedSize(new Uint8Array())).toThrow('empty asset');
	await expect(measureAsset('/nonexistent/c15t-bundle.js')).rejects.toThrow();
});

it('separates a real dynamic import from initial JavaScript', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'c15t-entry-'));
	try {
		const entry = join(directory, 'entry.ts');
		await writeFile(entry, 'export const load = () => import("./lazy");');
		await writeFile(
			join(directory, 'lazy.ts'),
			'export const value = "deferred";'
		);
		const result = await build({
			bundle: true,
			entryPoints: [entry],
			format: 'esm',
			metafile: true,
			outdir: join(directory, 'out'),
			splitting: true,
			write: false,
		});
		const sizes = measureEntryOutputs(result, entry);
		expect(sizes.initialGzip).toBeGreaterThan(0);
		expect(sizes.lazyGzip).toBeGreaterThan(0);
		expect(sizes.initialBrotli).toBeGreaterThan(0);
	} finally {
		await rm(directory, { force: true, recursive: true });
	}
});

it('counts only deferred chunks the entry can load', () => {
	const outputs: Metafile['outputs'] = {
		'out/a.js': chunk([
			{ kind: 'import-statement', path: 'out/chunk-shared.js' },
			{ kind: 'dynamic-import', path: 'out/b.js' },
		]),
		'out/b.js': chunk([
			{ kind: 'import-statement', path: 'out/chunk-deep.js' },
			{ external: true, kind: 'import-statement', path: 'react' },
		]),
		'out/chunk-deep.js': chunk(),
		'out/chunk-shared.js': chunk(),
		'out/entry.js': chunk([
			{ kind: 'import-statement', path: 'out/chunk-shared.js' },
			{ kind: 'dynamic-import', path: 'out/a.js' },
		]),
		'out/never-child.js': chunk(),
		// esbuild emits a chunk for an import() that tree shaking removed;
		// nothing loaded refers to it.
		'out/never.js': chunk([
			{ kind: 'import-statement', path: 'out/chunk-shared.js' },
			{ kind: 'dynamic-import', path: 'out/never-child.js' },
		]),
	};
	const { initial, reachable } = classifyEntryChunks(outputs, 'out/entry.js');
	expect([...initial].sort()).toEqual(['out/chunk-shared.js', 'out/entry.js']);
	expect([...reachable].sort()).toEqual([
		'out/a.js',
		'out/b.js',
		'out/chunk-deep.js',
		'out/chunk-shared.js',
		'out/entry.js',
	]);
});

it('measures a shared lazy chunk once and skips chunks no import() reaches', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'c15t-entry-'));
	try {
		const entry = join(directory, 'entry.ts');
		const files: Record<string, string> = {
			'a.ts':
				'import { shared } from "./shared"; export const a = () => shared("a");',
			'b.ts':
				'import { shared } from "./shared"; export const b = () => import("./c").then((m) => shared(m.c));',
			'c.ts': 'export const c = "transitively deferred";',
			'entry.ts':
				'import { used } from "./library"; export const load = () => [used, import("./a"), import("./b")];',
			'library.ts':
				'export const used = "used"; export const unused = () => import("./never");',
			'never.ts': 'export const never = "emitted but never requested";',
			'shared.ts':
				'export const shared = (value: string) => "shared " + value;',
		};
		await Promise.all(
			Object.entries(files).map(([name, source]) =>
				writeFile(join(directory, name), source)
			)
		);
		const result = await build({
			bundle: true,
			entryPoints: [entry],
			format: 'esm',
			metafile: true,
			outdir: join(directory, 'out'),
			splitting: true,
			write: false,
		});
		const lazyBySource = new Map<string, number>();
		for (const [path, output] of Object.entries(result.metafile.outputs)) {
			const file = result.outputFiles.find(
				(candidate) => basename(candidate.path) === basename(path)
			);
			if (!output.entryPoint?.endsWith('entry.ts') && file) {
				const sources = Object.keys(output.inputs).map((input) =>
					basename(input)
				);
				lazyBySource.set(sources.join(','), compressedSize(file.contents).gzip);
			}
		}
		// a, b, c, shared and never each land in a chunk of their own.
		expect([...lazyBySource.keys()].sort()).toEqual([
			'a.ts',
			'b.ts',
			'c.ts',
			'never.ts',
			'shared.ts',
		]);
		const sizes = measureEntryOutputs(result, entry);
		const sum = (sources: string[]) =>
			sources.reduce(
				(total, source) => total + (lazyBySource.get(source) ?? 0),
				0
			);
		expect(sizes.lazyGzip).toBe(
			sum(['a.ts', 'b.ts', 'c.ts', 'never.ts', 'shared.ts'])
		);
		expect(sizes.reachableLazyGzip).toBe(
			sum(['a.ts', 'b.ts', 'c.ts', 'shared.ts'])
		);
		expect(sizes.reachableLazyBrotli).toBeGreaterThan(0);
		expect(sizes.reachableLazyBrotli).toBeLessThan(sizes.lazyBrotli);
	} finally {
		await rm(directory, { force: true, recursive: true });
	}
});

it('emits every budgeted metric for real consumer entries', () => {
	const results = JSON.parse(
		execFileSync('bun', ['analyze-entries.ts', '--json'], {
			cwd: fileURLToPath(new URL('.', import.meta.url)),
			encoding: 'utf8',
		})
	) as {
		budgetDefinitions: { metric: string }[];
		metrics: { name: string }[];
		scenario: string;
	}[];
	expect(results.some((result) => result.scenario === 'iab-lazy')).toBe(true);
	for (const result of results) {
		for (const budget of result.budgetDefinitions) {
			expect(
				result.metrics.map((metric) => metric.name),
				result.scenario
			).toContain(budget.metric);
		}
	}
});
