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
	// Dialog primitives. Every adapter now agrees on the boxes, the roles and
	// the computed styles of the dialog; what is left is the bookkeeping each
	// primitive library stamps on its own elements.
	// ---------------------------------------------------------------------
	{
		check: 'dom',
		framework: 'svelte',
		reason:
			"Ark and Reka stamp their own bookkeeping on the dialog they render — `data-slot`, `data-state` and a generated `id` — which React's hand-rolled dialog has no equivalent for. The boxes, the roles and the computed styles all match; only the adapters' primitive libraries differ. React styles the switch through `data-size`/`data-variant` on the `components/switch` sheet while Svelte appends `root-small`/`track-small` classes from the `primitives/switch` sheet. Two stylesheets for one control, producing identical computed styles; picking one is its own change.",
		slot: '*',
		story: 'Core/Consent Dialog/Default',
	},
	{
		check: 'dom',
		framework: 'svelte',
		reason:
			"Ark and Reka stamp their own bookkeeping on the dialog they render — `data-slot`, `data-state` and a generated `id` — which React's hand-rolled dialog has no equivalent for. The boxes, the roles and the computed styles all match; only the adapters' primitive libraries differ. React styles the switch through `data-size`/`data-variant` on the `components/switch` sheet while Svelte appends `root-small`/`track-small` classes from the `primitives/switch` sheet. Two stylesheets for one control, producing identical computed styles; picking one is its own change.",
		slot: '*',
		story: 'Core/Consent Dialog Trigger/Default',
	},
	{
		check: 'dom',
		framework: 'svelte',
		reason:
			"Ark and Reka stamp their own bookkeeping on the dialog they render — `data-slot`, `data-state` and a generated `id` — which React's hand-rolled dialog has no equivalent for. The boxes, the roles and the computed styles all match; only the adapters' primitive libraries differ. React styles the switch through `data-size`/`data-variant` on the `components/switch` sheet while Svelte appends `root-small`/`track-small` classes from the `primitives/switch` sheet. Two stylesheets for one control, producing identical computed styles; picking one is its own change.",
		slot: '*',
		story: 'Core/Consent Dialog Link/Default',
	},
	{
		check: 'dom',
		framework: 'svelte',
		reason:
			"Ark and Reka stamp their own bookkeeping on the dialog they render — `data-slot`, `data-state` and a generated `id` — which React's hand-rolled dialog has no equivalent for. The boxes, the roles and the computed styles all match; only the adapters' primitive libraries differ. React styles the switch through `data-size`/`data-variant` on the `components/switch` sheet while Svelte appends `root-small`/`track-small` classes from the `primitives/switch` sheet. Two stylesheets for one control, producing identical computed styles; picking one is its own change.",
		slot: '*',
		story: 'Core/Consent Banner/Banner To Dialog Flow',
	},
	{
		check: 'dom',
		framework: 'vue',
		reason:
			"Vue's category accordion is Reka's, so it carries `role=\"button\"` and `tabindex` on the trigger and none of the `data-slot` bookkeeping React's preference-item primitive emits. Same boxes, same computed styles, different primitive library.",
		slot: '*',
		story: 'Core/Consent Dialog/Default',
	},
	{
		check: 'dom',
		framework: 'vue',
		reason:
			"Vue's category accordion is Reka's, so it carries `role=\"button\"` and `tabindex` on the trigger and none of the `data-slot` bookkeeping React's preference-item primitive emits. Same boxes, same computed styles, different primitive library.",
		slot: '*',
		story: 'Core/Consent Dialog Trigger/Default',
	},
	{
		check: 'dom',
		framework: 'vue',
		reason:
			"Vue's category accordion is Reka's, so it carries `role=\"button\"` and `tabindex` on the trigger and none of the `data-slot` bookkeeping React's preference-item primitive emits. Same boxes, same computed styles, different primitive library.",
		slot: '*',
		story: 'Core/Consent Banner/Banner To Dialog Flow',
	},
	{
		check: 'dom',
		framework: 'vue',
		reason:
			"Vue's category accordion is Reka's, so it carries `role=\"button\"` and `tabindex` on the trigger and none of the `data-slot` bookkeeping React's preference-item primitive emits. Same boxes, same computed styles, different primitive library.",
		slot: '*',
		story: 'Core/Consent Dialog/Dialog Contract',
	},
	{
		check: 'dom',
		framework: 'vue',
		reason:
			"Vue's category accordion is Reka's, so it carries `role=\"button\"` and `tabindex` on the trigger and none of the `data-slot` bookkeeping React's preference-item primitive emits. Same boxes, same computed styles, different primitive library.",
		slot: '*',
		story: 'Core/Consent Dialog Trigger/Dialog Focus Management',
	},
	{
		check: 'dom',
		framework: 'vue',
		reason:
			"Vue's category accordion is Reka's, so it carries `role=\"button\"` and `tabindex` on the trigger and none of the `data-slot` bookkeeping React's preference-item primitive emits. Same boxes, same computed styles, different primitive library.",
		slot: '*',
		story: 'Core/Consent Widget/Expanded Categories',
	},

	// ---------------------------------------------------------------------
	// The consent widget. React wraps each category in a preference-item
	// primitive; Svelte and Vue use their own. The boxes match.
	// ---------------------------------------------------------------------
	{
		check: 'dom',
		framework: '*',
		reason:
			"React's widget renders the shared preference-item primitive and Svelte's renders its own, so the trees differ on that wrapper. The boxes and the visible styles match.",
		slot: '*',
		story: 'Core/Consent Widget/Default',
	},

	// ---------------------------------------------------------------------
	// Astro. Its banner is server-rendered and progressively enhanced, so the
	// markup carries the hooks the client boot looks for.
	// ---------------------------------------------------------------------
	{
		check: 'dom',
		framework: 'astro',
		reason:
			"Astro's server-rendered banner carries the attributes its client boot reads — `data-c15t-visible` on the root, `data-c15t-action` on each button — and the `lang` the server resolved. Nothing else renders them because nothing else needs them.",
		slot: '*',
		story: 'Core/Consent Banner/Default',
	},
	{
		check: 'dom',
		framework: 'astro',
		reason:
			'The Astro dialog is a Svelte island mounted into a server-rendered host, so the tree carries the host wrapper React does not have. Structural by design.',
		slot: '*',
		story: 'Core/Consent Dialog/Default',
	},

	// ---------------------------------------------------------------------
	// IAB. The banner is fully converged — no allowance on any check. The
	// preference centre is converged everywhere the eye can reach; what is
	// left is the vendor list's collapsed internals.
	// ---------------------------------------------------------------------
	{
		check: 'dom',
		framework: 'svelte',
		reason:
			"The IAB preference centre's vendor list. Every other IAB check is clean — geometry, pixel and a11y pass with no allowance on either surface, and the banner passes all five — so what is left is the markup inside the collapsed vendor rows, which the DOM snapshot compares byte for byte even while it is closed. Two known differences remain. React sizes several icons with inline `style` where Svelte and Vue use the `legitimateInterestIcon` class, and React's vendor purpose headings carry the `role` and `focusable` attributes its icons elsewhere do not; converging them is a `packages/react` icon pass, not an adapter fix. And Vue's `iab-vendor-list.vue` is a much thinner component than React's — flat rows with no expandable detail, no legitimate-interest or custom-vendor sections — so roughly 600 lines of it have no counterpart to compare. Porting it is its own change.",
		slot: '*',
		story: 'IAB/IAB Consent Dialog/Overview',
	},
	{
		check: 'dom',
		framework: 'vue',
		reason:
			"The IAB preference centre's vendor list. Every other IAB check is clean — geometry, pixel and a11y pass with no allowance on either surface, and the banner passes all five — so what is left is the markup inside the collapsed vendor rows, which the DOM snapshot compares byte for byte even while it is closed. Two known differences remain. React sizes several icons with inline `style` where Svelte and Vue use the `legitimateInterestIcon` class, and React's vendor purpose headings carry the `role` and `focusable` attributes its icons elsewhere do not; converging them is a `packages/react` icon pass, not an adapter fix. And Vue's `iab-vendor-list.vue` is a much thinner component than React's — flat rows with no expandable detail, no legitimate-interest or custom-vendor sections — so roughly 600 lines of it have no counterpart to compare. Porting it is its own change.",
		slot: '*',
		story: 'IAB/IAB Consent Dialog/Overview',
	},
	{
		check: 'dom',
		framework: 'vue',
		reason:
			"The IAB preference centre's vendor list. Every other IAB check is clean — geometry, pixel and a11y pass with no allowance on either surface, and the banner passes all five — so what is left is the markup inside the collapsed vendor rows, which the DOM snapshot compares byte for byte even while it is closed. Two known differences remain. React sizes several icons with inline `style` where Svelte and Vue use the `legitimateInterestIcon` class, and React's vendor purpose headings carry the `role` and `focusable` attributes its icons elsewhere do not; converging them is a `packages/react` icon pass, not an adapter fix. And Vue's `iab-vendor-list.vue` is a much thinner component than React's — flat rows with no expandable detail, no legitimate-interest or custom-vendor sections — so roughly 600 lines of it have no counterpart to compare. Porting it is its own change.",
		slot: '*',
		story: 'IAB/IAB Consent Banner/Customize Flow',
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
