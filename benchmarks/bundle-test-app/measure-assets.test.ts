import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import { expect, it } from 'vitest';

import {
	compressedSize,
	measureAsset,
	measureEntryOutputs,
} from './measure-assets';

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
