import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
	collectExampleRegions,
	extractRegion,
	findRegions,
	generatedExamplesDir,
	languageFor,
	renderExampleRegion,
} from './example-doc-sources';
import {
	compareToBaseline,
	countHandWrittenExamples,
	countInDocument,
	fragmentMarker,
	handWrittenBaselinePath,
	lowerBaseline,
} from './hand-written-examples';

const root = fileURLToPath(new URL('..', import.meta.url));
const regions = collectExampleRegions(root);

describe('generated example snippets', () => {
	test.each(regions)('$destination matches $source', (region) => {
		expect(readFileSync(resolve(root, region.destination), 'utf8')).toBe(
			renderExampleRegion(root, region)
		);
	});

	test('every generated snippet still has a source region', () => {
		const expected = new Set(regions.map((region) => region.destination));
		const generated = readdirSync(resolve(root, generatedExamplesDir), {
			encoding: 'utf8',
			recursive: true,
		})
			.filter((entry) => entry.endsWith('.mdx'))
			.map((entry) =>
				relative(root, resolve(root, generatedExamplesDir, entry))
			);
		expect(generated.filter((file) => !expected.has(file))).toEqual([]);
	});
});

describe('region extraction', () => {
	const source = [
		'import { a } from "a";',
		'// #region docs:outer title="app/layout.tsx"',
		'export const Layout = () => (',
		'\t// #region docs:inner',
		'\t<Root />',
		'\t// #endregion docs:inner',
		');',
		'// #endregion docs:outer',
	].join('\n');

	test('removes nested markers from the outer region', () => {
		expect(extractRegion(source, 'outer', 'x.tsx')).toBe(
			'export const Layout = () => (\n\t<Root />\n);'
		);
	});

	test('removes shared indentation', () => {
		expect(extractRegion(source, 'inner', 'x.tsx')).toBe('<Root />');
	});

	test('reads names and title overrides from markup comments', () => {
		const found = findRegions(
			'examples/vue/src/App.vue',
			'<!-- #region docs:root title="src/App.vue" -->\n<ConsentRoot />\n<!-- #endregion docs:root -->'
		);
		expect(found).toEqual([
			expect.objectContaining({
				destination: `${generatedExamplesDir}/vue/root.mdx`,
				title: 'src/App.vue',
			}),
		]);
	});

	test('defaults the title to the path inside the example app', () => {
		const [region] = findRegions(
			'internals/next-compat/next-16-app/app/layout.tsx',
			'// #region docs:layout\nx\n// #endregion docs:layout'
		);
		expect(region).toMatchObject({
			destination: `${generatedExamplesDir}/next-compat/next-16-app/layout.mdx`,
			title: 'app/layout.tsx',
		});
	});

	test('rejects missing and unclosed regions', () => {
		expect(() => extractRegion(source, 'absent', 'x.tsx')).toThrow(
			'has no region'
		);
		expect(() =>
			extractRegion('// #region docs:open\nx', 'open', 'x.tsx')
		).toThrow('does not close');
	});

	test('names fence languages from file names', () => {
		expect(languageFor('examples/nuxt/.env.example')).toBe('dotenv');
		expect(languageFor('examples/astro-demo/src/pages/index.astro')).toBe(
			'astro'
		);
	});
});

describe('hand-written docs examples', () => {
	test('counts code fences that import c15t, including indented tabs', () => {
		const page = [
			'```tsx title="app/layout.tsx"',
			"import { ConsentRoot } from 'c15t/next';",
			'```',
			'',
			'  ```ts',
			"  import { posthog } from '@c15t/scripts/posthog';",
			'  ```',
			'',
			'```bash',
			'npm install c15t',
			'```',
			'',
			fragmentMarker,
			'```ts',
			"import { hosted } from 'c15t/react';",
			'```',
		].join('\n');
		expect(countInDocument(page)).toBe(2);
	});

	test('do not grow beyond the baseline', () => {
		const baseline = JSON.parse(
			readFileSync(resolve(root, handWrittenBaselinePath), 'utf8')
		) as Record<string, number>;
		const { added, stale } = compareToBaseline(
			baseline,
			countHandWrittenExamples(root)
		);
		expect(
			added,
			'Move new setup code into a tested example region (see examples/shared/README.md).'
		).toEqual([]);
		expect(
			stale,
			'Run bun scripts/sync-example-docs.ts to lower the baseline.'
		).toEqual([]);
	});

	test('regenerating the baseline never admits new code', () => {
		expect(lowerBaseline({ 'a.mdx': 2 }, { 'a.mdx': 5, 'b.mdx': 1 })).toEqual({
			'a.mdx': 2,
		});
		expect(lowerBaseline({ 'a.mdx': 2 }, {})).toEqual({});
	});
});
