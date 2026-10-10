import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { intersects, minVersion, subset, validRange } from 'semver';

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
 * such as `^3 || ^4` or `>=2 <4`, or isn't a semver range. A catalog, a
 * `link:`, `file:` or git specifier, or a dist-tag can name any version,
 * whatever digits it holds.
 */
const declaredMajorOf = function declaredMajorOf(
	specifier: string
): number | null {
	const range = validRange(specifier.replace(RANGE_PREFIX, ''));
	if (range === null) {
		return null;
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

/** Whether a semver specifier allows some version with this major. */
const admitsMajor = function admitsMajor(
	specifier: string,
	major: number
): boolean {
	const range = validRange(specifier.replace(RANGE_PREFIX, ''));
	return (
		range !== null &&
		intersects(range, `>=${major}.0.0-0 <${major + 1}.0.0`, {
			includePrerelease: true,
		})
	);
};

/** The major version of an installed package, or null when it isn't installed. */
const installedMajor = async function installedMajor(
	projectRoot: string,
	name: string
): Promise<number | null> {
	try {
		const installed = JSON.parse(
			await readFile(
				join(projectRoot, 'node_modules', name, 'package.json'),
				'utf-8'
			)
		) as { version?: string };
		return majorOf(installed.version);
	} catch {
		return null;
	}
};

/**
 * Whether a dependency may be below this major: its semver range allows a
 * version below it, such as `^2.3.0` or `^2 || ^3` below 3. For a specifier
 * that isn't a range, such as `catalog:`, the installed version decides, and
 * with nothing installed it may be.
 */
export const mayBeBelowMajor = async function mayBeBelowMajor(
	projectRoot: string,
	name: string,
	specifier: string,
	major: number
): Promise<boolean> {
	const range = validRange(specifier.replace(RANGE_PREFIX, ''));
	if (range !== null) {
		return intersects(range, `<${major}.0.0-0`, { includePrerelease: true });
	}
	const installed = await installedMajor(projectRoot, name);
	return installed === null || installed < major;
};

/**
 * Whether any dependency group declares Tailwind CSS 3, so that
 * `devDependencies` can't hide a peer range from `dependenciesOf`. A peer or
 * optional range speaks for the apps that install the package, so one that
 * allows 3, such as `^3 || ^4`, counts even when the package builds with 4.
 * A `dependencies` or `devDependencies` range counts only when 3 is the one
 * major it allows.
 */
export const declaresTailwind3 = function declaresTailwind3(
	manifest: PackageJson | null
): boolean {
	const consumer = [
		manifest?.peerDependencies?.tailwindcss,
		manifest?.optionalDependencies?.tailwindcss,
	];
	const own = [
		manifest?.dependencies?.tailwindcss,
		manifest?.devDependencies?.tailwindcss,
	];
	return (
		consumer.some(
			(specifier) => specifier !== undefined && admitsMajor(specifier, 3)
		) ||
		own.some(
			(specifier) => specifier !== undefined && declaredMajorOf(specifier) === 3
		)
	);
};

/**
 * The Tailwind CSS major version. A specifier without a single major, such
 * as `latest`, `workspace:*`, `catalog:`, a git URL or `^3 || ^4`, falls back
 * to the installed package.
 */
export const tailwindMajor = async function tailwindMajor(
	projectRoot: string,
	specifier: string
): Promise<number | null> {
	return (
		declaredMajorOf(specifier) ??
		(await installedMajor(projectRoot, 'tailwindcss'))
	);
};
