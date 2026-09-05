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
	 * The `data-testid` slot, or `'*'`. A trailing `*` matches a prefix
	 * (`consent-widget-accordion-trigger-*`), which is how per-category
	 * slots are covered without one entry per category. Geometry slots may
	 * carry a repeat index (`consent-widget-footer-sub-group[1]`); a bare id
	 * matches every index of that slot.
	 *
	 * The descriptive DOM, a11y and computed-style checks report one result
	 * per story rather than per element, so their entries use `'*'`.
	 */
	slot: string;
	/** Why this drift is allowed. Required; keep it specific. */
	reason: string;
}

export const PARITY_ALLOWLIST: readonly ParityAllowEntry[] = [
	// ---------------------------------------------------------------------
	// Surfaces this branch did not touch.
	// ---------------------------------------------------------------------
	{
		check: 'geometry',
		framework: 'svelte',
		reason:
			'The React frame placeholder renders neither `frame-placeholder` nor `frame-open-dialog`; Svelte renders both. A real gap in the React frame, out of scope for the visual parity gate.',
		slot: 'frame-*',
		story: 'Core/Frame/Placeholder',
	},
	{
		check: 'geometry',
		framework: 'svelte',
		reason:
			'The IAB banner has never been through a cross-framework pass — card, header, footer and every button differ. Out of scope here; the gate now records it instead of ignoring it.',
		slot: 'iab-consent-banner-*',
		story: 'IAB/IAB Consent Banner/Default',
	},

	// ---------------------------------------------------------------------
	// The descriptive checks. Restoring React's story-title prefixes (see
	// `fix(storybook): restore the section prefixes on React story titles`)
	// put React back into these comparisons after #1063 silently dropped it,
	// which surfaced drift that had been invisible rather than absent.
	// Each entry below is a real difference nobody has fixed yet.
	// ---------------------------------------------------------------------
	{
		check: 'css',
		framework: '*',
		reason:
			'The accordion trigger structure differs (see the geometry entry), and the React Storybook resolves a handful of `@c15t/ui` primitives to source while the others use the built stylesheet, so token values serialise differently (`0.5rem` against `.5rem`). Neither is a runtime difference; both need their own change.',
		slot: '*',
		story: 'Core/Consent Widget/Default',
	},
	{
		check: 'dom',
		framework: '*',
		reason: 'Accordion trigger structure. See the geometry entry.',
		slot: '*',
		story: 'Core/Consent Widget/Default',
	},
	{
		check: 'css',
		framework: 'svelte',
		reason:
			'The React frame placeholder renders neither `frame-placeholder` nor `frame-open-dialog`. See the geometry entry.',
		slot: '*',
		story: 'Core/Frame/Placeholder',
	},
	{
		check: 'dom',
		framework: 'svelte',
		reason: 'React frame placeholder gap. See the geometry entry.',
		slot: '*',
		story: 'Core/Frame/Placeholder',
	},
	{
		check: 'a11y',
		framework: 'svelte',
		reason: 'React frame placeholder gap. See the geometry entry.',
		slot: '*',
		story: 'Core/Frame/Placeholder',
	},
	{
		check: 'dom',
		framework: 'astro',
		reason:
			'The Astro dialog is a Svelte island mounted into a server-rendered host, so the tree carries the host wrapper React does not have. Structural by design.',
		slot: '*',
		story: 'Core/Consent Dialog/Default',
	},
	{
		check: 'dom',
		framework: 'astro',
		reason:
			'Astro renders the IAB dialog as the same Svelte island, inside its server-rendered host wrapper.',
		slot: '*',
		story: 'IAB/IAB Consent Dialog/Overview',
	},
	{
		check: 'a11y',
		framework: 'astro',
		reason:
			'Astro renders the IAB dialog as the same Svelte island, inside its server-rendered host wrapper.',
		slot: '*',
		story: 'IAB/IAB Consent Dialog/Overview',
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
	if (pattern.endsWith('*') && value.startsWith(pattern.slice(0, -1))) {
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
 * Entries for one check that matched nothing in a run.
 *
 * Scoped to a single check because each check runs in its own Playwright
 * test and only ever consults its own entries — a geometry run knows
 * nothing about whether the pixel entries were needed.
 *
 * Scoped to the enabled frameworks for the same reason. `PARITY_FRAMEWORKS`
 * defaults to `react,svelte`, so a full-matrix allowlist carries Vue and
 * Astro entries a default run never gets the chance to use. Reporting those
 * as stale would fail every default run and teach the reader to ignore the
 * one signal this check exists to give. A `'*'` entry is in scope whenever
 * any framework is.
 *
 * @param used - The entries that did match.
 * @param checks - The checks whose entries this run is responsible for.
 * @param frameworks - The frameworks this run enabled.
 * @param allowlist - The full allowlist.
 * @returns Entries that can be deleted.
 */
export const unusedAllowlistEntries = function unusedAllowlistEntries(
	used: ReadonlySet<ParityAllowEntry>,
	checks: readonly ParityCheck[],
	frameworks: readonly string[],
	allowlist: readonly ParityAllowEntry[] = PARITY_ALLOWLIST
): ParityAllowEntry[] {
	const inScope = function inScope(entry: ParityAllowEntry): boolean {
		return entry.framework === '*'
			? frameworks.length > 0
			: frameworks.includes(entry.framework);
	};

	return allowlist.filter(
		(entry) =>
			checks.includes(entry.check) && inScope(entry) && !used.has(entry)
	);
};
