/**
 * Story pairing.
 *
 * React titles live under `COMPONENTS - REACT/...`; Svelte under
 * `COMPONENTS - SVELTE/...`; Vue under `COMPONENTS - VUE/...`; Solid
 * under `COMPONENTS - SOLID/...`; Astro under `COMPONENTS - ASTRO/...`.
 * Pairing strips the `{FRAMEWORK}` segment so `COMPONENTS - REACT/Button`
 * pairs with `COMPONENTS - SVELTE/Button`, `COMPONENTS - VUE/Button`, etc.
 */

export interface StoryEntry {
	/** Full Storybook id (e.g. `components-react-button--primary`). */
	id: string;
	/** Human title (e.g. `COMPONENTS - REACT/Button`). */
	title: string;
	/** Story name (e.g. `Primary`). */
	name: string;
}

export interface PairedStory {
	/** Framework-neutral key (e.g. `Button/Primary`). */
	key: string;
	/** Story metadata per framework, keyed by framework code. */
	entries: Readonly<Record<string, StoryEntry>>;
}

const FRAMEWORK_SEGMENT =
	/^components\s*-\s*(?<capture1>react|svelte|vue|solid|astro)\//iu;

/**
 * Extract the framework code from a Storybook title, or null if the title
 * does not match the expected `COMPONENTS - {FRAMEWORK}/...` pattern.
 */
export const frameworkOf = function frameworkOf(title: string): string | null {
	const match = FRAMEWORK_SEGMENT.exec(title);
	return match?.[1]?.toLowerCase() ?? null;
};

/**
 * Compute a framework-neutral key from a story by stripping the framework
 * segment from its title and appending the story name.
 */
export const storyKey = function storyKey(entry: StoryEntry): string {
	const stripped = entry.title.replace(FRAMEWORK_SEGMENT, '').trim();
	return `${stripped}/${entry.name}`;
};

/**
 * Pair stories across frameworks by their framework-neutral key.
 */
export const pairStories = function pairStories(
	entriesByFramework: Readonly<Record<string, readonly StoryEntry[]>>
): PairedStory[] {
	const byKey = new Map<string, Record<string, StoryEntry>>();
	for (const [framework, entries] of Object.entries(entriesByFramework)) {
		for (const entry of entries) {
			const key = storyKey(entry);
			const existing = byKey.get(key) ?? {};
			existing[framework] = entry;
			byKey.set(key, existing);
		}
	}
	return Array.from(byKey.entries())
		.map(([key, entries]) => ({ entries, key }))
		.sort((a, b) => a.key.localeCompare(b.key));
};

/**
 * Frameworks that were compared and that a pair is missing.
 *
 * A pair with fewer entries than the run enables is not automatically
 * wrong: the Storybook apps do not carry the same catalogue (React ships
 * 17 story files, Solid 5, Astro 4), so most pairs are legitimately
 * partial. What matters is that the gap is visible in the report rather
 * than silently absent, and that both comparisons compute it the same way.
 */
export const missingFrameworks = function missingFrameworks(
	pair: PairedStory,
	frameworks: readonly string[]
): string[] {
	return frameworks.filter((framework) => !pair.entries[framework]);
};

/** A pair the gate will compare, plus the frameworks it does not cover. */
export interface ComparablePair extends PairedStory {
	/** Enabled frameworks that ship no equivalent of this story. */
	missing: string[];
}

/** How a caller narrows the paired set it will compare. */
export interface ComparablePairOptions {
	/** The frameworks this run was told to check. */
	frameworks: readonly string[];
	/**
	 * A framework every pair must include, when the comparison measures
	 * against one. The visual gate needs React; the descriptive checks
	 * compare whatever pair they are given.
	 */
	baseline?: string;
	/** Story-key prefixes this comparison owns elsewhere. */
	excludeKeyPrefixes?: readonly string[];
}

/**
 * The one place a paired story is judged comparable.
 *
 * Both gates used to filter their own way — one required two entries and
 * dropped DevTools, the other required React — so a change to one silently
 * changed what the other compared. They call this instead.
 *
 * @param entriesByFramework - Story entries per framework code.
 * @param options - Enabled frameworks, optional baseline and exclusions.
 * @returns Comparable pairs, each carrying the frameworks it is missing.
 */
export const selectComparablePairs = function selectComparablePairs(
	entriesByFramework: Readonly<Record<string, readonly StoryEntry[]>>,
	options: ComparablePairOptions
): ComparablePair[] {
	const excluded = options.excludeKeyPrefixes ?? [];
	return pairStories(entriesByFramework)
		.filter((pair) => Object.keys(pair.entries).length >= 2)
		.filter((pair) => !options.baseline || pair.entries[options.baseline])
		.filter((pair) => !excluded.some((prefix) => pair.key.startsWith(prefix)))
		.map((pair) => ({
			...pair,
			missing: missingFrameworks(pair, options.frameworks),
		}));
};
