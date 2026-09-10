#!/usr/bin/env bun

import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import fg from 'fast-glob';
import type { Root } from 'mdast';
import { remark } from 'remark';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';

import {
	packageDocLink,
	restorePackageDocIncludes,
} from './rewrite-package-doc-links';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface PackageDocsConfig {
	name: string;
	outDir: string;
	summary: string;
	include: string[];
}

const PACKAGE_DOCS_CONFIGS: PackageDocsConfig[] = [
	{
		include: [
			'upgrade-v3.mdx',
			'guides/**/*.mdx',
			'frameworks/javascript/**/*.mdx',
			'customization/**/*.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/core',
		outDir: 'packages/core',
		summary:
			'Headless v3 consent, Inth setup, runtime ownership and script loading.',
	},
	{
		include: [
			'upgrade-v3.mdx',
			'guides/**/*.mdx',
			'frameworks/react/**/*.mdx',
			'customization/**/*.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/react',
		outDir: 'packages/react',
		summary:
			'React v3 consent components, hooks, Inth setup and customization.',
	},
	{
		include: [
			'upgrade-v3.mdx',
			'guides/**/*.mdx',
			'frameworks/next/**/*.mdx',
			'customization/**/*.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/nextjs',
		outDir: 'packages/nextjs',
		summary:
			'Next.js v3 App Router, Pages Router, static export and hydration with Inth.',
	},
	{
		include: [
			'upgrade-v3.mdx',
			'guides/**/*.mdx',
			'frameworks/vue/**/*.mdx',
			'frameworks/nuxt/**/*.mdx',
			'customization/**/*.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/vue',
		outDir: 'packages/vue',
		summary:
			'Vue and Nuxt v3 integration, Vite setup, SSR and static hosting with Inth.',
	},
	{
		include: [
			'upgrade-v3.mdx',
			'guides/**/*.mdx',
			'frameworks/svelte/**/*.mdx',
			'frameworks/sveltekit/**/*.mdx',
			'customization/**/*.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/svelte',
		outDir: 'packages/svelte',
		summary:
			'Svelte and SvelteKit v3 providers, request loading and static hosting with Inth.',
	},
	{
		include: [
			'upgrade-v3.mdx',
			'guides/**/*.mdx',
			'frameworks/astro/**/*.mdx',
			'customization/**/*.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/astro',
		outDir: 'packages/astro',
		summary:
			'Astro v3 static and server integration, dialog adapters and runtime ownership.',
	},
	{
		include: [
			'upgrade-v3.mdx',
			'guides/**/*.mdx',
			'frameworks/tanstack-start/**/*.mdx',
			'customization/**/*.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/tanstack-start',
		outDir: 'packages/tanstack-start',
		summary:
			'TanStack Start v3 server functions, request middleware and consent boundaries.',
	},
	{
		include: [
			'upgrade-v3.mdx',
			'guides/**/*.mdx',
			'frameworks/**/*.mdx',
			'customization/**/*.mdx',
			'integrations/**/*.mdx',
		],
		name: 'c15t',
		outDir: 'packages/c15t',
		summary:
			'c15t v3 framework integration and consent management. Examples use scoped imports; the umbrella export map provides corresponding framework subpaths.',
	},
	{
		include: ['upgrade-v3.mdx', 'guides/**/*.mdx', 'self-host/**/*.mdx'],
		name: '@c15t/backend',
		outDir: 'packages/backend',
		summary:
			'Self-hosted v3 backend configuration, SQL storage, migrations and HTTP contracts.',
	},
	{
		include: [
			'upgrade-v3.mdx',
			'guides/**/*.mdx',
			'frameworks/javascript/script-loader.mdx',
			'frameworks/react/script-loader.mdx',
			'frameworks/next/script-loader.mdx',
			'customization/**/*.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/scripts',
		outDir: 'packages/scripts',
		summary:
			'Consent-aware vendor integrations and Consent Mode loading contracts.',
	},
	{
		include: ['upgrade-v3.mdx', 'guides/**/*.mdx', 'cli/**/*.mdx'],
		name: '@c15t/cli',
		outDir: 'packages/cli',
		summary:
			'c15t v3 setup, codemods, project commands and self-hosted migrations.',
	},
];

const configsByName = new Map(
	PACKAGE_DOCS_CONFIGS.map((config) => [config.name, config])
);

const selectedConfigs = function selectedConfigs() {
	const requested = process.argv.slice(2);
	if (requested.length === 0 || requested.includes('all')) {
		return PACKAGE_DOCS_CONFIGS;
	}

	return requested.map((name) => {
		const config = configsByName.get(name);
		if (!config) {
			throw new Error(`Unsupported package docs target: ${name}`);
		}
		return config;
	});
};

const runLeadtype = async function runLeadtype(config: PackageDocsConfig) {
	const outDir = join(ROOT_DIR, config.outDir);
	rmSync(join(outDir, 'AGENTS.md'), { force: true });
	rmSync(join(outDir, 'docs'), { force: true, recursive: true });

	const command = [
		'bunx',
		'leadtype',
		'generate',
		'--bundle',
		'--src',
		ROOT_DIR,
		'--out',
		outDir,
		'--name',
		config.name,
		'--summary',
		config.summary,
	];

	for (const include of config.include) {
		command.push('--include', include);
	}

	const proc = Bun.spawn(command, {
		cwd: ROOT_DIR,
		env: {
			...process.env,
			// leadtype's MDX bundling exceeds Node's default heap on the larger
			// packages (core, react); raise it here so every caller — all CI
			// workflows and local builds — gets the fix in one place.
			NODE_OPTIONS:
				`${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=6144`.trim(),
		},
		stderr: 'inherit',
		stdout: 'inherit',
	});
	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(`leadtype package docs failed for ${config.name}`);
	}

	const docsDir = join(outDir, 'docs');
	const files = await fg('**/*.md', { cwd: docsDir });
	const bundledFiles = new Set(files);
	await Promise.all(
		files.map(async (file) => {
			const processor = remark()
				.use(remarkFrontmatter)
				.use(remarkGfm)
				.use(() => (tree: Root) => {
					visit(tree, (node) => {
						if (node.type === 'link' || node.type === 'definition') {
							node.url = packageDocLink(node.url, file, bundledFiles);
						}
					});
				});
			const path = join(docsDir, file);
			const content = await restorePackageDocIncludes(
				readFileSync(path, 'utf8'),
				join(ROOT_DIR, 'docs', file.replace(/\.md$/u, '.mdx'))
			);
			writeFileSync(path, String(await processor.process(content)));
		})
	);
	// Recipes retain their real screenshots when read from an installed package.
	if (existsSync(join(docsDir, 'customization/recipes.md'))) {
		cpSync(join(ROOT_DIR, 'docs/assets/v3'), join(docsDir, 'assets/v3'), {
			recursive: true,
		});
	}

	const agentsPath = join(outDir, 'AGENTS.md');
	const docsReadmePath = join(outDir, 'docs', 'README.md');
	const agentsContent = readFileSync(agentsPath, 'utf8');
	mkdirSync(join(outDir, 'docs'), { recursive: true });
	writeFileSync(
		docsReadmePath,
		agentsContent.replaceAll('(./docs/', '(./'),
		'utf8'
	);
};

await Array.from(selectedConfigs()).reduce(
	async (previousIteration, config) => {
		await previousIteration;
		console.log(`Generating package docs for ${config.name}`);
		await runLeadtype(config);
	},
	Promise.resolve()
);
