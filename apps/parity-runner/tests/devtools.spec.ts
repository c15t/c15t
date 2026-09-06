/* oxlint-disable no-await-in-loop -- Each capture navigates the same browser page and compares against the preceding React render. */
import { diffComputedStyleMap } from '@c15t/conformance';
import { expect, test } from '@playwright/test';

import { captureComputedStyleMap } from '../src/diff-computed-style';
import { captureDomSnapshot } from '../src/diff-dom';
import { loadStorybookIndex } from '../src/storybook-index';

const urls: Record<string, string> = {
	react: process.env.REACT_STORYBOOK_URL ?? 'http://127.0.0.1:6006',
	svelte: process.env.SVELTE_STORYBOOK_URL ?? 'http://127.0.0.1:6007',
	vue: process.env.VUE_STORYBOOK_URL ?? 'http://127.0.0.1:6008',
};
// Only the frameworks that ship a DevTools panel. `PARITY_FRAMEWORKS` also
// names Astro, whose Storybook renders the server banner and the dialog
// islands — there is no DevTools surface there to compare.
const frameworks = (process.env.PARITY_FRAMEWORKS ?? 'react,svelte')
	.split(',')
	.map((value) => value.trim())
	// `in` would also accept `toString` and friends off the prototype.
	.filter((value) => Object.hasOwn(urls, value))
	.sort((left, right) => Number(right === 'react') - Number(left === 'react'));
const tabs = [
	'Consents',
	'Scripts',
	'Location',
	'Policy',
	'IAB',
	'Events',
	'Actions',
] as const;
const rootSelector = '[data-c15t-dev-tools]';

// All framework renders are captured in the same Chromium run. This avoids
// OS-specific font baselines and deliberately does not use toHaveScreenshot,
// so CI's --ignore-snapshots cannot disable these visual comparisons.
for (const colorScheme of ['light', 'dark'] as const) {
	for (const mobile of [false, true]) {
		test(`DevTools parity: ${colorScheme}, ${mobile ? 'mobile' : 'desktop'}`, async ({
			page,
		}, testInfo) => {
			expect(frameworks).toContain('react');
			expect(frameworks.length).toBeGreaterThan(1);
			const viewport = mobile
				? { height: 844, width: 390 }
				: { height: 900, width: 1280 };
			await page.setViewportSize(viewport);
			await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
			await page.clock.setFixedTime(new Date('2026-01-01T12:00:00Z'));
			const baseline = new Map<
				string,
				{
					image: Buffer;
					dom: string;
					a11y: string;
					styles: Awaited<ReturnType<typeof captureComputedStyleMap>>;
				}
			>();
			for (const framework of frameworks) {
				const url = urls[framework];
				expect(
					url,
					`No DevTools Storybook configured for ${framework}`
				).toBeTruthy();
				if (!url) {
					throw new Error(`Missing ${framework} URL`);
				}
				const entries = await loadStorybookIndex(url);
				const entry = entries.find(
					(story) =>
						story.title.endsWith('/Core/DevTools') && story.name === 'Default'
				);
				expect(
					entry,
					`${framework} must include the DevTools comparison story`
				).toBeDefined();
				if (!entry) {
					throw new Error(`Missing ${framework} DevTools comparison story`);
				}
				await page.goto(`${url}/iframe.html?id=${entry.id}&viewMode=story`, {
					waitUntil: 'networkidle',
				});
				const root = page.locator(rootSelector);
				await expect(root).toHaveCount(1);
				await expect(
					root.getByRole('tab', { exact: true, name: 'Consents' })
				).toBeVisible();
				await page.evaluate(() => document.fonts.ready);
				// The Storybook theme follows the host's .dark class, not media alone.
				await page.evaluate((scheme) => {
					document.documentElement.classList.toggle('dark', scheme === 'dark');
					document.documentElement.style.colorScheme = scheme;
				}, colorScheme);
				await expect(root.locator('.c15t-dev-tools__panel')).toHaveCSS(
					'background-color',
					colorScheme === 'dark' ? 'rgb(18, 18, 18)' : 'rgb(255, 255, 255)'
				);
				for (const tab of [...tabs, 'Launcher']) {
					if (tab === 'Launcher') {
						await root
							.getByRole('button', { name: 'Close c15t DevTools' })
							.click();
					} else {
						await root.getByRole('tab', { exact: true, name: tab }).click();
						if (tab === 'Events') {
							await root.getByRole('button', { name: 'Clear events' }).click();
						}
					}
					// Revisions reflect framework initialization order, not different UI.
					if (tab === 'Policy') {
						await root
							.locator('dt')
							.filter({ hasText: /^Revision$/u })
							.evaluate((label) => {
								if (label.nextElementSibling) {
									label.nextElementSibling.textContent = '0';
								}
							});
					}
					await page.mouse.move(0, 0);
					await root.evaluate((element) => {
						if (element.ownerDocument.activeElement instanceof HTMLElement) {
							element.ownerDocument.activeElement.blur();
						}
					});
					const bounds = await root.boundingBox();
					if (!bounds) {
						throw new Error(`${framework}/${tab} has no visible bounds`);
					}
					expect(bounds.x).toBeGreaterThanOrEqual(0);
					expect(bounds.y).toBeGreaterThanOrEqual(0);
					expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
					expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
					const overflow = await root.evaluate((element) =>
						[
							element,
							...element.querySelectorAll<HTMLElement>(
								'.c15t-dev-tools__panel, .c15t-dev-tools__tabs, .c15t-dev-tools__content'
							),
						].some((item) => item.scrollWidth > item.clientWidth + 1)
					);
					expect(
						overflow,
						`${framework}/${tab} must not overflow horizontally`
					).toBe(false);
					const image = await root.screenshot({ animations: 'disabled' });
					await testInfo.attach(`${framework}-${tab}.png`, {
						body: image,
						contentType: 'image/png',
					});
					const dom = (await captureDomSnapshot(page, rootSelector))
						.replace(/c15t-dev-tools-\d+/gu, 'c15t-dev-tools-instance')
						.replace(/c15t-[0-9a-f]{8}\b/gu, 'c15t-anonymized-script');
					const a11y = await root.ariaSnapshot();
					const styles = await captureComputedStyleMap(page, rootSelector, '*');
					const reference = baseline.get(tab);
					if (!reference) {
						baseline.set(tab, { a11y, dom, image, styles });
						continue;
					}
					expect.soft(dom, `${framework}/${tab} DOM`).toBe(reference.dom);
					expect
						.soft(a11y, `${framework}/${tab} accessibility`)
						.toBe(reference.a11y);
					expect
						.soft(
							diffComputedStyleMap(reference.styles, styles),
							`${framework}/${tab} CSS`
						)
						.toEqual([]);
					expect
						.soft(
							image.equals(reference.image),
							`${framework}/${tab} pixels must match React; see attached images`
						)
						.toBe(true);
				}
			}
		});
	}
}
