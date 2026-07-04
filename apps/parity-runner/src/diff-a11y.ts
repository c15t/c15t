/**
 * Accessibility-tree capture.
 *
 * Playwright 1.59 removed `page.accessibility.snapshot`; the replacement is
 * `locator.ariaSnapshot()`, which returns a YAML-like textual representation
 * of the accessibility tree. Cross-framework equivalence shows up as string
 * equality on that representation — same roles, names, and structure produce
 * identical output.
 *
 * We snapshot `body` (not `#storybook-root`) because portal-based components
 * (banner, dialog) render into `document.body`, outside the Storybook root.
 */

import type { Page } from '@playwright/test';

export async function captureA11yTree(page: Page): Promise<string> {
	return page.locator('body').ariaSnapshot();
}
