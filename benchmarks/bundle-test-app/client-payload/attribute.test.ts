import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

import {
	attributeChunk,
	moduleOf,
	packageOf,
	sourceMappingURLOf,
	stripSourceMappingComment,
} from './attribute';
import type { BasicSourceMap } from './attribute';

describe('attributeChunk', () => {
	it('assigns every byte of a minified bundle to its source or to unmapped', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'c15t-attribution-'));
		try {
			const dependencyDir = join(directory, 'node_modules/@c15t/fake/dist');
			const dependency = join(dependencyDir, 'big.js');
			await mkdir(dependencyDir, { recursive: true });
			await writeFile(
				dependency,
				`export const big = () => ${JSON.stringify('x'.repeat(2000))};`
			);
			await writeFile(
				join(directory, 'entry.js'),
				"import { big } from './node_modules/@c15t/fake/dist/big.js';\nconsole.log(big(), 'small');"
			);
			const result = await build({
				bundle: true,
				entryPoints: [join(directory, 'entry.js')],
				format: 'esm',
				minify: true,
				outdir: join(directory, 'out'),
				sourcemap: 'external',
				write: false,
			});
			const code = result.outputFiles.find((file) =>
				file.path.endsWith('.js')
			)?.text;
			const map = result.outputFiles.find((file) =>
				file.path.endsWith('.map')
			)?.text;
			if (!(code && map)) {
				throw new Error('esbuild emitted no code or map');
			}
			const stripped = stripSourceMappingComment(code);
			expect(stripped).not.toContain('sourceMappingURL');

			const attribution = attributeChunk(
				stripped,
				JSON.parse(map) as BasicSourceMap
			);
			const attributed = [...attribution.bySource.values()].reduce(
				(sum, bytes) => sum + bytes,
				0
			);
			expect(attributed + attribution.unmappedBytes).toBe(
				attribution.totalBytes
			);
			const bySource = Object.fromEntries(
				[...attribution.bySource].map(([source, bytes]) => [
					moduleOf(source),
					bytes,
				])
			);
			// The 2,000-character string lives in the dependency, not the entry.
			expect(bySource['@c15t/fake/dist/big.js']).toBeGreaterThan(2000);
			expect(bySource['@c15t/fake/dist/big.js']).toBeGreaterThan(
				(Object.entries(bySource).find(([name]) =>
					name.endsWith('entry.js')
				)?.[1] ?? 0) * 10
			);
		} finally {
			await rm(directory, { force: true, recursive: true });
		}
	});

	it('shifts index-map sections by their line and column offsets', () => {
		// Two sections on one generated line: "AAAA" from a.js, then "BB" from
		// b.js starting at column 4. "AA" is a one-field segment at column 0 of
		// source 0; "A" alone would be a column-only segment.
		const code = 'aaaabb\ncc';
		const attribution = attributeChunk(code, {
			sections: [
				{
					map: { mappings: 'AAAA', sources: ['a.js'] },
					offset: { column: 0, line: 0 },
				},
				{
					map: { mappings: 'AAAA;AAAA', sources: ['b.js'] },
					offset: { column: 4, line: 0 },
				},
			],
		});
		expect(Object.fromEntries(attribution.bySource)).toEqual({
			'a.js': 4,
			'b.js': 4,
		});
		// The newline between the two generated lines is unmapped.
		expect(attribution.unmappedBytes).toBe(1);
		expect(attribution.totalBytes).toBe(code.length);
	});
});

describe('sourceMappingURLOf', () => {
	it('reads JS and CSS comments, which can name a differently hashed map', () => {
		const js = 'push([1]);\n\n//# sourceMappingURL=2x5-p8fvo-73-.js.map\n';
		const css = '.a{color:red}\n/*# sourceMappingURL=2615gv21dd9aj.css.map*/';
		expect(sourceMappingURLOf(js)).toBe('2x5-p8fvo-73-.js.map');
		expect(sourceMappingURLOf(css)).toBe('2615gv21dd9aj.css.map');
		expect(stripSourceMappingComment(js)).toBe('push([1]);');
		expect(stripSourceMappingComment(css)).toBe('.a{color:red}');
	});
});

describe('packageOf and moduleOf', () => {
	it('names scoped, unscoped, app, and runtime sources', () => {
		expect(
			packageOf(
				'turbopack:///[project]/node_modules/@c15t/react/dist/provider.js'
			)
		).toBe('@c15t/react');
		expect(
			packageOf('turbopack:///[project]/node_modules/c15t/shims/next.js')
		).toBe('c15t');
		expect(
			packageOf(
				'turbopack:///[project]/node_modules/next/node_modules/@swc/helpers/esm/x.js'
			)
		).toBe('@swc/helpers');
		expect(packageOf('turbopack:///[project]/components/consent.tsx')).toBe(
			'(app)'
		);
		expect(packageOf('turbopack:///[turbopack]/browser/runtime/base.ts')).toBe(
			'(turbopack runtime)'
		);
		expect(
			moduleOf('turbopack:///[project]/node_modules/@c15t/ui/dist/theme.js')
		).toBe('@c15t/ui/dist/theme.js');
	});
});
