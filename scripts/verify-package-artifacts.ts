#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type PackageManifest = {
	name?: string;
	main?: string;
	module?: string;
	types?: string;
	bin?: string | Record<string, string>;
	exports?: unknown;
};

type ManifestTarget = {
	source: string;
	target: string;
};

function readManifest(packageDir: string): PackageManifest {
	return JSON.parse(
		readFileSync(join(packageDir, 'package.json'), 'utf8')
	) as PackageManifest;
}

function normalizePackagePath(target: string): string | null {
	if (!(target.startsWith('./') || target.startsWith('../'))) {
		return null;
	}

	return target.replace(/^\.\//, '').replaceAll('\\', '/');
}

function collectExportTargets(
	value: unknown,
	targets: ManifestTarget[],
	source: string
) {
	if (typeof value === 'string') {
		const normalized = normalizePackagePath(value);
		if (normalized) {
			targets.push({ source, target: normalized });
		}
		return;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			collectExportTargets(item, targets, source);
		}
		return;
	}

	if (value && typeof value === 'object') {
		for (const [key, item] of Object.entries(value)) {
			collectExportTargets(item, targets, `${source}[${JSON.stringify(key)}]`);
		}
	}
}

function collectManifestTargets(manifest: PackageManifest): ManifestTarget[] {
	const targets: ManifestTarget[] = [];

	for (const key of ['main', 'module', 'types'] as const) {
		const value = manifest[key];
		if (typeof value !== 'string') {
			continue;
		}

		const normalized = normalizePackagePath(value);
		if (normalized) {
			targets.push({ source: key, target: normalized });
		}
	}

	if (typeof manifest.bin === 'string') {
		const normalized = normalizePackagePath(manifest.bin);
		if (normalized) {
			targets.push({ source: 'bin', target: normalized });
		}
	} else if (manifest.bin && typeof manifest.bin === 'object') {
		for (const [name, value] of Object.entries(manifest.bin)) {
			const normalized = normalizePackagePath(value);
			if (normalized) {
				targets.push({ source: `bin.${name}`, target: normalized });
			}
		}
	}

	collectExportTargets(manifest.exports, targets, 'exports');

	return targets;
}

function wildcardToRegExp(pattern: string): RegExp {
	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`^${escaped.replaceAll('*', '.+')}$`);
}

function collectPackageFiles(dir: string, prefix = ''): string[] {
	const result: string[] = [];

	for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
		if (
			entry.isDirectory() &&
			(entry.name === 'node_modules' ||
				entry.name === '.turbo' ||
				entry.name === '.git')
		) {
			continue;
		}

		const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			result.push(...collectPackageFiles(dir, relativePath));
		} else if (entry.isFile()) {
			result.push(relativePath);
		}
	}

	return result;
}

function getMissingTargets(
	packageDir: string,
	targets: ManifestTarget[]
): ManifestTarget[] {
	const packageFiles = collectPackageFiles(packageDir);

	return targets.filter(({ target }) => {
		if (target.includes('*')) {
			const pattern = wildcardToRegExp(target);
			return !packageFiles.some((filePath) => pattern.test(filePath));
		}

		return !existsSync(join(packageDir, target));
	});
}

const packageDir = process.cwd();
const manifest = readManifest(packageDir);
const targets = collectManifestTargets(manifest);
const missingTargets = getMissingTargets(packageDir, targets);

if (missingTargets.length === 0) {
	console.log(
		`Package artifacts verified for ${manifest.name ?? packageDir}. Checked ${targets.length} manifest targets.`
	);
	process.exit(0);
}

console.error(
	`Package artifact verification failed for ${manifest.name ?? packageDir}.`
);
console.error('Run `bun run build` before packing or publishing this package.');
console.error('\nMissing manifest targets:');
for (const { source, target } of missingTargets) {
	console.error(`- ${source}: ${target}`);
}

process.exit(1);
