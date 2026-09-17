/**
 * Turning an incoming URL into a demo verb.
 *
 * Pure and free of React Native imports on purpose: this is the part a reviewer
 * cannot see working without a device, so it is the part worth a unit test. The
 * grammar is small and fixed, which is why it is read by hand rather than through
 * a URL parser that Hermes only partly provides:
 *
 * ```text
 * c15t-demo://<verb>[/<argument>][?name=value[&name=value]]
 * ```
 */

/** The scheme registered in `Info.plist` and `AndroidManifest.xml`. */
export const DEMO_LINK_SCHEME = 'c15t-demo';

/** One parsed demo link. */
export interface DemoLink {
	/** Query parameters, percent-decoded, last occurrence winning. */
	readonly params: Readonly<Record<string, string>>;
	/** The URL exactly as it arrived, for the on-screen receipt. */
	readonly raw: string;
	/** Path segments after the verb, percent-decoded. `scheme://scheme/dark` is `['dark']`. */
	readonly rest: readonly string[];
	/** First path segment, which is the verb. Empty for a bare scheme URL. */
	readonly verb: string;
}

/** Decode one path or query component, leaving a malformed escape alone. */
const decode = (value: string): string => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

/** Split `a=1&b=` into a record, ignoring a fragment with no `=`. */
const parseQuery = (query: string): Record<string, string> => {
	const params: Record<string, string> = {};

	for (const pair of query.split('&')) {
		const separator = pair.indexOf('=');

		if (separator < 1) {
			continue;
		}

		params[decode(pair.slice(0, separator))] = decode(
			pair.slice(separator + 1)
		);
	}

	return params;
};

/**
 * Parse a URL into a demo link.
 *
 * Anything that is not this app's scheme is not a demo command, including the
 * links the app opens itself, so those return `null` rather than an error.
 *
 * @param url - Value from `Linking`, or `null` when the app was launched normally.
 * @returns The parsed link, or `null` when this is not a demo link.
 */
export const parseDemoLink = (
	url: string | null | undefined
): DemoLink | null => {
	if (typeof url !== 'string') {
		return null;
	}

	// `c15t-demo:accept` reaches JavaScript from some Android launchers, which drop
	// the authority slashes, so both spellings of one command are accepted.
	const body = (() => {
		const lower = url.toLowerCase();

		if (lower.startsWith(`${DEMO_LINK_SCHEME}://`)) {
			return url.slice(DEMO_LINK_SCHEME.length + 3);
		}

		return lower.startsWith(`${DEMO_LINK_SCHEME}:`)
			? url.slice(DEMO_LINK_SCHEME.length + 1)
			: null;
	})();

	if (body === null) {
		return null;
	}

	const trimmed = body.replace(/^\/+/u, '');
	const hashAt = trimmed.indexOf('#');
	const beforeHash = hashAt < 0 ? trimmed : trimmed.slice(0, hashAt);
	const queryAt = beforeHash.indexOf('?');
	const path = queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt);
	const query = queryAt < 0 ? '' : beforeHash.slice(queryAt + 1);
	const segments = path
		.split('/')
		.filter((segment) => segment.length > 0)
		.map(decode);

	return {
		params: parseQuery(query),
		raw: url,
		rest: segments.slice(1),
		verb: segments[0] ?? '',
	};
};

/**
 * Read a boolean from a demo link.
 *
 * `?marketing=0`, `?marketing=false`, and an absent key all mean no, so a verb can
 * be typed at a shell without quoting a full parameter set.
 *
 * @param link - Parsed link.
 * @param name - Parameter name.
 * @returns `true` only for the affirmative spellings.
 */
export const linkFlag = (link: DemoLink, name: string): boolean => {
	const value = link.params[name];

	return (
		value !== undefined &&
		!['0', 'false', 'no', 'off'].includes(value.toLowerCase())
	);
};
