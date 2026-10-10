import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { docsOriginForVersion } from '../packages/cli/src/generate/docs-origin';
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

const site = 'https://c15t.com';
const files = new Set(['guides/data-fetching.md', 'frameworks/index.md']);

test('bundled links work offline and retain anchors', () => {
	expect(
		packageDocLink(
			'/docs/guides/data-fetching#what-is-a-consent-manifest',
			'frameworks/react/quickstart.md',
			files,
			site
		)
	).toBe('../../guides/data-fetching.md#what-is-a-consent-manifest');
	expect(
		packageDocLink('/docs/frameworks', 'guides/data-fetching.md', files, site)
	).toBe('../frameworks/index.md');
});

test('topics outside the bundle link to the website', () => {
	expect(
		packageDocLink(
			'/docs/self-host/quickstart',
			'guides/data-fetching.md',
			files,
			site
		)
	).toBe('https://c15t.com/docs/self-host/quickstart');
	expect(
		packageDocLink('https://inth.com', 'guides/data-fetching.md', files, site)
	).toBe('https://inth.com');
});

test('relative website routes become local Markdown links', () => {
	expect(
		packageDocLink(
			'../data-fetching#setup',
			'guides/nested/example.md',
			files,
			site
		)
	).toBe('../data-fetching.md#setup');
	expect(
		packageDocLink(
			'../data-fetching.mdx',
			'guides/nested/example.md',
			files,
			site
		)
	).toBe('../data-fetching.md');
	expect(
		packageDocLink('../assets/example.png', 'guides/example.md', files, site)
	).toBe('../assets/example.png');
});

test('other root-relative site paths link to the website', () => {
	expect(packageDocLink('/llms-full.txt', 'index.md', files, site)).toBe(
		'https://c15t.com/llms-full.txt'
	);
	expect(
		packageDocLink('//cdn.example.com/a.js', 'index.md', files, site)
	).toBe('//cdn.example.com/a.js');
});

const promptFiles = new Set([
	'upgrade-v3.md',
	'frameworks/next/upgrade-v3.md',
	'frameworks/react/upgrade-v3.md',
]);

test('prompt docs URLs become bundled files relative to the page', () => {
	expect(
		packagePromptLinks(
			'Read https://v3.c15t.com/docs/frameworks/next/upgrade-v3.md first and follow it in order.',
			'frameworks/next/upgrade-v3.md',
			promptFiles,
			site
		)
	).toBe('Read ./upgrade-v3.md first and follow it in order.');
	expect(
		packagePromptLinks(
			'Read the guide: https://v3.c15t.com/docs/frameworks/next/upgrade-v3.md, https://v3.c15t.com/docs/frameworks/react/upgrade-v3.md or https://v3.c15t.com/docs/frameworks/javascript/upgrade-v3.md. Then read https://v3.c15t.com/docs/upgrade-v3.md.',
			'upgrade-v3.md',
			promptFiles,
			site
		)
	).toBe(
		'Read the guide: ./frameworks/next/upgrade-v3.md, ./frameworks/react/upgrade-v3.md or https://v3.c15t.com/docs/frameworks/javascript/upgrade-v3.md. Then read ./upgrade-v3.md.'
	);
});

test('bundled prompt paths drop autolink brackets', () => {
	expect(
		packagePromptLinks(
			'Read <https://v3.c15t.com/docs/upgrade-v3.md> and <https://v3.c15t.com/docs/frameworks/javascript/upgrade-v3.md>.',
			'frameworks/next/upgrade-v3.md',
			promptFiles,
			site
		)
	).toBe(
		'Read ../../upgrade-v3.md and <https://v3.c15t.com/docs/frameworks/javascript/upgrade-v3.md>.'
	);
});

test('root-relative prompt paths resolve like links', () => {
	expect(
		packagePromptLinks(
			'Read /docs/upgrade-v3.md or /docs/frameworks/javascript/upgrade-v3.md.',
			'frameworks/next/upgrade-v3.md',
			promptFiles,
			site
		)
	).toBe(
		'Read ../../upgrade-v3.md or https://c15t.com/docs/frameworks/javascript/upgrade-v3.md.'
	);
});

test('prompt text keeps paths that are not site docs', () => {
	const text =
		'Proxy /api/c15t, keep `src/docs/notes.md`, and read /docsets/x, https://v3.c15t.com/docsets/x or https://inth.com/docs/a.md.';
	expect(packagePromptLinks(text, 'upgrade-v3.md', promptFiles, site)).toBe(
		text
	);
	expect(
		packagePromptLinks(
			'(/docs/upgrade-v3.md#backend)\n/docs/frameworks/react/upgrade-v3.md',
			'frameworks/next/upgrade-v3.md',
			promptFiles,
			site
		)
	).toBe('(../../upgrade-v3.md#backend)\n../react/upgrade-v3.md');
});

test('AGENTS.md root-relative links resolve beside the docs directory', () => {
	expect(
		packageIndexLinks(
			'[Index](/docs/llms.txt) · [Full](/llms-full.txt) · [Guide](/docs/upgrade-v3) · [Kept](./docs/upgrade-v3.md)',
			promptFiles,
			site
		)
	).toBe(
		'[Index](https://c15t.com/docs/llms.txt) · [Full](https://c15t.com/llms-full.txt) · [Guide](./docs/upgrade-v3.md) · [Kept](./docs/upgrade-v3.md)'
	);
});

test('unbundled pages use the docs site of the package release', () => {
	// The @c15t/cli bundle holds upgrade-v3.md but not the framework guides,
	// and c15t.com documents v2 during the v3 prereleases.
	const cliFiles = new Set(['upgrade-v3.md']);
	const v3 = docsOriginForVersion('3.0.0-alpha.9');
	expect(v3).toBe('https://v3.c15t.com');
	expect(
		packageDocLink(
			'/docs/frameworks/next/upgrade-v3',
			'upgrade-v3.md',
			cliFiles,
			v3
		)
	).toBe('https://v3.c15t.com/docs/frameworks/next/upgrade-v3');
	expect(
		packagePromptLinks(
			'Read /docs/frameworks/react/upgrade-v3.md, then /docs/upgrade-v3.md.',
			'upgrade-v3.md',
			cliFiles,
			v3
		)
	).toBe(
		'Read https://v3.c15t.com/docs/frameworks/react/upgrade-v3.md, then ./upgrade-v3.md.'
	);
	expect(packageIndexLinks('[Full](/llms-full.txt)', cliFiles, v3)).toBe(
		'[Full](https://v3.c15t.com/llms-full.txt)'
	);
	expect(docsOriginForVersion('3.0.0')).toBe('https://c15t.com');
});
