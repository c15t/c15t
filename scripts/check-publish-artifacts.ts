#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PackageManifest } from './manifest-utils';
import {
	collectManifestTargets,
	readManifest,
	wildcardToRegExp,
} from './manifest-utils';

interface PackedFile {
	path: string;
	size: number;
}

interface PackResult {
	name: string;
	version: string;
	files: PackedFile[];
}

const ROOT = process.cwd();
const PACKAGES_DIR = join(ROOT, 'packages');

const distBlockedPathPatterns: { reason: string; pattern: RegExp }[] = [
	// oxlint-disable-next-line prefer-named-capture-group -- Capture indexes are part of the compatibility matcher contract.
	{ pattern: /(^|\/)__tests__(\/|$)/u, reason: 'test folder' },
	// oxlint-disable-next-line prefer-named-capture-group -- Capture indexes are part of the compatibility matcher contract.
	{ pattern: /(^|\/)__snapshots__(\/|$)/u, reason: 'snapshot folder' },
	// oxlint-disable-next-line prefer-named-capture-group -- Capture indexes are part of the compatibility matcher contract.
	{ pattern: /(^|\/)__screenshots__(\/|$)/u, reason: 'screenshot folder' },
	{ pattern: /\.test\./u, reason: 'test file' },
	{ pattern: /\.spec\./u, reason: 'spec file' },
	{ pattern: /\.e2e\./u, reason: 'e2e file' },
	{
		pattern: /(?:^|\/)mockServiceWorker\.js$/u,
		reason: 'msw mock service worker',
	},
	{
		pattern: /(?:^|\/)static\/image\//u,
		reason: 'playwright screenshot output',
	},
	{
		pattern: /(?:^|\/)rsdoctor-data\.json$/u,
		reason: 'rsdoctor report artifact',
	},
];

const requiredPackedFilesByPackage: Record<string, string[]> = {
	'@c15t/backend': ['AGENTS.md', 'docs/README.md'],
	'@c15t/cli': ['AGENTS.md', 'docs/README.md'],
	'@c15t/core': ['AGENTS.md', 'docs/README.md'],
	'@c15t/nextjs': [
		'AGENTS.md',
		'docs/README.md',
		'styles.css',
		'styles.tw3.css',
		'iab/styles.css',
		'iab/styles.tw3.css',
		'dist/styles.css',
		'dist/styles.tw3.css',
		'dist/iab/styles.css',
		'dist/iab/styles.tw3.css',
		'src/styles.css',
		'src/styles.tw3.css',
		'src/iab/styles.css',
		'src/iab/styles.tw3.css',
	],
	'@c15t/react': [
		'AGENTS.md',
		'docs/README.md',
		'styles.css',
		'styles.tw3.css',
		'iab/styles.css',
		'iab/styles.tw3.css',
		'dist/styles.css',
		'dist/styles.tw3.css',
		'dist/iab/styles.css',
		'dist/iab/styles.tw3.css',
		'src/styles.tw3.css',
		'src/iab/styles.tw3.css',
	],
	'@c15t/scripts': ['AGENTS.md', 'docs/README.md'],
	'@c15t/ui': [
		'styles.css',
		'styles.tw3.css',
		'iab/styles.css',
		'iab/styles.tw3.css',
		'dist/styles.css',
		'dist/styles.tw3.css',
		'dist/iab/styles.css',
		'dist/iab/styles.tw3.css',
	],
	c15t: ['AGENTS.md'],
};

const styleEntrypointPackages = new Set([
	'@c15t/ui',
	'@c15t/react',
	'@c15t/nextjs',
]);

const rootTw3ProxyContents: Record<string, string> = {
	'iab/styles.tw3.css': '@import "../dist/iab/styles.tw3.css";',
	'styles.tw3.css': '@import "./dist/styles.tw3.css";',
};

const scanPackedManifestTargets = function scanPackedManifestTargets(
	manifest: PackageManifest,
	packedFilePaths: Set<string>
): { path: string; size: number; reason: string }[] {
	const packedFiles = [...packedFilePaths];

	return collectManifestTargets(manifest)
		.filter(({ target }) => {
			if (target.includes('*')) {
				const pattern = wildcardToRegExp(target);
				return !packedFiles.some((filePath) => pattern.test(filePath));
			}

			return !packedFilePaths.has(target);
		})
		.map(({ source, target }) => ({
			path: target,
			reason: `manifest target missing from packed files (${source})`,
			size: 0,
		}));
};

