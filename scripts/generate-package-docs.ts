#!/usr/bin/env bun

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

type PackageDocsConfig = {
	name: string;
	outDir: string;
	summary: string;
	include: string[];
};

const PACKAGE_DOCS_CONFIGS: PackageDocsConfig[] = [
	{
		name: 'c15t',
		outDir: 'packages/core',
		summary:
			'Core JavaScript consent management docs for c15t, including client modes, script loading, callbacks, and integrations.',
		include: [
			'frameworks/javascript/**/*.mdx',
			'shared/**/*.mdx',
			'integrations/**/*.mdx',
		],
	},
	{
		name: '@c15t/react',
		outDir: 'packages/react',
		summary:
			'React consent management docs for c15t, including consent UI, hooks, styling, script loading, and integrations.',
		include: [
			'frameworks/react/**/*.mdx',
			'shared/**/*.mdx',
			'integrations/**/*.mdx',
		],
	},
	{
		name: '@c15t/nextjs',
		outDir: 'packages/nextjs',
		summary:
			'Next.js consent management docs for c15t, including App Router setup, consent UI, SSR behavior, script loading, and integrations.',
		include: [
			'frameworks/next/**/*.mdx',
			'shared/**/*.mdx',
			'integrations/**/*.mdx',
		],
	},
	{
		name: '@c15t/backend',
		outDir: 'packages/backend',
		summary:
			'Self-hosted c15t backend docs for configuration, APIs, storage, policy packs, and operations.',
		include: ['self-host/**/*.mdx', 'self-host/**/*.md'],
	},
	{
		name: '@c15t/scripts',
		outDir: 'packages/scripts',
		summary:
			'Consent-aware script integration docs for analytics, advertising pixels, tag managers, widgets, and custom loaders.',
		include: [
			'frameworks/javascript/script-loader.mdx',
			'frameworks/react/script-loader.mdx',
			'frameworks/next/script-loader.mdx',
			'shared/react/guides/script-loader.mdx',
			'integrations/**/*.mdx',
		],
	},
	{
		name: '@c15t/cli',
		outDir: 'packages/cli',
		summary:
			'c15t CLI docs for setup, generation, codemods, authentication, telemetry, and self-host workflows.',
		include: ['cli/**/*.mdx'],
	},
];

const configsByName = new Map(
	PACKAGE_DOCS_CONFIGS.map((config) => [config.name, config])
);

function selectedConfigs() {
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
}

async function runLeadtype(config: PackageDocsConfig) {
	const outDir = join(ROOT_DIR, config.outDir);
	rmSync(join(outDir, 'AGENTS.md'), { force: true });
	rmSync(join(outDir, 'docs'), { recursive: true, force: true });

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
}

for (const config of selectedConfigs()) {
	console.log(`Generating package docs for ${config.name}`);
	await runLeadtype(config);
}
