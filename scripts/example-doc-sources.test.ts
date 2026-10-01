import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
	collectExampleRegions,
	extractRegion,
	findRegions,
	generatedExamplesDir,
	languageFor,
	listGeneratedExamples,
	renderExampleRegion,
	toPosixPath,
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
		const generated = listGeneratedExamples(root);
		expect(generated.length).toBeGreaterThan(0);
		expect(generated.filter((file) => !expected.has(file))).toEqual([]);
	});

	test('compares Windows paths in the same form as destinations', () => {
		expect(toPosixPath('nextjs\\config.mdx', '\\')).toBe('nextjs/config.mdx');
		expect(toPosixPath('nextjs/config.mdx', '/')).toBe('nextjs/config.mdx');
	});
});

describe('design recipes', () => {
	// The docs show one design across adapters, so every copy of a recipe's
	// stylesheet must match the others.
	test.each(['headless-bar-css', 'slim-bar-css'])(
		'every %s copy matches',
		(name) => {
			const copies = regions.filter((region) => region.name === name);
			expect(copies.length).toBeGreaterThan(1);
			const [first, ...rest] = copies.map((region) =>
				extractRegion(
					readFileSync(resolve(root, region.source), 'utf8'),
					region.name,
					region.source
				)
			);
			for (const copy of rest) {
				expect(copy).toBe(first);
			}
		}
	);
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

	test('publishes Storybook recipes under the Storybook app name', () => {
		const [region] = findRegions(
			'apps/storybook-react/src/docs-recipes/bottom-bar.tsx',
			'// #region docs:bottom-bar\nx\n// #endregion docs:bottom-bar'
		);
		expect(region).toMatchObject({
			app: 'apps/storybook-react',
			destination: `${generatedExamplesDir}/storybook-react/bottom-bar.mdx`,
			title: 'src/docs-recipes/bottom-bar.tsx',
		});
	});

	test('rejects files outside an example app', () => {
		expect(() =>
			findRegions(
				'apps/parity-runner/src/geometry.ts',
				'// #region docs:x\nx\n// #endregion docs:x'
			)
		).toThrow('is not inside an example app');
	});

	test('keeps code that mentions a marker outside a comment', () => {
		const content = [
			'// #region docs:note',
			"const marker = '#region docs:other';",
			'// #endregion docs:note',
		].join('\n');
		expect(findRegions('examples/react/src/x.ts', content)).toHaveLength(1);
		expect(extractRegion(content, 'note', 'x.ts')).toBe(
			"const marker = '#region docs:other';"
		);
	});

	test('reads markers in shell and block comments', () => {
		const content = [
			'# #region docs:env',
			'KEY=1',
			'# #endregion docs:env',
			'/* #region docs:css */',
			'a {}',
			'/* #endregion docs:css */',
		].join('\n');
		expect(extractRegion(content, 'env', 'x')).toBe('KEY=1');
		expect(extractRegion(content, 'css', 'x')).toBe('a {}');
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
			"  import { posthog } from '@c15t/integrations/posthog';",
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
