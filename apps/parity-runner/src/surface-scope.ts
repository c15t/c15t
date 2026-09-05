/**
 * Where a surface actually lives.
 *
 * React and Astro render the banner inside `#storybook-root`; Svelte and
 * Vue portal it to `document.body`. A capture scoped to the Storybook root
 * therefore sees the whole banner on one side and nothing on the other,
 * which reads as "every slot is missing" rather than as parity.
 *
 * So the descriptive checks are scoped by `data-testid` instead: find the
 * outermost element of each surface wherever it ended up, mark it, and
 * capture from the marks. A story that renders no known surface falls back
 * to the Storybook root, which is what the primitive stories want anyway.
 */

import type { Page } from '@playwright/test';

/**
 * The `data-testid`s that name the outermost element of a surface.
 *
 * Overlays are listed alongside the roots they belong to: they are
 * siblings, not ancestors, so an adapter that renders one where another
 * does not is drift worth seeing.
 */
export const SURFACE_ROOT_TEST_IDS: readonly string[] = [
	'consent-banner-overlay',
	'consent-banner-root',
	'consent-dialog-link',
	'consent-dialog-overlay',
	'consent-dialog-root',
	'consent-dialog-trigger',
	'consent-widget-root',
	'frame-placeholder',
	'iab-consent-banner-overlay',
	'iab-consent-banner-root',
	'iab-consent-dialog-overlay',
	'iab-consent-dialog-root',
];

/** The attribute {@link markSurfaceRoots} stamps on each surface root. */
export const SURFACE_MARK_ATTRIBUTE = 'data-parity-surface';

/** Selector matching everything {@link markSurfaceRoots} marked. */
export const SURFACE_SCOPE_SELECTOR = `[${SURFACE_MARK_ATTRIBUTE}]`;

/** Scope used when a story renders none of {@link SURFACE_ROOT_TEST_IDS}. */
export const STORYBOOK_ROOT_SELECTOR = '#storybook-root';

/**
 * Mark the surfaces on the page so the captures can be scoped to them.
 *
 * Nested candidates are dropped — the dialog contains the widget, and
 * capturing both would compare the widget twice. Marks are stamped in
 * document order so two frameworks that render the same surfaces compare
 * them in the same sequence.
 *
 * @param page - The page showing a story.
 * @param testIds - The surface roots to look for.
 * @param fallbackSelector - Scope to use when no surface is present.
 * @returns How many surface roots were marked; 0 means the fallback.
 */
export const markSurfaceRoots = function markSurfaceRoots(
	page: Page,
	testIds: readonly string[] = SURFACE_ROOT_TEST_IDS,
	fallbackSelector: string = STORYBOOK_ROOT_SELECTOR
): Promise<number> {
	return page.evaluate(
		(args: {
			attribute: string;
			fallbackSelector: string;
			testIds: readonly string[];
		}) => {
			for (const marked of document.querySelectorAll(`[${args.attribute}]`)) {
				marked.removeAttribute(args.attribute);
			}

			const selector = args.testIds
				.map((id) => `[data-testid="${id}"]`)
				.join(',');
			const candidates = selector
				? Array.from(document.querySelectorAll(selector))
				: [];
			const outermost = candidates.filter(
				(element) =>
					!candidates.some(
						(other) => other !== element && other.contains(element)
					)
			);

			const roots = outermost.length
				? outermost
				: Array.from(document.querySelectorAll(args.fallbackSelector));
			roots.forEach((root, index) => {
				root.setAttribute(args.attribute, String(index));
			});
			return outermost.length;
		},
		{
			attribute: SURFACE_MARK_ATTRIBUTE,
			fallbackSelector,
			testIds,
		}
	);
};
