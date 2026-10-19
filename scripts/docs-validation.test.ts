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
import scriptsPackage from '../packages/integrations/package.json';
import {
	BUILT_IN_INTEGRATION_CATEGORIES,
	builtInScriptIntegrations,
} from '../packages/integrations/src/registry';

const docsRoot = fileURLToPath(new URL('../docs', import.meta.url));

function getIntegrationOverviewGroups() {
	return readFileSync(resolve(docsRoot, 'integrations/overview.mdx'), 'utf8')
		.split(/^## /mu)
		.slice(1)
		.map((section) => ({
			pages: Array.from(
				section.matchAll(
					/^\| \[[^\]]+\]\((?<route>\/docs\/integrations\/[a-z0-9-]+)\)/gmu
				),
				(match) => {
					const route = match.groups?.route;
					if (!route) {
						throw new Error('Missing integration route in overview row');
					}
					return route;
				}
			),
			title: section.slice(0, section.indexOf('\n')),
		}))
		.filter((group) => group.pages.length > 0);
}

test('documented umbrella imports exist in the package export map', async () => {
	const exports = Object.keys(umbrellaPackage.exports);
	const files = await fg('**/*.mdx', { cwd: docsRoot });
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
		'html',
		'javascript',
	]);
	for (const framework of frameworks?.children ?? []) {
		expect(framework.pages[0]).toMatchObject({
			title: 'Quickstart',
			urlPath: `/docs/frameworks/${framework.slug}/quickstart`,
		});
	}
});

/** Sidebar groups every framework uses, in this order, when it has the pages. */
const frameworkGroupOrder = [
	'Scripts and embeds',
	'Customization',
	'Components',
	'Consent API',
	'Advanced',
	'Reference',
	'Verify and troubleshoot',
];

test('framework sidebars follow the shared group template', async () => {
	const navigation = await resolveDocsNavigation({
		groups: docsConfig.groups,
		nav: docsConfig.navigation,
		srcDir: resolve(docsRoot, '..'),
	});
	const frameworks = navigation.groups.find(
		(group) => group.slug === 'frameworks'
	);
	const files = await fg('frameworks/*/**/*.mdx', { cwd: docsRoot });
	const listed = new Set<string>();
	for (const framework of frameworks?.children ?? []) {
		const titles = framework.children.map((group) => group.title);
		expect(titles).toEqual(
			frameworkGroupOrder.filter((title) => titles.includes(title))
		);
		for (const group of framework.children) {
			expect(
				group.pages.length,
				`${framework.title} / ${group.title} needs two or more pages`
			).toBeGreaterThanOrEqual(2);
		}
		for (const page of [
			...framework.pages,
			...framework.children.flatMap((group) => group.pages),
		]) {
			listed.add(page.urlPath);
		}
		// Shared pages are linked in with a leading slash and keep their route.
		const verify = framework.children
			.find((group) => group.title === 'Verify and troubleshoot')
			?.pages.map((page) => page.urlPath);
		expect(verify).toContain('/docs/guides/verify-consent');
	}
	// Every framework page is reachable from its sidebar.
	const unlisted = files
		.map((file) => `/docs/${file.slice(0, -4)}`)
		.filter((route) => !listed.has(route));
	expect(unlisted).toEqual([]);
});

/**
 * v3 is npm `latest`, so c15t install commands use bare package names. A
 * major-version pin such as `c15t@3` is allowed where a page shows what the
 * CLI installs; dist-tags such as `@alpha` are not.
 */
test('c15t install commands select the documented release', async () => {
	const files = await fg('**/*.mdx', { cwd: docsRoot });
	const wrong: string[] = [];
	for (const file of files) {
		const content = readFileSync(resolve(docsRoot, file), 'utf8');
		for (const match of content.matchAll(
			/<CommandTabs command="(?<command>[^"]+)"/gu
		)) {
			for (const name of (match.groups?.command ?? '').split(' ')) {
				const bare = name.replace(/(?<=.)@[^/]*$/u, '');
				if (!/^(?:c15t|@c15t\/.+)$/u.test(bare)) {
					continue;
				}
				if (name !== bare && !/^\d+$/u.test(name.slice(bare.length + 1))) {
					wrong.push(`${file}: ${name} (expected ${bare})`);
				}
			}
		}
	}
	expect(wrong).toEqual([]);
});

