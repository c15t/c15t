import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { minVersion, subset, validRange } from 'semver';

/** The dependency fields of an app's `package.json` the codemods read. */
export interface PackageJson {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
}

/** The app's `package.json`, or null when it is missing or not JSON. */
export const readPackageJson = async function readPackageJson(
	projectRoot: string
): Promise<PackageJson | null> {
	try {
		return JSON.parse(
			await readFile(join(projectRoot, 'package.json'), 'utf-8')
		) as PackageJson;
	} catch {
		return null;
	}
};

/**
 * Every dependency group in one map. A shared package may declare Tailwind
 * CSS or c15t only as a peer or optional dependency. Where a package appears
 * in several groups, `dependencies` wins, then `devDependencies`, then
 * `peerDependencies`.
 */
export const dependenciesOf = function dependenciesOf(
	manifest: PackageJson | null
): Record<string, string> {
	return {
		...manifest?.optionalDependencies,
		...manifest?.peerDependencies,
		...manifest?.devDependencies,
		...manifest?.dependencies,
	};
};

/** The first number in a version specifier, or null for `latest` and the like. */
export const majorOf = function majorOf(
	specifier: string | undefined
): number | null {
	const major = /(?<major>\d+)/u.exec(specifier ?? '')?.groups?.major;
	return major ? Number(major) : null;
};

/**
 * Whether the app should import c15t through the umbrella `c15t` entries:
 * it lists `c15t` 3 or a specifier without a version, or lists neither
 * scoped framework package. An app that lists `@c15t/react` or
 * `@c15t/nextjs` without `c15t` 3 keeps the scoped entries.
 */
export const usesUmbrella = function usesUmbrella(
	dependencies: Record<string, string>
): boolean {
	const umbrella = dependencies.c15t;
	if (umbrella !== undefined) {
		const major = majorOf(umbrella);
		if (major === null || major >= 3) {
			return true;
		}
	}
	return (
		dependencies['@c15t/nextjs'] === undefined &&
		dependencies['@c15t/react'] === undefined
	);
};

/** `workspace:` and `npm:<name>@` prefixes in front of a semver range. */
const RANGE_PREFIX = /^(?:workspace:|npm:(?:@[^/]+\/)?[^@]+@)/u;

/**
 * The one major version a specifier allows, or null when it allows several,
 * such as `^3 || ^4` or `>=2 <4`, or names no version. A specifier that isn't
 * a semver range, such as a git URL, falls back to its first number.
 */
const declaredMajorOf = function declaredMajorOf(
	specifier: string
): number | null {
	const range = validRange(specifier.replace(RANGE_PREFIX, ''));
	if (range === null) {
		return majorOf(specifier);
	}
	const major = minVersion(range)?.major;
	if (major === undefined) {
		return null;
	}
	return subset(range, `>=${major}.0.0-0 <${major + 1}.0.0`, {
		includePrerelease: true,
	})
		? major
		: null;
};

/**
 * The Tailwind CSS major version. A specifier without a single major, such
 * as `latest`, `workspace:*`, `catalog:` or `^3 || ^4`, falls back to the
 * installed package.
 */
export const tailwindMajor = async function tailwindMajor(
	projectRoot: string,
	specifier: string
): Promise<number | null> {
	const declared = declaredMajorOf(specifier);
	if (declared !== null) {
		return declared;
	}
	try {
		const installed = JSON.parse(
			await readFile(
				join(projectRoot, 'node_modules', 'tailwindcss', 'package.json'),
				'utf-8'
			)
		) as { version?: string };
		return majorOf(installed.version);
	} catch {
		return null;
	}
};
