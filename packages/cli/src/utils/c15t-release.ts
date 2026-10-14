import { c15tReleaseSpecifier } from '../generate/release';
import { packageInfo } from '../package-info';

// The release-line rules live in the generation source, which hosts compile
// without package.json. Re-export them so Node and native installs agree.
export {
	LINKED_C15T_PACKAGES,
	c15tReleaseSpecifier,
	dependencyName,
	isC15tPackage,
	withC15tRelease,
} from '../generate/release';

/** Protocols whose ranges point somewhere other than the registry. */
const LOCAL_RANGE_PREFIXES = ['workspace:', 'link:', 'file:', 'portal:'];

/** One comparator: `>=2`, `<3.1`, `^3.0.0-alpha.1`, `~3`, `3.x`, `*`. */
const COMPARATOR =
	/^(?<operator><=|>=|<|>|=|\^|~)?v?(?<major>\d+|x|\*)(?:\.(?<minor>\d+|x|\*))?(?:\.(?<patch>\d+|x|\*))?(?:-(?<prerelease>[0-9a-z][0-9a-z.-]*))?(?:\+[0-9a-z.-]+)?$/iu;

type Version = readonly [number, number, number];

interface Bound {
	version: Version;
	inclusive: boolean;
}

/** Versions a comparator set admits; a missing bound is unbounded. */
interface Interval {
	lower?: Bound;
	upper?: Bound;
}

interface Comparator {
	interval: Interval;
}

const compareVersions = function compareVersions(a: Version, b: Version) {
	for (let index = 0; index < 3; index += 1) {
		const difference = (a[index] ?? 0) - (b[index] ?? 0);
		if (difference !== 0) {
			return difference;
		}
	}
	return 0;
};

const readPart = function readPart(part: string | undefined) {
	return part === undefined || part === 'x' || part === '*'
		? undefined
		: Number(part);
};

const from = (version: Version, inclusive = true): Bound => ({
	inclusive,
	version,
});

const until = (version: Version, inclusive = false): Bound => ({
	inclusive,
	version,
});

/**
 * The version interval one comparator admits, following npm's desugaring of
 * partial versions, `~` and `^`. Prerelease ordering is ignored: only the
 * release line matters here.
 *
 * @param operator - Comparator operator, if any.
 * @param parts - Major, minor and patch; `undefined` past the pinned ones.
 */
const comparatorInterval = function comparatorInterval(
	operator: string | undefined,
	[major, minor, patch]: [number, number | undefined, number | undefined]
): Interval {
	// How many of major, minor and patch the comparator pins.
	const missing = [minor, patch].indexOf(undefined);
	const pinned = missing === -1 ? 3 : missing + 1;
	const base: Version = [major, minor ?? 0, patch ?? 0];
	const bump = function bump(level: number): Version {
		if (level <= 1) {
			return [major + 1, 0, 0];
		}
		if (level === 2) {
			return [major, (minor ?? 0) + 1, 0];
		}
		return [major, minor ?? 0, (patch ?? 0) + 1];
	};
	switch (operator) {
		case '>=':
			return { lower: from(base) };
		case '>':
			return { lower: pinned === 3 ? from(base, false) : from(bump(pinned)) };
		case '<':
			return { upper: until(base) };
		case '<=':
			return { upper: pinned === 3 ? until(base, true) : until(bump(pinned)) };
		case '~':
			return { lower: from(base), upper: until(bump(Math.min(pinned, 2))) };
		case '^': {
			// The first non-zero part, or the last pinned one, may not change.
			let level = 1;
			if (major === 0 && pinned > 1) {
				level = minor === 0 && pinned === 3 ? 3 : 2;
			}
			return { lower: from(base), upper: until(bump(level)) };
		}
		default:
			return { lower: from(base), upper: until(bump(pinned)) };
	}
};

/** Read one comparator, or `undefined` when it is not a semver comparator. */
const parseComparator = function parseComparator(
	text: string
): Comparator | undefined {
	const groups = COMPARATOR.exec(text)?.groups;
	if (!groups) {
		return undefined;
	}
	const major = readPart(groups.major);
	if (major === undefined) {
		return { interval: {} };
	}
	const minor = readPart(groups.minor);
	const patch = minor === undefined ? undefined : readPart(groups.patch);
	if (groups.prerelease && minor !== undefined && patch !== undefined) {
		// A prerelease sorts below its release, so `3.0.0-alpha.3` admits no
		// stable version, and `<=3.0.0-alpha.3` stops before 3.0.0.
		const base: Version = [major, minor, patch];
		switch (groups.operator) {
			case undefined:
			case '=':
				return { interval: { lower: from(base, false), upper: until(base) } };
			case '>':
				return { interval: { lower: from(base) } };
			case '<=':
				return { interval: { upper: until(base) } };
			default:
				break;
		}
	}
	return {
		interval: comparatorInterval(groups.operator, [major, minor, patch]),
	};
};

