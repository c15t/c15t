#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type PackedFile = {
	path: string;
	size: number;
};

type PackResult = {
	name: string;
	version: string;
	files: PackedFile[];
};

type PackageManifest = {
	name?: string;
	private?: boolean;
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

function readManifest(packageDir: string): PackageManifest {
	return JSON.parse(
		readFileSync(join(packageDir, 'package.json'), 'utf8')
	) as PackageManifest;
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
	const parsed = JSON.parse(stdout) as PackResult[];
	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new Error(`Unexpected npm pack output in ${packageDir}: ${stdout}`);
	}

	const [firstPack] = parsed;
	if (!firstPack) {
		throw new Error(`Unexpected npm pack output in ${packageDir}: ${stdout}`);
	}

	return firstPack;
}

function getBlockedReason(path: string): string | null {
	// Most accidental publish bloat in this repo comes from built output.
	if (path.startsWith('dist/')) {
		if (path.endsWith('.d.ts.map')) {
			return 'declaration source map in runtime dist';
		}
		if (path.endsWith('.d.ts')) {
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
			const reason = getBlockedReason(file.path);
			if (!reason) return null;
			return { ...file, reason };
		})
		.filter((file) => file !== null);

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
