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
		'react',
		'vue',
		'nuxt',
		'svelte',
		'sveltekit',
		'astro',
		'tanstack-start',
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
});
