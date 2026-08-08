#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PackageManifest } from './manifest-utils';
import {
	collectManifestTargets,
	readManifest,
	wildcardToRegExp,
} from './manifest-utils';

type PackedFile = {
	path: string;
	size: number;
};

type PackResult = {
	name: string;
	version: string;
	files: PackedFile[];
};

const ROOT = process.cwd();
const PACKAGES_DIR = join(ROOT, 'packages');

const distBlockedPathPatterns: Array<{ reason: string; pattern: RegExp }> = [
	{ reason: 'test folder', pattern: /(^|\/)__tests__(\/|$)/ },
	{ reason: 'snapshot folder', pattern: /(^|\/)__snapshots__(\/|$)/ },
	{ reason: 'screenshot folder', pattern: /(^|\/)__screenshots__(\/|$)/ },
	{ reason: 'test file', pattern: /\.test\./ },
	{ reason: 'spec file', pattern: /\.spec\./ },
	{ reason: 'e2e file', pattern: /\.e2e\./ },
	{
		reason: 'msw mock service worker',
		pattern: /(^|\/)mockServiceWorker\.js$/,
	},
	{ reason: 'playwright screenshot output', pattern: /(^|\/)static\/image\// },
	{ reason: 'rsdoctor report artifact', pattern: /(^|\/)rsdoctor-data\.json$/ },
];

const requiredPackedFilesByPackage: Record<string, string[]> = {
	c15t: ['AGENTS.md', 'docs/README.md'],
	'@c15t/core': ['AGENTS.md', 'docs/README.md'],
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
	'@c15t/backend': ['AGENTS.md', 'docs/README.md'],
	'@c15t/scripts': ['AGENTS.md', 'docs/README.md'],
	'@c15t/cli': ['AGENTS.md', 'docs/README.md'],
};

const styleEntrypointPackages = new Set([
	'@c15t/ui',
	'@c15t/react',
	'@c15t/nextjs',
]);

const rootTw3ProxyContents: Record<string, string> = {
	'styles.tw3.css': '@import "./dist/styles.tw3.css";',
	'iab/styles.tw3.css': '@import "../dist/iab/styles.tw3.css";',
};

function scanPackedManifestTargets(
	manifest: PackageManifest,
	packedFilePaths: Set<string>
): Array<{ path: string; size: number; reason: string }> {
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
			size: 0,
			reason: `manifest target missing from packed files (${source})`,
		}));
}

function runPack(packageDir: string): PackResult {
	const proc = Bun.spawnSync(['npm', 'pack', '--json', '--dry-run'], {
		cwd: packageDir,
		stdout: 'pipe',
		stderr: 'pipe',
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
			: stdout;
	const parsed = JSON.parse(jsonPayload) as PackResult[];
	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new Error(`Unexpected npm pack output in ${packageDir}: ${stdout}`);
	}

	const [firstPack] = parsed;
	if (!firstPack) {
		throw new Error(`Unexpected npm pack output in ${packageDir}: ${stdout}`);
	}

	return firstPack;
}

function getBlockedReason(packageName: string, path: string): string | null {
	// Most accidental publish bloat in this repo comes from built output.
	if (path.startsWith('dist/')) {
		if (path.endsWith('.d.ts.map')) {
			return 'declaration source map in runtime dist';
		}
		if (path.endsWith('.d.ts')) {
			if (
				packageName === '@c15t/ui' &&
				/^dist\/styles\/v3\/[^/]+\.d\.ts$/.test(path)
			) {
				return null;
			}
			if (packageName === '@c15t/svelte') {
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
				reason: 'test folder in published styles',
				pattern: /(^|\/)__tests__(\/|$)/,
			},
			{
				reason: 'test file in published styles',
				pattern: /\.test\./,
			},
		]) {
			if (rule.pattern.test(path)) {
				return rule.reason;
			}
		}
	}

	return null;
}

