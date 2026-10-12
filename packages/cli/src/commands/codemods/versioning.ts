import { join } from 'node:path';

import { installedVersion, rangeOf } from './manifest';

interface ParsedVersion {
	major: number;
	minor: number;
	patch: number;
	preRelease: string[];
}

type DependencyMap = Record<string, string>;

interface PackageJsonLike {
	dependencies?: DependencyMap;
	devDependencies?: DependencyMap;
	peerDependencies?: DependencyMap;
	optionalDependencies?: DependencyMap;
}

const MIGRATED_PACKAGES = new Set([
	'c15t',
	'@c15t/core',
	'@c15t/react',
	'@c15t/nextjs',
]);

/**
 * Codemod version metadata used for filtering by installed project version.
 */
export interface CodemodVersionMetadata {
	/**
	 * Version range the project must satisfy for the codemod to be considered.
	 *
	 * @example "<2.0.0"
	 * @example ">=1.0.0 <2.0.0"
	 */
	fromRange?: string;
	/**
	 * Target range this codemod migrates toward.
	 * When the current project version already satisfies this range,
	 * the codemod is treated as not applicable.
	 *
	 * @example ">=2.0.0"
	 */
	toRange?: string;
}

const parseVersion = function parseVersion(raw: string): ParsedVersion | null {
	const match = raw
		.trim()
		.match(
			/^v?(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:-(?<preRelease>[0-9A-Za-z.-]+))?$/u
		);

	if (!match) {
		return null;
	}

	const majorPart = match.groups?.major;
	const minorPart = match.groups?.minor;
	const patchPart = match.groups?.patch;
	const preReleasePart = match.groups?.preRelease;
	if (!majorPart || !minorPart || !patchPart) {
		return null;
	}

	const major = Number.parseInt(majorPart, 10);
	const minor = Number.parseInt(minorPart, 10);
	const patch = Number.parseInt(patchPart, 10);
	const preRelease = preReleasePart ? preReleasePart.split('.') : [];

	return { major, minor, patch, preRelease };
};

