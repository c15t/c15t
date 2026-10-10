import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
	intersects,
	minVersion,
	parse,
	subset,
	valid,
	validRange,
} from 'semver';

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

/** `workspace:` and `npm:<name>@` prefixes in front of a semver range. */
const RANGE_PREFIX = /^(?:workspace:|npm:(?:@[^/]+\/)?[^@]+@)/u;

/**
 * The semver range a specifier names, or null when it isn't one. A catalog,
 * a `link:`, `file:` or git specifier, or a dist-tag can name any version,
 * whatever digits it holds.
 */
export const rangeOf = function rangeOf(specifier: string): string | null {
	return validRange(specifier.replace(RANGE_PREFIX, ''));
};

/**
 * The one major version a specifier allows, or null when it allows several,
 * such as `^3 || ^4` or `>=2 <4`, or isn't a semver range. A catalog, a
 * `link:`, `file:` or git specifier, or a dist-tag can name any version,
 * whatever digits it holds.
 */
const declaredMajorOf = function declaredMajorOf(
	specifier: string
): number | null {
	const range = rangeOf(specifier);
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
	const range = rangeOf(specifier);
	return (
		range !== null &&
		intersects(range, `>=${major}.0.0-0 <${major + 1}.0.0`, {
			includePrerelease: true,
		})
	);
};

/** The version of an installed package, or null when it isn't installed. */
export const installedVersion = async function installedVersion(
	projectRoot: string,
	name: string
): Promise<string | null> {
	try {
		const { version } = JSON.parse(
			await readFile(
				join(projectRoot, 'node_modules', name, 'package.json'),
				'utf-8'
			)
		) as { version?: unknown };
		return typeof version === 'string' && valid(version) !== null
			? version
			: null;
	} catch {
		return null;
	}
};

/** The major version of an installed package, or null when it isn't installed. */
const installedMajor = async function installedMajor(
	projectRoot: string,
	name: string
): Promise<number | null> {
	const version = await installedVersion(projectRoot, name);
	return version === null ? null : (parse(version)?.major ?? null);
};

/**
 * Whether a dependency is at least this major. A semver range decides when
 * every version it allows falls on one side, such as `^3.0.0` or `^2.3.0`
 * for 3. Otherwise, as for `^2 || ^3`, `workspace:*` or `catalog:`, the
 * installed version decides, and with nothing installed the answer is null.
 */
export const isAtLeastMajor = async function isAtLeastMajor(
	projectRoot: string,
	name: string,
	specifier: string,
	atLeast: number
): Promise<boolean | null> {
	const range = rangeOf(specifier);
	const options = { includePrerelease: true };
	if (range !== null && !intersects(range, `<${atLeast}.0.0-0`, options)) {
		return true;
	}
	if (range !== null && !intersects(range, `>=${atLeast}.0.0-0`, options)) {
		return false;
	}
	const installed = await installedMajor(projectRoot, name);
	return installed === null ? null : installed >= atLeast;
};

/**
 * Whether the app should import c15t through the umbrella `c15t` entries:
 * it lists `c15t` 3, or lists neither scoped framework package. An app that
 * lists `@c15t/react` or `@c15t/nextjs` keeps the scoped entries unless
 * `c15t` is known to be 3, by its range or, for a specifier such as
 * `catalog:`, by the installed package.
 */
export const usesUmbrella = async function usesUmbrella(
	projectRoot: string,
	dependencies: Record<string, string>
): Promise<boolean> {
	const umbrella = dependencies.c15t;
	if (
		umbrella !== undefined &&
		(await isAtLeastMajor(projectRoot, 'c15t', umbrella, 3))
	) {
		return true;
	}
	return (
		dependencies['@c15t/nextjs'] === undefined &&
		dependencies['@c15t/react'] === undefined
	);
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
