import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** The dependency fields of an app's `package.json` the codemods read. */
export interface PackageJson {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
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

/** Runtime and development dependencies in one map. */
export const dependenciesOf = function dependenciesOf(
	manifest: PackageJson | null
): Record<string, string> {
	return { ...manifest?.devDependencies, ...manifest?.dependencies };
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

/**
 * The Tailwind CSS major version. A specifier without a version, such as
 * `latest`, `workspace:*` or `catalog:`, falls back to the installed package.
 */
export const tailwindMajor = async function tailwindMajor(
	projectRoot: string,
	specifier: string
): Promise<number | null> {
	const declared = majorOf(specifier);
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
