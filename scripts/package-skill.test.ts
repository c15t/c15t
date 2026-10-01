import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import fg from 'fast-glob';
import { expect, test } from 'vitest';

import { PACKAGE_DOCS_CONFIGS } from './generate-package-docs';
import { renderPackageSkill } from './package-skill';

const docsRoot = fileURLToPath(new URL('../docs', import.meta.url));
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

test.each(PACKAGE_DOCS_CONFIGS)(
	'every $name bundle pattern matches a docs page',
	(config) => {
		const empty = config.include.filter(
			(pattern) => fg.sync(pattern, { cwd: docsRoot }).length === 0
		);
		expect(empty).toEqual([]);
	}
);

test.each(PACKAGE_DOCS_CONFIGS)(
	'$name publishes its generated docs and skill',
	(config) => {
		const manifest = JSON.parse(
			readFileSync(`${repoRoot}/${config.outDir}/package.json`, 'utf8')
		) as { files?: string[] };
		expect(manifest.files).toEqual(
			expect.arrayContaining(['AGENTS.md', 'SKILL.md', 'docs'])
		);
	}
);

test('the umbrella bundle covers every framework directory', () => {
	const umbrella = PACKAGE_DOCS_CONFIGS.find(
		(config) => config.name === 'c15t'
	);
	const files = new Set(fg.sync(umbrella?.include ?? [], { cwd: docsRoot }));
	const quickstarts = fg.sync('frameworks/*/quickstart.mdx', {
		cwd: docsRoot,
	});
	expect(quickstarts.filter((file) => !files.has(file))).toEqual([]);
	expect(files).toContain('frameworks/html/quickstart.mdx');
});

test('package skills link only to pages in the bundle', () => {
	const skill = renderPackageSkill(
		'@c15t/vue',
		{ install: '`npm install c15t@alpha`', topic: 'the project is a Vue app' },
		new Set([
			'concepts/choose-your-setup.md',
			'frameworks/vue/quickstart.md',
			'frameworks/nuxt/quickstart.md',
			'guides/verify-consent.md',
		])
	);
	expect(skill).toMatch(/^---\nname: c15t-vue\n/u);
	expect(skill).toContain('[Nuxt](./docs/frameworks/nuxt/quickstart.md)');
	expect(skill).toContain('[Vue](./docs/frameworks/vue/quickstart.md)');
	expect(skill).not.toContain('frameworks/next/');
	expect(skill).not.toContain('troubleshooting.md');
	expect(skill).toContain('Not recommended for production environments.');
	expect(skill).toContain('`npm install c15t@alpha`');
});

test('skills fit the package they ship in', () => {
	const browser = renderPackageSkill(
		'@c15t/browser',
		{ install: 'a script tag', topic: 'the site is plain HTML' },
		new Set(['frameworks/html/quickstart.md', 'frameworks/html/customize.md'])
	);
	expect(browser).toContain('data-c15t-category');
	expect(browser).toContain(
		'[HTML script tag customization](./docs/frameworks/html/customize.md)'
	);
	expect(browser).not.toContain('New apps install `c15t`');

	const next = renderPackageSkill(
		'@c15t/nextjs',
		{ install: '`npm install c15t@alpha`', topic: 'Next.js', umbrella: true },
		new Set()
	);
	expect(next).toContain('New apps install `c15t`');
});

test('the umbrella skill names the package instead of repeating c15t', () => {
	const skill = renderPackageSkill(
		'c15t',
		{ install: '`npm install c15t@alpha`', topic: 'the project uses c15t' },
		new Set()
	);
	expect(skill).toContain('\n# c15t (umbrella package)\n');
	expect(skill).toContain('with the c15t umbrella package.');
	expect(skill).not.toContain('c15t with c15t');
});