function scanStyleEntrypointsContent(
	packageDir: string,
	packageName: string,
	packedFilePaths: Set<string>
): Array<{ path: string; size: number; reason: string }> {
	if (!styleEntrypointPackages.has(packageName)) {
		return [];
	}

	const issues: Array<{ path: string; size: number; reason: string }> = [];

	for (const [path, expectedContent] of Object.entries(rootTw3ProxyContents)) {
		if (!packedFilePaths.has(path)) {
			continue;
		}

		const filePath = join(packageDir, path);
		const content = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
		if (content.trim() !== expectedContent) {
			issues.push({
				path,
				size: content.length,
				reason: 'Tailwind v3 root proxy must point at the dist entrypoint',
			});
		}
	}

	for (const path of ['dist/styles.tw3.css', 'dist/iab/styles.tw3.css']) {
		if (!packedFilePaths.has(path)) {
			continue;
		}

		const filePath = join(packageDir, path);
		const content = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
		if (/^\s*@import\b/m.test(content)) {
			issues.push({
				path,
				size: content.length,
				reason: 'Tailwind v3 dist CSS must inline rules, not nested imports',
			});
		}
		if (!content.includes('c15t-ui-')) {
			issues.push({
				path,
				size: content.length,
				reason: 'Tailwind v3 dist CSS must contain generated c15t UI rules',
			});
		}
	}

	return issues;
}

function scanUiV3StyleArtifacts(
	packageDir: string,
	packageName: string,
	packedFilePaths: Set<string>
): Array<{ path: string; size: number; reason: string }> {
	if (packageName !== '@c15t/ui') {
		return [];
	}

	const sourceDir = join(packageDir, 'src/styles/v3');
	const styleNames = readdirSync(sourceDir)
		.filter((file) => file.endsWith('.module.css'))
		.map((file) => file.replace('.module.css', ''))
		.sort();
	const issues: Array<{ path: string; size: number; reason: string }> = [];

	for (const name of styleNames) {
		for (const extension of ['css', 'js', 'cjs', 'd.ts']) {
			const path = `dist/styles/v3/${name}.${extension}`;
			if (!packedFilePaths.has(path)) {
				issues.push({
					path,
					size: 0,
					reason: 'required v3 style artifact missing',
				});
			}
		}

		for (const stalePath of [
			`dist/styles/v3/${name}_module.css`,
			`dist/styles/v3/${name}.module.css`,
			`dist/styles/v3/${name}.module.js`,
			`dist/styles/v3/${name}.module.cjs`,
		]) {
			if (packedFilePaths.has(stalePath)) {
				issues.push({
					path: stalePath,
					size: 0,
					reason: 'stale v3 rslib artifact must not be published',
				});
			}
		}

		const cssPath = `dist/styles/v3/${name}.css`;
		if (packedFilePaths.has(cssPath)) {
			const filePath = join(packageDir, cssPath);
			const content = existsSync(filePath)
				? readFileSync(filePath, 'utf8')
				: '';
			if (/^\s*@import\s+["']\.\/animations\//m.test(content)) {
				issues.push({
					path: cssPath,
					size: content.length,
					reason: 'v3 CSS must inline local animation imports',
				});
			}
			if (!content.includes('c15t-ui-')) {
				issues.push({
					path: cssPath,
					size: content.length,
					reason: 'v3 CSS must contain generated c15t UI class names',
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
					size: content.length,
					reason: 'v3 ESM class map must import its CSS side effect',
				});
			}
		}

		const cjsPath = `dist/styles/v3/${name}.cjs`;
		if (packedFilePaths.has(cjsPath)) {
			const filePath = join(packageDir, cjsPath);
			const content = existsSync(filePath)
				? readFileSync(filePath, 'utf8')
				: '';
			if (!content.includes(`./${name}.css`)) {
				issues.push({
					path: cjsPath,
					size: content.length,
					reason: 'v3 CJS class map must require its CSS side effect',
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
					size: content.length,
					reason:
						'v3 style declaration must describe the default class map export',
				});
			}
		}
	}

	return issues;
}

const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => join(PACKAGES_DIR, entry.name))
	.filter((packageDir) => existsSync(join(packageDir, 'package.json')));

const offenders: Array<{
	packageName: string;
	version: string;
	files: Array<{ path: string; size: number; reason: string }>;
}> = [];

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
			if (!reason) return null;
			return { ...file, reason };
		})
		.filter((file) => file !== null);

	const requiredFiles = requiredPackedFilesByPackage[packed.name] ?? [];
	const packedFilePaths = new Set(packed.files.map((file) => file.path));
	for (const path of requiredFiles) {
		if (!packedFilePaths.has(path)) {
			blockedFiles.push({
				path,
				size: 0,
				reason: 'required published file missing',
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
			packageName: packed.name,
			version: packed.version,
			files: blockedFiles,
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
