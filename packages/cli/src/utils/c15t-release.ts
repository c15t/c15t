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
	/^(?<operator><=|>=|<|>|=|\^|~)?v?(?<major>\d+|x|\*)(?:\.(?<minor>\d+|x|\*))?(?:\.(?<patch>\d+|x|\*))?(?:-(?<channel>[0-9a-z]+)[0-9a-z.-]*)?(?:\+[0-9a-z.-]+)?$/iu;

/** An npm dist-tag such as `latest`, `alpha` or `next`. */
const DIST_TAG = /^[a-z][0-9a-z._-]*$/iu;

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
	/** Major and prerelease channel, when the comparator names one. */
	channel?: { major: number; name: string };
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
 * release line matters here, and the channel is checked separately.
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
	const interval = comparatorInterval(groups.operator, [major, minor, patch]);
	const name = groups.channel?.toLowerCase();
	return name ? { channel: { major, name }, interval } : { interval };
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
 * Whether a comparator set admits a version on the CLI's major. For a
 * prerelease CLI the set must also name no other prerelease channel on that
 * major, and a set that names none at all must not reach below the major:
 * npm only picks a prerelease for a comparator that names one, so `>=2`
 * resolves to the last stable v2 rather than the v3 alpha.
 */
const admitsRelease = function admitsRelease(
	comparators: Comparator[],
	cliMajor: number,
	channel: string | undefined
): boolean {
	let interval: Interval = {};
	let namesChannel = false;
	for (const comparator of comparators) {
		interval = {
			lower: tighterLower(interval.lower, comparator.interval.lower),
			upper: tighterUpper(interval.upper, comparator.interval.upper),
		};
		if (channel === undefined || comparator.channel?.major !== cliMajor) {
			continue;
		}
		if (comparator.channel.name !== channel) {
			return false;
		}
		namesChannel = true;
	}
	const majorStart: Version = [cliMajor, 0, 0];
	if (
		channel !== undefined &&
		!namesChannel &&
		(!interval.lower || compareVersions(interval.lower.version, majorStart) < 0)
	) {
		return false;
	}
	return !isEmpty({
		lower: tighterLower(interval.lower, {
			inclusive: true,
			version: majorStart,
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
 * v2 installed under v3 code. On a prerelease CLI, a range that names
 * another prerelease channel on its major does not match either, nor does
 * one that names no prerelease and also admits an earlier major, such as
 * `>=2`, because npm resolves it to the earlier stable release. Neither
 * does a dist-tag other than the CLI's own, since `latest` still points at
 * the previous stable major.
 *
 * Ranges the CLI cannot compare are kept as they are: `workspace:`,
 * `link:`, `file:` and `portal:` ranges, dist-tags on a stable CLI, and
 * anything it cannot parse. So are packages outside the linked group on a
 * stable CLI, which install `latest` and have no major to compare.
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
	const specifier = c15tReleaseSpecifier(version, name);
	if (specifier === 'latest') {
		return true;
	}
	const isPrerelease = version.includes('-');
	const sets = parseRange(declared);
	if (!sets) {
		if (isPrerelease && DIST_TAG.test(declared)) {
			return declared.toLowerCase() === specifier;
		}
		return true;
	}
	const cliMajor = Number(version.split('.')[0]);
	if (!Number.isInteger(cliMajor)) {
		return true;
	}
	const channel = isPrerelease ? specifier : undefined;
	return sets.some((comparators) =>
		admitsRelease(comparators, cliMajor, channel)
	);
};