// React Native is not published with v3. Drop this check when it ships.
test('published docs do not mention React Native', async () => {
	const files = await fg(['**/*.mdx', 'docs.config.ts'], { cwd: docsRoot });
	const mentions = files.filter((file) =>
		/react[- ]native|\bExpo\b/iu.test(
			readFileSync(resolve(docsRoot, file), 'utf8')
		)
	);
	expect(mentions).toEqual([]);
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

test('integration navigation covers every vendor helper, both embeds and Shopify', async () => {
	const navigation = await resolveDocsNavigation({
		groups: docsConfig.groups,
		nav: docsConfig.navigation,
		srcDir: resolve(docsRoot, '..'),
	});
	const integrations = navigation.groups.find(
		(group) => group.slug === 'integrations'
	);
	expect(
		integrations?.children.map((group) => ({
			pages: group.pages.map((page) => page.urlPath),
			title: group.title,
		}))
	).toEqual(getIntegrationOverviewGroups());
	const vendors = Object.entries(scriptsPackage.exports)
		.filter(([, entry]) => entry.types.includes('/vendors/'))
		.map(([subpath]) => subpath.slice(2));
	// Every vendor helper has its own guide, and the registry links to it.
	expect(
		builtInScriptIntegrations
			.filter((entry) => vendors.includes(entry.packageSubpath))
			.filter((entry) => entry.docsSlug !== entry.packageSubpath)
	).toEqual([]);
	const expectedRoutes = [
		...vendors,
		'google-maps',
		'youtube',
		'shopify',
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

test('each registry integration category matches its overview group', () => {
	const groupOf = new Map(
		getIntegrationOverviewGroups().flatMap((group) =>
			group.pages.map((route) => [route, group.title])
		)
	);
	const labels = new Map(
		BUILT_IN_INTEGRATION_CATEGORIES.map((category) => [
			category.key,
			category.label,
		])
	);
	for (const integration of builtInScriptIntegrations) {
		expect(
			groupOf.get(`/docs/integrations/${integration.docsSlug}`),
			integration.docsSlug
		).toBe(labels.get(integration.integrationCategory));
	}
});

test('vendor registration tabs survive package Markdown conversion', async () => {
	const { markdown } = await convertMdxToMarkdown(
		resolve(docsRoot, 'integrations/posthog.mdx'),
		[remarkInclude, ...defaultRemarkPlugins]
	);
	expect(markdown).toContain('npm install @c15t/integrations');
	expect(markdown).toContain('<ConsentProvider options={{ mode, scripts }}>');
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

// leadtype lints the whole docs tree. That takes 11 to 13 s alone and
// reached 54 s while the rest of the suite ran on a busy machine, too close
// to a 60 s limit.
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
				/`\/docs\/(?<route>frameworks\/[a-z-]+\/[a-z-/]+)`/u
			)?.groups?.route;
			if (target && existsSync(resolve(docsRoot, `${target}.mdx`))) {
				return false;
			}
		}
		return true;
	});
	expect(errors).toEqual([]);
}, 120_000);

test('every include resolves to a file', async () => {
	// leadtype 0.2.1 lint and conversion only warn when an include is missing,
	// which silently drops the included setup code from the page.
	const files = await fg('**/*.mdx', { cwd: docsRoot });
	const missing: string[] = [];
	for (const file of files) {
		const content = readFileSync(resolve(docsRoot, file), 'utf8');
		for (const match of content.matchAll(
			/<include[^>]*\ssrc="(?<src>[^"#]+)(?:#[^"]*)?"/gu
		)) {
			const src = match.groups?.src ?? '';
			if (!existsSync(resolve(docsRoot, file, '..', src))) {
				missing.push(`${file}: ${src}`);
			}
		}
	}
	expect(missing).toEqual([]);
});
