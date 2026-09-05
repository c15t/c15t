/**
 * Accessibility-tree capture.
 *
 * Playwright 1.59 removed `page.accessibility.snapshot`; the replacement is
 * `locator.ariaSnapshot()`, which returns a YAML-like textual representation
 * of the accessibility tree. Cross-framework equivalence shows up as string
 * equality on that representation — same roles, names, and structure produce
 * identical output.
 *
 * Scoped the same way the DOM and computed-style captures are: one snapshot
 * per surface on the page, joined in document order. Snapshotting `body`
 * would drag in each Storybook's own chrome, and snapshotting
 * `#storybook-root` would miss the surfaces that portal out of it.
 */

import type { Page } from '@playwright/test';

export const captureA11yTree = async function captureA11yTree(
	page: Page,
	selector: string
): Promise<string> {
	const roots = await page.locator(selector).all();
	const snapshots: string[] = [];
	for (const root of roots) {
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		snapshots.push(await root.ariaSnapshot());
	}
	return snapshots.join('\n---\n');
};
