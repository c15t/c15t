/**
 * Story pairing.
 *
 * React titles live under `COMPONENTS - REACT/...`; Svelte under
 * `COMPONENTS - SVELTE/...`; Vue under `COMPONENTS - VUE/...`; Solid
 * under `COMPONENTS - SOLID/...`. Pairing strips the `{FRAMEWORK}`
 * segment so `COMPONENTS - REACT/Button` pairs with
 * `COMPONENTS - SVELTE/Button`, `COMPONENTS - VUE/Button`, etc.
 */

export type StoryEntry = {
	/** Full Storybook id (e.g. `components-react-button--primary`). */
	id: string;
	/** Human title (e.g. `COMPONENTS - REACT/Button`). */
	title: string;
	/** Story name (e.g. `Primary`). */
	name: string;
};

export type PairedStory = {
	/** Framework-neutral key (e.g. `Button/Primary`). */
	key: string;
	/** Story metadata per framework, keyed by framework code. */
	entries: Readonly<Record<string, StoryEntry>>;
};

const FRAMEWORK_SEGMENT = /^components\s*-\s*(react|svelte|vue|solid)\//i;

/**
 * Extract the framework code from a Storybook title, or null if the title
 * does not match the expected `COMPONENTS - {FRAMEWORK}/...` pattern.
 */
export function frameworkOf(title: string): string | null {
	const match = FRAMEWORK_SEGMENT.exec(title);
	return match?.[1]?.toLowerCase() ?? null;
}

/**
 * Compute a framework-neutral key from a story by stripping the framework
 * segment from its title and appending the story name.
 */
export function storyKey(entry: StoryEntry): string {
	const stripped = entry.title.replace(FRAMEWORK_SEGMENT, '').trim();
	return `${stripped}/${entry.name}`;
}

/**
 * Pair stories across frameworks by their framework-neutral key.
 */
export function pairStories(
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
		.map(([key, entries]) => ({ key, entries }))
		.sort((a, b) => a.key.localeCompare(b.key));
}
