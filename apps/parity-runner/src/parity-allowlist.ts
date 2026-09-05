/**
 * Known cross-framework drift.
 *
 * An entry here says "this difference is real, we know about it, and it is
 * not this branch's job to fix it". Every entry needs a reason a reviewer
 * can act on — a link, an issue, or the constraint that forces it. An
 * entry with a vague reason is worse than a red test, because it hides one
 * without recording why.
 *
 * Entries are keyed by check, framework, story and slot. `'*'` matches
 * everything in that position; prefer the narrowest key that covers the
 * drift, so an unrelated regression in the same story still fails.
 *
 * Nothing expires automatically. Delete an entry when the drift is fixed —
 * {@link unusedAllowlistEntries} reports entries that matched nothing, so a
 * stale allowance shows up as soon as the drift goes away.
 */

/** The checks an entry can silence. */
export type ParityCheck = 'geometry' | 'pixel' | 'dom' | 'a11y' | 'css';

/** One allowed difference. */
export interface ParityAllowEntry {
	/** Which check the allowance applies to. */
	check: ParityCheck;
	/** The framework that differs from the React baseline, or `'*'`. */
	framework: string;
	/** The paired story key (e.g. `Core/Consent Banner/Default`), or `'*'`. */
	story: string;
	/**
	 * The `data-testid` slot, or `'*'`. Geometry slots may carry a repeat
	 * index (`consent-widget-footer-sub-group[1]`); a bare id matches every
	 * index of that slot.
	 */
	slot: string;
	/** Why this drift is allowed. Required; keep it specific. */
	reason: string;
}

export const PARITY_ALLOWLIST: readonly ParityAllowEntry[] = [
	{
		check: 'geometry',
		framework: 'vue',
		reason:
			'Vue nests its footer actions one level deeper than React and Svelte, so the sub-group boxes do not line up. Tracked in v3.md as a known Vue footer-nesting difference; out of scope for the visual parity gate.',
		slot: 'consent-banner-footer-sub-group',
		story: '*',
	},
	{
		check: 'geometry',
		framework: 'vue',
		reason:
			'Same Vue footer nesting as the banner, on the dialog surface. See v3.md.',
		slot: 'consent-widget-footer-sub-group',
		story: '*',
	},
];

const matches = function matches(
	pattern: string,
	value: string,
	stripIndex: boolean
): boolean {
	if (pattern === '*' || pattern === value) {
		return true;
	}
	return stripIndex && value.replace(/\[\d+\]$/u, '') === pattern;
};

/** A difference being tested against the allowlist. */
export interface ParityFinding {
	check: ParityCheck;
	framework: string;
	story: string;
	slot: string;
}

/**
 * Whether a finding is covered by an allowlist entry.
 *
 * @param finding - The difference the check found.
 * @param allowlist - The entries to test against.
 * @returns The matching entry, or undefined.
 */
export const findAllowEntry = function findAllowEntry(
	finding: ParityFinding,
	allowlist: readonly ParityAllowEntry[] = PARITY_ALLOWLIST
): ParityAllowEntry | undefined {
	return allowlist.find(
		(entry) =>
			entry.check === finding.check &&
			matches(entry.framework, finding.framework, false) &&
			matches(entry.story, finding.story, false) &&
			matches(entry.slot, finding.slot, true)
	);
};

/**
 * Entries that matched nothing in a run.
 *
 * @param used - The entries that did match.
 * @param allowlist - The full allowlist.
 * @returns Entries that can be deleted.
 */
export const unusedAllowlistEntries = function unusedAllowlistEntries(
	used: ReadonlySet<ParityAllowEntry>,
	allowlist: readonly ParityAllowEntry[] = PARITY_ALLOWLIST
): ParityAllowEntry[] {
	return allowlist.filter((entry) => !used.has(entry));
};