const runPack = function runPack(packageDir: string): PackResult {
	const proc = Bun.spawnSync(['npm', 'pack', '--json', '--dry-run'], {
		cwd: packageDir,
		stderr: 'pipe',
		stdout: 'pipe',
	});

	if (proc.exitCode !== 0) {
		const stderr = new TextDecoder().decode(proc.stderr);
		const stdout = new TextDecoder().decode(proc.stdout);
		throw new Error(
			`npm pack failed in ${packageDir}\nstdout:\n${stdout}\nstderr:\n${stderr}`
		);
	}

	const stdout = new TextDecoder().decode(proc.stdout).trim();
	const jsonStart = stdout.indexOf('[\n  {');
	const jsonEnd = stdout.lastIndexOf('\n]');
	const jsonPayload =
		jsonStart >= 0 && jsonEnd >= jsonStart
			? stdout.slice(jsonStart, jsonEnd + 2)
			: stdout.slice(Math.max(stdout.indexOf('{'), 0));
	const parsed = JSON.parse(jsonPayload) as
		| PackResult[]
		| Record<string, PackResult>;

	// npm ≤11 prints an array of pack results; npm 12 prints an object keyed
	// by package name. Accept both.
	const firstPack = Array.isArray(parsed)
		? parsed[0]
		: Object.values(parsed)[0];
	if (!firstPack?.files) {
		throw new Error(`Unexpected npm pack output in ${packageDir}: ${stdout}`);
	}

	return firstPack;
};

export const getBlockedReason = function getBlockedReason(
	packageName: string,
	path: string
): string | null {
	// v3 ships ESM-only: no package publishes CommonJS artifacts anywhere in
	// the tarball — dist/, shims/, or the package root.
	if (path.endsWith('.cjs')) {
		return 'CommonJS artifact in ESM-only package';
	}

	// Most accidental publish bloat in this repo comes from built output.
	if (path.startsWith('dist/')) {
		if (path.endsWith('.d.ts.map')) {
			return 'declaration source map in runtime dist';
		}
		if (path.endsWith('.d.ts')) {
			if (
				packageName === '@c15t/ui' &&
				/^dist\/styles\/v3\/[^/]+\.d\.ts$/u.test(path)
			) {
				return null;
			}
			// svelte-package and nuxt-module-build ship declarations inside
			// dist/ by design (no dist-types/ directory).
			if (packageName === '@c15t/svelte' || packageName === '@c15t/vue') {
				return null;
			}
			return 'declaration file in runtime dist';
		}

		for (const rule of distBlockedPathPatterns) {
			if (rule.pattern.test(path)) {
				return rule.reason;
			}
		}
	}

	if (path.startsWith('dist-types/')) {
		if (path.endsWith('.d.ts.map')) {
			return 'declaration source map in published declarations';
		}
		if (!path.endsWith('.d.ts')) {
			return 'non-declaration file in published declarations';
		}
	}

	// @c15t/ui intentionally publishes src/styles, so guard that surface too.
	if (path.startsWith('src/styles/')) {
		for (const rule of [
			{
				// oxlint-disable-next-line prefer-named-capture-group -- Capture indexes are part of the compatibility matcher contract.
				pattern: /(^|\/)__tests__(\/|$)/u,
				reason: 'test folder in published styles',
			},
			{
				pattern: /\.test\./u,
				reason: 'test file in published styles',
			},
		]) {
			if (rule.pattern.test(path)) {
				return rule.reason;
			}
		}
	}

	return null;
};

const scanStyleEntrypointsContent = function scanStyleEntrypointsContent(
	packageDir: string,
	packageName: string,
	packedFilePaths: Set<string>
): { path: string; size: number; reason: string }[] {
	if (!styleEntrypointPackages.has(packageName)) {
		return [];
	}

	const issues: { path: string; size: number; reason: string }[] = [];

	for (const [path, expectedContent] of Object.entries(rootTw3ProxyContents)) {
		if (!packedFilePaths.has(path)) {
			continue;
		}

		const filePath = join(packageDir, path);
		const content = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
		if (content.trim() !== expectedContent) {
			issues.push({
				path,
				reason: 'Tailwind v3 root proxy must point at the dist entrypoint',
				size: content.length,
			});
		}
	}

	for (const path of ['dist/styles.tw3.css', 'dist/iab/styles.tw3.css']) {
		if (!packedFilePaths.has(path)) {
			continue;
		}

		const filePath = join(packageDir, path);
		const content = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
		if (/^\s*@import\b/mu.test(content)) {
			issues.push({
				path,
				reason: 'Tailwind v3 dist CSS must inline rules, not nested imports',
				size: content.length,
			});
		}
		if (!content.includes('c15t-ui-')) {
			issues.push({
				path,
				reason: 'Tailwind v3 dist CSS must contain generated c15t UI rules',
				size: content.length,
			});
		}
	}

	return issues;
};

