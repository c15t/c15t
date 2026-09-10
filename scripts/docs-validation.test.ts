import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import fg from 'fast-glob';
import { convertMdxToMarkdown } from 'leadtype/convert';
import { lintDocs } from 'leadtype/lint';
import { resolveDocsNavigation } from 'leadtype/llm';
import { defaultRemarkPlugins, remarkInclude } from 'leadtype/remark';
import { expect, test } from 'vitest';

import docsConfig from '../docs/docs.config';
import umbrellaPackage from '../packages/c15t/package.json';
import scriptsPackage from '../packages/scripts/package.json';

const docsRoot = fileURLToPath(new URL('../docs', import.meta.url));

test('documented umbrella imports exist in the package export map', async () => {
	const exports = Object.keys(umbrellaPackage.exports);
	const files = await fg('**/*.mdx', {
		cwd: docsRoot,
		ignore: ['upgrade-v3.mdx'],
	});
	const invalidImports: string[] = [];
	for (const file of files) {
		const content = readFileSync(resolve(docsRoot, file), 'utf8');
		const imports = content.matchAll(
			/(?:from\s+|import\s*\(?)["'](?<specifier>c15t(?:\/[^"']*)?)["']/gu
		);
		for (const match of imports) {
			const name = match.groups?.specifier?.split('?')[0] ?? '';
			const key = `.${name.slice(4)}`;
			const exists = exports.some(
				(entry) =>
					entry === key ||
					(entry.endsWith('*') && key.startsWith(entry.slice(0, -1)))
			);
			if (!exists) {
				invalidImports.push(`${file}: ${name}`);
			}
		}
	}
	expect(invalidImports).toEqual([]);
});

test('framework quickstarts resolve inside the host framework group', async () => {
	const navigation = await resolveDocsNavigation({
		groups: docsConfig.groups,
		nav: docsConfig.navigation,
		srcDir: resolve(docsRoot, '..'),
	});
	const frameworks = navigation.groups.find(
		(group) => group.slug === 'frameworks'
	);
	expect(frameworks?.children.map((group) => group.slug)).toEqual([
		'next',
		'tanstack-start',
		'react',
		'nuxt',
		'vue',
		'astro',
		'svelte',
		'sveltekit',
		'javascript',
	]);
	for (const framework of frameworks?.children ?? []) {
		expect(framework.pages[0]).toMatchObject({
			title: 'Quickstart',
			urlPath: `/docs/frameworks/${framework.slug}/quickstart`,
		});
	}
});

test('installation tabs flatten to usable umbrella-package commands', async () => {
	const { markdown } = await convertMdxToMarkdown(
		resolve(docsRoot, 'frameworks/react/quickstart.mdx'),
		[remarkInclude, ...defaultRemarkPlugins]
	);
	expect(markdown).toContain('npm install c15t');
	expect(markdown).toContain('pnpm add c15t');
	expect(markdown).toContain('bun add c15t');
	expect(markdown).toContain("from 'c15t/react'");
	expect(markdown).not.toContain('CommandTabs');
	expect(markdown).not.toContain('package-install');
});

test('integration navigation covers every vendor helper and both embeds', async () => {
	const navigation = await resolveDocsNavigation({
		groups: docsConfig.groups,
		nav: docsConfig.navigation,
		srcDir: resolve(docsRoot, '..'),
	});
	const integrations = navigation.groups.find(
		(group) => group.slug === 'integrations'
	);
	expect(integrations?.children.map((group) => group.slug)).toEqual([
		'embeds',
		'tag-managers',
		'analytics',
		'functionality',
		'ads-and-pixels',
	]);
	const vendors = Object.entries(scriptsPackage.exports)
		.filter(([, entry]) => entry.types.includes('/vendors/'))
		.map(([subpath]) => subpath.slice(2));
	const expectedRoutes = [
		...vendors,
		'google-maps',
		'youtube',
		'overview',
		'building-integrations',
	].map((slug) => `/docs/integrations/${slug}`);
	const pages = [
		...(integrations?.pages ?? []),
		...(integrations?.children.flatMap((group) => group.pages) ?? []),
	];
	expect(pages.map((page) => page.urlPath).sort()).toEqual(
		expectedRoutes.sort()
	);
});

test('vendor registration tabs survive package Markdown conversion', async () => {
	const { markdown } = await convertMdxToMarkdown(
		resolve(docsRoot, 'integrations/posthog.mdx'),
		[remarkInclude, ...defaultRemarkPlugins]
	);
	expect(markdown).toContain('npm install @c15t/scripts');
	expect(markdown).toContain('c15t/react');
	expect(markdown).toContain('c15t/next');
	expect(markdown).toContain('c15t/modules/script-loader');
	expect(markdown).toContain("loadMode: 'after-consent'");
	expect(markdown).toContain("'always'");
	expect(markdown).not.toMatch(/<(?:include|Tabs|Tab|CommandTabs)\b/u);
});

test('backend guides are discoverable in navigation', async () => {
	const navigation = await resolveDocsNavigation({
		groups: docsConfig.groups,
		nav: docsConfig.navigation,
		srcDir: resolve(docsRoot, '..'),
	});
	const backend = navigation.groups.find((group) => group.slug === 'self-host');
	const files = await fg('self-host/**/*.mdx', { cwd: docsRoot });
	const pages = [
		...(backend?.pages ?? []),
		...(backend?.children.flatMap((group) => group.pages) ?? []),
	];
	expect(pages.map((page) => page.urlPath).sort()).toEqual(
		files.map((file) => `/docs/${file.slice(0, -4)}`).sort()
	);
});

test('shared framework tabs match the selector and survive Markdown conversion', async () => {
	const navigation = await resolveDocsNavigation({
		groups: docsConfig.groups,
		nav: docsConfig.navigation,
		srcDir: resolve(docsRoot, '..'),
	});
	const frameworks = navigation.groups.find(
		(group) => group.slug === 'frameworks'
	);
	const expected = frameworks?.children.map((group) => group.title);
	await Promise.all(
		['register-scripts', 'consent-embed'].map(async (file) => {
			const filename = resolve(docsRoot, `shared/integrations/${file}.mdx`);
			const content = readFileSync(filename, 'utf8');
			const tabs = [
				...content.matchAll(
					/<Tab value="(?<framework>[^"]+)">(?<body>[\s\S]*?)<\/Tab>/gu
				),
			];
			expect(tabs.map((tab) => tab.groups?.framework)).toEqual(expected);
			const { markdown } = await convertMdxToMarkdown(filename, [
				remarkInclude,
				...defaultRemarkPlugins,
			]);
			const positions = tabs.map((tab) =>
				markdown.indexOf(`**${tab.groups?.framework}**`)
			);
			expect(positions.every((position) => position >= 0)).toBe(true);
			expect(positions).toEqual(
				[...positions].sort((left, right) => left - right)
			);
			for (const tab of tabs) {
				expect(tab.groups?.body).toContain('```');
			}
			expect(markdown).not.toMatch(/<(?:include|Tabs|Tab)\b/u);
		})
	);
});

test('documentation links, includes and metadata are valid', async () => {
	const result = await lintDocs({ srcDir: docsRoot });
	const errors = result.violations.filter((violation) => {
		if (violation.severity !== 'error') {
			return false;
		}
		// leadtype 0.2.1 mistakes frameworks/index.mdx for an adapter named
		// "index.mdx". The framework picker must link across adapters, but its
		// destinations still have to exist. Keep every other lint error.
		if (
			violation.file === 'frameworks/index.mdx' &&
			violation.rule === 'cross-framework-link'
		) {
			const target = violation.message.match(
				/`\/docs\/(?<route>frameworks\/[a-z-]+\/quickstart)`/u
			)?.groups?.route;
			if (target && existsSync(resolve(docsRoot, `${target}.mdx`))) {
				return false;
			}
		}
		return true;
	});
	expect(errors).toEqual([]);
}, 15_000);
