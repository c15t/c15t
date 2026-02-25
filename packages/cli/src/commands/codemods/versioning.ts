import { join } from 'node:path';

type ParsedVersion = {
	major: number;
	minor: number;
	patch: number;
	preRelease: string[];
};

type DependencyMap = Record<string, string>;

type PackageJsonLike = {
	dependencies?: DependencyMap;
	devDependencies?: DependencyMap;
	peerDependencies?: DependencyMap;
	optionalDependencies?: DependencyMap;
};

const C15T_PACKAGE_PREFIX = '@c15t/';

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

function parseVersion(raw: string): ParsedVersion | null {
	const match = raw
		.trim()
		.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);

	if (!match) {
		return null;
	}

	const [, majorPart, minorPart, patchPart, preReleasePart] = match;
	if (!majorPart || !minorPart || !patchPart) {
		return null;
	}

	const major = Number.parseInt(majorPart, 10);
	const minor = Number.parseInt(minorPart, 10);
	const patch = Number.parseInt(patchPart, 10);
	const preRelease = preReleasePart ? preReleasePart.split('.') : [];

	return { major, minor, patch, preRelease };
}

function extractVersionFromSpecifier(specifier: string): string | null {
	const match = specifier.match(/(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/);
	if (!match) {
		return null;
	}

	const [, version] = match;
	return version ?? null;
}

function isNumericSegment(value: string): boolean {
	return /^\d+$/.test(value);
}

function comparePreRelease(a: string[], b: string[]): number {
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
}

function compareVersions(a: string, b: string): number | null {
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
}

function satisfiesComparator(version: string, comparator: string): boolean {
	const match = comparator
		.trim()
		.match(/^(<=|>=|<|>|=)?\s*v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/);

	if (!match) {
		return false;
	}

	const [, operatorRaw, target] = match;
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
}

/**
 * Evaluates simple semver comparator ranges.
 *
 * Supports comparator sets such as `>=1.0.0 <2.0.0`.
 */
export function satisfiesSimpleRange(version: string, range: string): boolean {
	const comparators = range.trim().split(/\s+/).filter(Boolean);

	if (comparators.length === 0) {
		return true;
	}

	return comparators.every((comparator) =>
		satisfiesComparator(version, comparator)
	);
}

/**
 * Determines whether a codemod should be shown for a detected project version.
 */
export function isCodemodApplicableForVersion(
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
}

/**
 * Best-effort c15t version detection from a package.json object.
 *
 * Returns the lowest detected c15t version to avoid missing required upgrades
 * in mixed-version dependency graphs.
 */
export function detectInstalledC15tVersionFromPackageJson(
	manifest: PackageJsonLike
): string | null {
	const dependencyGroups: Array<DependencyMap | undefined> = [
		manifest.dependencies,
		manifest.devDependencies,
		manifest.peerDependencies,
		manifest.optionalDependencies,
	];

	const versions: string[] = [];
	for (const dependencies of dependencyGroups) {
		if (!dependencies) {
			continue;
		}

		for (const [packageName, specifier] of Object.entries(dependencies)) {
			if (
				packageName !== 'c15t' &&
				!packageName.startsWith(C15T_PACKAGE_PREFIX)
			) {
				continue;
			}

			const extracted = extractVersionFromSpecifier(specifier);
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
}

/**
 * Best-effort c15t version detection from `<projectRoot>/package.json`.
 */
export async function detectInstalledC15tVersion(
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
		return detectInstalledC15tVersionFromPackageJson(parsed);
	} catch {
		return null;
	}
}