const extractVersionFromSpecifier = function extractVersionFromSpecifier(
	specifier: string
): string | null {
	const match = specifier.match(
		/(?<version>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/u
	);
	if (!match) {
		return null;
	}

	return match.groups?.version ?? null;
};

/**
 * The version a semver specifier names, or null when it names none, as
 * `catalog:`, a `link:`, `file:` or git specifier, a dist-tag or `*` don't.
 */
const declaredVersionOf = function declaredVersionOf(
	specifier: string
): string | null {
	return rangeOf(specifier) === null
		? null
		: extractVersionFromSpecifier(specifier);
};

const isNumericSegment = function isNumericSegment(value: string): boolean {
	return /^\d+$/u.test(value);
};

const comparePreRelease = function comparePreRelease(
	a: string[],
	b: string[]
): number {
	// No pre-release > any pre-release
	if (a.length === 0 && b.length === 0) {
		return 0;
	}
	if (a.length === 0) {
		return 1;
	}
	if (b.length === 0) {
		return -1;
	}

	const maxLength = Math.max(a.length, b.length);
	for (let index = 0; index < maxLength; index += 1) {
		const aValue = a[index];
		const bValue = b[index];

		if (aValue === undefined) {
			return -1;
		}
		if (bValue === undefined) {
			return 1;
		}

		const aNumeric = isNumericSegment(aValue);
		const bNumeric = isNumericSegment(bValue);

		if (aNumeric && bNumeric) {
			const aNumber = Number.parseInt(aValue, 10);
			const bNumber = Number.parseInt(bValue, 10);
			if (aNumber !== bNumber) {
				return aNumber > bNumber ? 1 : -1;
			}
			continue;
		}

		if (aNumeric && !bNumeric) {
			return -1;
		}
		if (!aNumeric && bNumeric) {
			return 1;
		}

		if (aValue !== bValue) {
			return aValue > bValue ? 1 : -1;
		}
	}

	return 0;
};

const compareVersions = function compareVersions(
	a: string,
	b: string
): number | null {
	const parsedA = parseVersion(a);
	const parsedB = parseVersion(b);

	if (!parsedA || !parsedB) {
		return null;
	}

	if (parsedA.major !== parsedB.major) {
		return parsedA.major > parsedB.major ? 1 : -1;
	}
	if (parsedA.minor !== parsedB.minor) {
		return parsedA.minor > parsedB.minor ? 1 : -1;
	}
	if (parsedA.patch !== parsedB.patch) {
		return parsedA.patch > parsedB.patch ? 1 : -1;
	}

	return comparePreRelease(parsedA.preRelease, parsedB.preRelease);
};

const satisfiesComparator = function satisfiesComparator(
	version: string,
	comparator: string
): boolean {
	const match = comparator
		.trim()
		.match(
			/^(?<operator><=|>=|<|>|=)?\s*v?(?<target>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/u
		);

	if (!match) {
		return false;
	}

	const operatorRaw = match.groups?.operator;
	const target = match.groups?.target;
	if (!target) {
		return false;
	}

	const operator = operatorRaw ?? '=';
	const comparison = compareVersions(version, target);
	if (comparison === null) {
		return false;
	}

	switch (operator) {
		case '<':
			return comparison < 0;
		case '<=':
			return comparison <= 0;
		case '>':
			return comparison > 0;
		case '>=':
			return comparison >= 0;
		default:
			return comparison === 0;
	}
};

/**
 * Evaluates simple semver comparator ranges.
 *
 * Supports comparator sets such as `>=1.0.0 <2.0.0`.
 */
export const satisfiesSimpleRange = function satisfiesSimpleRange(
	version: string,
	range: string
): boolean {
	const comparators = range.trim().split(/\s+/u).filter(Boolean);

	if (comparators.length === 0) {
		return true;
	}

	return comparators.every((comparator) =>
		satisfiesComparator(version, comparator)
	);
};

/**
 * Determines whether a codemod should be shown for a detected project version.
 */
export const isCodemodApplicableForVersion =
	function isCodemodApplicableForVersion(
		version: string | null,
		metadata: CodemodVersionMetadata
	): boolean {
		if (!version) {
			return true;
		}

		if (
			metadata.fromRange &&
			!satisfiesSimpleRange(version, metadata.fromRange)
		) {
			return false;
		}

		if (metadata.toRange && satisfiesSimpleRange(version, metadata.toRange)) {
			return false;
		}

		return true;
	};

/** The dependency groups of a manifest, in the order they are read. */
const dependencyGroupsOf = function dependencyGroupsOf(
	manifest: PackageJsonLike
): (DependencyMap | undefined)[] {
	return [
		manifest.dependencies,
		manifest.devDependencies,
		manifest.peerDependencies,
		manifest.optionalDependencies,
	];
};

/**
 * Best-effort c15t version detection from a package.json object.
 *
 * Returns the lowest declared core/framework version. Independently versioned
 * integrations and tooling do not determine the application API version.
 * A specifier that names no version, such as `catalog:`, a `link:`, `file:`
 * or git specifier, a dist-tag or `*`, whatever digits it holds, takes its
 * version from `installed`.
 *
 * @param manifest - The app's `package.json`.
 * @param installed - Installed versions by package name.
 * @returns The lowest version found, or null when there is none.
 */
export const detectInstalledC15tVersionFromPackageJson =
	function detectInstalledC15tVersionFromPackageJson(
		manifest: PackageJsonLike,
		installed: Readonly<Record<string, string>> = {}
	): string | null {
		const versions: string[] = [];
		for (const dependencies of dependencyGroupsOf(manifest)) {
			if (!dependencies) {
				continue;
			}

			for (const [packageName, specifier] of Object.entries(dependencies)) {
				if (!MIGRATED_PACKAGES.has(packageName)) {
					continue;
				}

				const extracted =
					declaredVersionOf(specifier) ?? installed[packageName];
				if (!extracted) {
					continue;
				}

				if (parseVersion(extracted)) {
					versions.push(extracted);
				}
			}
		}

		if (versions.length === 0) {
			return null;
		}

		const firstVersion = versions.at(0);
		if (!firstVersion) {
			return null;
		}

		let selected = firstVersion;
		for (const current of versions.slice(1)) {
			const comparison = compareVersions(current, selected);
			if (comparison !== null && comparison < 0) {
				selected = current;
			}
		}

		return selected;
	};

/**
 * The installed versions of the c15t packages whose specifier names no
 * version.
 */
const installedVersionsOf = async function installedVersionsOf(
	projectRoot: string,
	manifest: PackageJsonLike
): Promise<Record<string, string>> {
	const names = new Set(
		dependencyGroupsOf(manifest).flatMap((dependencies) =>
			Object.entries(dependencies ?? {})
				.filter(
					([name, specifier]) =>
						MIGRATED_PACKAGES.has(name) && declaredVersionOf(specifier) === null
				)
				.map(([name]) => name)
		)
	);
	const entries = await Promise.all(
		[...names].map(
			async (name) => [name, await installedVersion(projectRoot, name)] as const
		)
	);
	return Object.fromEntries(
		entries.filter(
			(entry): entry is readonly [string, string] => entry[1] !== null
		)
	);
};

/**
 * Best-effort c15t version detection from `<projectRoot>/package.json`,
 * reading the installed version for a specifier that names none.
 */
export const detectInstalledC15tVersion =
	async function detectInstalledC15tVersion(
		projectRoot: string
	): Promise<string | null> {
		const manifestPath = join(projectRoot, 'package.json');

		try {
			let content: string;
			const bunRuntime = (
				globalThis as {
					Bun?: { file: (filePath: string) => { text: () => Promise<string> } };
				}
			).Bun;

			if (bunRuntime) {
				content = await bunRuntime.file(manifestPath).text();
			} else {
				const fs = await import('node:fs/promises');
				content = await fs.readFile(manifestPath, 'utf-8');
			}
			const parsed = JSON.parse(content) as PackageJsonLike;
			return detectInstalledC15tVersionFromPackageJson(
				parsed,
				await installedVersionsOf(projectRoot, parsed)
			);
		} catch {
			return null;
		}
	};
