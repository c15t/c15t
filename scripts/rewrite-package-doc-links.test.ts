import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import {
	packageDocLink,
	packageIndexLinks,
	packagePromptLinks,
	restorePackageDocIncludes,
} from './rewrite-package-doc-links';

test('filtered bundles retain the actual theme source', async () => {
	const source = fileURLToPath(
		new URL('../docs/customization/recipes.mdx', import.meta.url)
	);
	const markdown = await restorePackageDocIncludes(
		'[Error: Could not include file ../shared/examples/storybook-react/brand-theme.mdx]',
		source
	);
	expect(markdown).toContain('export const brandTheme = defineTheme(');
	expect(markdown).toContain('../assets/v3/brand-card.png');
	expect(markdown).toContain('../assets/v3/headless-bar.png');
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

const files = new Set(['guides/data-fetching.md', 'frameworks/index.md']);

test('bundled links work offline and retain anchors', () => {
	expect(
		packageDocLink(
			'/docs/guides/data-fetching#what-is-a-consent-manifest',
			'frameworks/react/quickstart.md',
			files
		)
	).toBe('../../guides/data-fetching.md#what-is-a-consent-manifest');
	expect(
		packageDocLink('/docs/frameworks', 'guides/data-fetching.md', files)
	).toBe('../frameworks/index.md');
});

test('topics outside the bundle link to the website', () => {
	expect(
		packageDocLink(
			'/docs/self-host/quickstart',
			'guides/data-fetching.md',
			files
		)
	).toBe('https://c15t.com/docs/self-host/quickstart');
	expect(
		packageDocLink('https://inth.com', 'guides/data-fetching.md', files)
	).toBe('https://inth.com');
});

test('relative website routes become local Markdown links', () => {
	expect(
		packageDocLink('../data-fetching#setup', 'guides/nested/example.md', files)
	).toBe('../data-fetching.md#setup');
	expect(
		packageDocLink('../data-fetching.mdx', 'guides/nested/example.md', files)
	).toBe('../data-fetching.md');
	expect(
		packageDocLink('../assets/example.png', 'guides/example.md', files)
	).toBe('../assets/example.png');
});

test('other root-relative site paths link to the website', () => {
	expect(packageDocLink('/llms-full.txt', 'index.md', files)).toBe(
		'https://c15t.com/llms-full.txt'
	);
	expect(packageDocLink('//cdn.example.com/a.js', 'index.md', files)).toBe(
		'//cdn.example.com/a.js'
	);
});

const promptFiles = new Set([
	'upgrade-v3.md',
	'frameworks/next/upgrade-v3.md',
	'frameworks/react/upgrade-v3.md',
]);

test('prompt docs paths become bundled files relative to the page', () => {
	expect(
		packagePromptLinks(
			'Read /docs/frameworks/next/upgrade-v3.md first and follow it in order.',
			'frameworks/next/upgrade-v3.md',
			promptFiles
		)
	).toBe('Read ./upgrade-v3.md first and follow it in order.');
	expect(
		packagePromptLinks(
			'Read the guide: /docs/frameworks/next/upgrade-v3.md, /docs/frameworks/react/upgrade-v3.md or /docs/frameworks/javascript/upgrade-v3.md. Then read /docs/upgrade-v3.md.',
			'upgrade-v3.md',
			promptFiles
		)
	).toBe(
		'Read the guide: ./frameworks/next/upgrade-v3.md, ./frameworks/react/upgrade-v3.md or https://c15t.com/docs/frameworks/javascript/upgrade-v3.md. Then read ./upgrade-v3.md.'
	);
});

test('prompt text keeps paths that are not site docs', () => {
	const text =
		'Proxy /api/c15t, keep `src/docs/notes.md`, and read /docsets/x or https://inth.com/docs/a.md.';
	expect(packagePromptLinks(text, 'upgrade-v3.md', promptFiles)).toBe(text);
	expect(
		packagePromptLinks(
			'(/docs/upgrade-v3.md#backend)\n/docs/frameworks/react/upgrade-v3.md',
			'frameworks/next/upgrade-v3.md',
			promptFiles
		)
	).toBe('(../../upgrade-v3.md#backend)\n../react/upgrade-v3.md');
});

test('AGENTS.md root-relative links resolve beside the docs directory', () => {
	expect(
		packageIndexLinks(
			'[Index](/docs/llms.txt) · [Full](/llms-full.txt) · [Guide](/docs/upgrade-v3) · [Kept](./docs/upgrade-v3.md)',
			promptFiles
		)
	).toBe(
		'[Index](https://c15t.com/docs/llms.txt) · [Full](https://c15t.com/llms-full.txt) · [Guide](./docs/upgrade-v3.md) · [Kept](./docs/upgrade-v3.md)'
	);
});
