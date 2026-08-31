import { readFileSync } from 'node:fs';
import { join, posix as pathPosix } from 'node:path';

export interface PackageManifest {
	name?: string;
	private?: boolean;
	main?: string;
	module?: string;
	types?: string;
	bin?: string | Record<string, string>;
	exports?: unknown;
}

export interface ManifestTarget {
	source: string;
	target: string;
}

const MAX_WILDCARD_PATTERN_LENGTH = 256;

export const readManifest = function readManifest(
	packageDir: string
): PackageManifest {
	return JSON.parse(
		readFileSync(join(packageDir, 'package.json'), 'utf8')
	) as PackageManifest;
};

export const normalizePackagePath = function normalizePackagePath(
	target: string
): string | null {
	const slashNormalized = target.replaceAll('\\', '/');

	if (
		slashNormalized.startsWith('/') ||
		/^[A-Za-z]:\//u.test(slashNormalized) ||
		slashNormalized.includes('://')
	) {
		return null;
	}

	const normalized = pathPosix.normalize(slashNormalized.replace(/^\.\//u, ''));

	if (
		normalized === '.' ||
		normalized === '..' ||
		normalized.startsWith('../') ||
		normalized.includes('/../')
	) {
		return null;
	}

	return normalized;
};

export const collectExportTargets = function collectExportTargets(
	value: unknown,
	targets: ManifestTarget[],
	source: string
): void {
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
};

export const collectManifestTargets = function collectManifestTargets(
	manifest: PackageManifest
): ManifestTarget[] {
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
};

export const wildcardToRegExp = function wildcardToRegExp(
	pattern: string
): RegExp {
	if (pattern.length > MAX_WILDCARD_PATTERN_LENGTH) {
		throw new Error(
			`Manifest wildcard target is too long (${pattern.length} characters; max ${MAX_WILDCARD_PATTERN_LENGTH}).`
		);
	}

	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/gu, '\\$&');
	return new RegExp(`^${escaped.replaceAll('*', '.+')}$`, 'u');
};