const scanUiV3StyleArtifacts = function scanUiV3StyleArtifacts(
	packageDir: string,
	packageName: string,
	packedFilePaths: Set<string>
): { path: string; size: number; reason: string }[] {
	if (packageName !== '@c15t/ui') {
		return [];
	}

	const sourceDir = join(packageDir, 'src/styles/v3');
	const styleNames = readdirSync(sourceDir)
		.filter((file) => file.endsWith('.module.css'))
		.map((file) => file.replace('.module.css', ''))
		.sort();
	const issues: { path: string; size: number; reason: string }[] = [];

	for (const name of styleNames) {
		for (const extension of ['css', 'js', 'd.ts']) {
			const path = `dist/styles/v3/${name}.${extension}`;
			if (!packedFilePaths.has(path)) {
				issues.push({
					path,
					reason: 'required v3 style artifact missing',
					size: 0,
				});
			}
		}

		for (const stalePath of [
			`dist/styles/v3/${name}_module.css`,
			`dist/styles/v3/${name}.module.css`,
			`dist/styles/v3/${name}.module.js`,
			`dist/styles/v3/${name}.module.cjs`,
			`dist/styles/v3/${name}.cjs`,
		]) {
			if (packedFilePaths.has(stalePath)) {
				issues.push({
					path: stalePath,
					reason: 'stale v3 rslib artifact must not be published',
					size: 0,
				});
			}
		}

		const cssPath = `dist/styles/v3/${name}.css`;
		if (packedFilePaths.has(cssPath)) {
			const filePath = join(packageDir, cssPath);
			const content = existsSync(filePath)
				? readFileSync(filePath, 'utf8')
				: '';
			if (/^\s*@import\s+["']\.\/animations\//mu.test(content)) {
				issues.push({
					path: cssPath,
					reason: 'v3 CSS must inline local animation imports',
					size: content.length,
				});
			}
			if (!content.includes('c15t-ui-')) {
				issues.push({
					path: cssPath,
					reason: 'v3 CSS must contain generated c15t UI class names',
					size: content.length,
				});
			}
		}

		const jsPath = `dist/styles/v3/${name}.js`;
		if (packedFilePaths.has(jsPath)) {
			const filePath = join(packageDir, jsPath);
			const content = existsSync(filePath)
				? readFileSync(filePath, 'utf8')
				: '';
			if (!content.includes(`./${name}.css`)) {
				issues.push({
					path: jsPath,
					reason: 'v3 ESM class map must import its CSS side effect',
					size: content.length,
				});
			}
		}

		const declarationPath = `dist/styles/v3/${name}.d.ts`;
		if (packedFilePaths.has(declarationPath)) {
			const filePath = join(packageDir, declarationPath);
			const content = existsSync(filePath)
				? readFileSync(filePath, 'utf8')
				: '';
			if (!content.includes('export default styles')) {
				issues.push({
					path: declarationPath,
					reason:
						'v3 style declaration must describe the default class map export',
					size: content.length,
				});
			}
		}
	}

	return issues;
};

const main = function main(): void {
	const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => join(PACKAGES_DIR, entry.name))
		.filter((packageDir) => existsSync(join(packageDir, 'package.json')));

	const offenders: {
		packageName: string;
		version: string;
		files: { path: string; size: number; reason: string }[];
	}[] = [];

	let checkedPackages = 0;

	for (const packageDir of packageDirs) {
		const manifest = readManifest(packageDir);
		if (manifest.private || !manifest.name) {
			continue;
		}

		const packed = runPack(packageDir);
		checkedPackages += 1;

		const blockedFiles = packed.files
			.map((file) => {
				const reason = getBlockedReason(packed.name, file.path);
				if (!reason) {
					return null;
				}
				return { ...file, reason };
			})
			.filter((file) => file !== null);

		const requiredFiles = requiredPackedFilesByPackage[packed.name] ?? [];
		const packedFilePaths = new Set(packed.files.map((file) => file.path));
		for (const path of requiredFiles) {
			if (!packedFilePaths.has(path)) {
				blockedFiles.push({
					path,
					reason: 'required published file missing',
					size: 0,
				});
			}
		}
		blockedFiles.push(...scanPackedManifestTargets(manifest, packedFilePaths));
		blockedFiles.push(
			...scanStyleEntrypointsContent(packageDir, packed.name, packedFilePaths)
		);
		blockedFiles.push(
			...scanUiV3StyleArtifacts(packageDir, packed.name, packedFilePaths)
		);

		if (blockedFiles.length > 0) {
			offenders.push({
				files: blockedFiles,
				packageName: packed.name,
				version: packed.version,
			});
		}
	}

	if (offenders.length === 0) {
		console.log(
			`Publish artifact guard passed. Checked ${checkedPackages} packages.`
		);
		process.exit(0);
	}

	console.error('Publish artifact guard failed.');
	for (const offender of offenders) {
		console.error(`\n- ${offender.packageName}@${offender.version}`);
		for (const file of offender.files) {
			console.error(`  - ${file.path} (${file.size} bytes) [${file.reason}]`);
		}
	}

	process.exit(1);
};

if (import.meta.main) {
	main();
}
