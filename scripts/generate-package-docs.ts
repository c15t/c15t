#!/usr/bin/env bun

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
			'frameworks/javascript/**/*.mdx',
			'shared/**/*.mdx',
			'upgrade-v3.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/core',
		outDir: 'packages/core',
		summary:
			'Core JavaScript consent management docs for c15t, including client modes, script loading, callbacks, and integrations. These docs use umbrella imports; on a direct scoped install substitute @c15t/core for root c15t imports, @c15t/react for c15t/react, and @c15t/nextjs for c15t/next.',
	},
	{
		include: [
			'frameworks/react/**/*.mdx',
			'shared/**/*.mdx',
			'upgrade-v3.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/react',
		outDir: 'packages/react',
		summary:
			'React consent management docs for c15t, including consent UI, hooks, styling, script loading, and integrations. These docs use umbrella imports; on a direct scoped install substitute @c15t/react for c15t/react, @c15t/core for root c15t imports, and @c15t/nextjs for c15t/next.',
	},
	{
		include: [
			'frameworks/next/**/*.mdx',
			'shared/**/*.mdx',
			'upgrade-v3.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/nextjs',
		outDir: 'packages/nextjs',
		summary:
			'Next.js consent management docs for c15t, including App Router setup, consent UI, SSR behavior, script loading, and integrations. These docs use umbrella imports; on a direct scoped install substitute @c15t/nextjs for c15t/next, @c15t/core for root c15t imports, and @c15t/react for c15t/react.',
	},
	{
		include: ['frameworks/vue/**/*.mdx', 'upgrade-v3.mdx'],
		name: '@c15t/vue',
		outDir: 'packages/vue',
		summary: 'Vue and Nuxt policy, presentation and record migration guides.',
	},
	{
		include: ['frameworks/svelte/**/*.mdx', 'upgrade-v3.mdx'],
		name: '@c15t/svelte',
		outDir: 'packages/svelte',
		summary:
			'Svelte and SvelteKit consent setup, records, presentation and server rendering.',
	},
	{
		include: ['self-host/**/*.mdx', 'self-host/**/*.md', 'upgrade-v3.mdx'],
		name: '@c15t/backend',
		outDir: 'packages/backend',
		summary:
			'Self-hosted c15t backend docs for configuration, APIs, storage, policy packs, and operations.',
	},
	{
		include: [
			'frameworks/javascript/script-loader.mdx',
			'frameworks/react/script-loader.mdx',
			'frameworks/next/script-loader.mdx',
			'shared/react/guides/script-loader.mdx',
			'integrations/**/*.mdx',
		],
		name: '@c15t/scripts',
		outDir: 'packages/scripts',
		summary:
			'Consent-aware script integration docs for analytics, advertising pixels, tag managers, widgets, and custom loaders.',
	},
	{
		include: ['cli/**/*.mdx'],
		name: '@c15t/cli',
		outDir: 'packages/cli',
		summary:
			'c15t CLI docs for setup, generation, codemods, authentication, telemetry, and self-host workflows.',
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