const tighterLower = function tighterLower(a?: Bound, b?: Bound) {
	if (!(a && b)) {
		return a ?? b;
	}
	const order = compareVersions(a.version, b.version);
	if (order !== 0) {
		return order > 0 ? a : b;
	}
	return a.inclusive ? b : a;
};

const tighterUpper = function tighterUpper(a?: Bound, b?: Bound) {
	if (!(a && b)) {
		return a ?? b;
	}
	const order = compareVersions(a.version, b.version);
	if (order !== 0) {
		return order < 0 ? a : b;
	}
	return a.inclusive ? b : a;
};

const isEmpty = function isEmpty({ lower, upper }: Interval) {
	if (!(lower && upper)) {
		return false;
	}
	const order = compareVersions(lower.version, upper.version);
	return order > 0 || (order === 0 && !(lower.inclusive && upper.inclusive));
};

/**
 * Split a range into comparator sets, one per `||` alternative, with
 * hyphen ranges rewritten as `>=` and `<=` comparators.
 *
 * @returns `undefined` when any comparator cannot be read.
 */
const parseRange = function parseRange(
	range: string
): Comparator[][] | undefined {
	const sets: Comparator[][] = [];
	for (const alternative of range.split('||')) {
		const normalized = alternative
			.trim()
			.replace(/(?<from>\S+)\s+-\s+(?<to>\S+)/u, '>=$<from> <=$<to>')
			.replace(/(?<operator><=|>=|<|>|=|\^|~)\s+/gu, '$<operator>');
		const comparators: Comparator[] = [];
		for (const text of normalized.split(/\s+/u).filter(Boolean)) {
			const comparator = parseComparator(text);
			if (!comparator) {
				return undefined;
			}
			comparators.push(comparator);
		}
		sets.push(comparators.length > 0 ? comparators : [{ interval: {} }]);
	}
	return sets;
};

/**
 * Whether a comparator set admits a version on the CLI's major.
 */
const admitsRelease = function admitsRelease(
	comparators: Comparator[],
	cliMajor: number
): boolean {
	let interval: Interval = {};
	for (const comparator of comparators) {
		interval = {
			lower: tighterLower(interval.lower, comparator.interval.lower),
			upper: tighterUpper(interval.upper, comparator.interval.upper),
		};
	}
	return !isEmpty({
		lower: tighterLower(interval.lower, {
			inclusive: true,
			version: [cliMajor, 0, 0],
		}),
		upper: tighterUpper(interval.upper, {
			inclusive: false,
			version: [cliMajor + 1, 0, 0],
		}),
	});
};

/**
 * Whether a range an app already declares for a c15t package matches the
 * release this CLI would install, so setup can keep it instead of
 * reinstalling. A range that admits no version on the CLI's major, such as
 * `^2` or `>=2 <3` under a v3 CLI, does not match: keeping it would leave
 * v2 installed under v3 code.
 *
 * Ranges the CLI cannot compare are kept as they are: `workspace:`,
 * `link:`, `file:` and `portal:` ranges, dist-tags, and anything it cannot
 * parse. So are packages outside the linked group, which install `latest`
 * and have no major to compare.
 *
 * @param name - Package name.
 * @param range - Range from the app's package.json.
 * @param version - CLI version. Defaults to the running CLI.
 * @returns `false` only when the range is known to select another release.
 */
export const isOnC15tRelease = function isOnC15tRelease(
	name: string,
	range: string,
	version: string = packageInfo.version
): boolean {
	const declared = range.trim();
	if (LOCAL_RANGE_PREFIXES.some((prefix) => declared.startsWith(prefix))) {
		return true;
	}
	if (c15tReleaseSpecifier(version, name) === 'latest') {
		return true;
	}
	const sets = parseRange(declared);
	if (!sets) {
		return true;
	}
	const cliMajor = Number(version.split('.')[0]);
	if (!Number.isInteger(cliMajor)) {
		return true;
	}
	return sets.some((comparators) => admitsRelease(comparators, cliMajor));
};
