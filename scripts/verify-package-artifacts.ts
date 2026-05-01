#!/usr/bin/env bun

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ManifestTarget } from './manifest-utils';
import {
	collectManifestTargets,
	readManifest,
	wildcardToRegExp,
} from './manifest-utils';

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
