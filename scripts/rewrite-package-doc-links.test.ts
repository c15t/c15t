import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import {
	packageDocLink,
	restorePackageDocIncludes,
} from './rewrite-package-doc-links';

test('filtered bundles retain the actual theme source', async () => {
	const source = fileURLToPath(
		new URL('../docs/customization/recipes.mdx', import.meta.url)
	);
	const markdown = await restorePackageDocIncludes(
		'[Error: Could not include file ../examples/brand-theme.ts]',
		source
	);
	expect(markdown).toContain('export const brandTheme = defineTheme(');
	expect(markdown).toContain('../assets/v3/brand-card.png');
	expect(markdown).not.toContain('[Error:');
});

test('unresolved conversion errors stop publication', async () => {
	await expect(
		restorePackageDocIncludes(
			'[Error: Could not find section "missing"]',
			'missing.mdx'
		)
	).rejects.toThrow('Incomplete documentation conversion');
});

const files = new Set(['guides/inth.md', 'frameworks/index.md']);

test('bundled links work offline and retain anchors', () => {
	expect(
		packageDocLink(
			'/docs/guides/inth#connect-your-framework',
			'frameworks/react/quickstart.md',
			files
		)
	).toBe('../../guides/inth.md#connect-your-framework');
	expect(packageDocLink('/docs/frameworks', 'guides/inth.md', files)).toBe(
		'../frameworks/index.md'
	);
});

test('topics outside the bundle link to the website', () => {
	expect(
		packageDocLink('/docs/self-host/quickstart', 'guides/inth.md', files)
	).toBe('https://c15t.com/docs/self-host/quickstart');
	expect(packageDocLink('https://inth.com', 'guides/inth.md', files)).toBe(
		'https://inth.com'
	);
});

test('relative website routes become local Markdown links', () => {
	expect(
		packageDocLink('../inth#setup', 'guides/nested/example.md', files)
	).toBe('../inth.md#setup');
	expect(packageDocLink('../inth.mdx', 'guides/nested/example.md', files)).toBe(
		'../inth.md'
	);
	expect(
		packageDocLink('../assets/example.png', 'guides/example.md', files)
	).toBe('../assets/example.png');
});
