import { expect, test } from '@playwright/test';

import { captureDomSnapshot } from '../src/diff-dom';

test('native headings and explicit heading roles agree while wrong levels fail', async ({
	page,
}) => {
	await page.setContent('<h2 data-testid="title">Privacy</h2>');
	const native = await captureDomSnapshot(page, 'body');
	await page.setContent(
		'<div role="heading" aria-level="2" data-testid="title">Privacy</div>'
	);
	expect(await captureDomSnapshot(page, 'body')).toBe(native);
	await page
		.locator('[data-testid="title"]')
		.evaluate((title) => title.setAttribute('aria-level', '3'));
	expect(await captureDomSnapshot(page, 'body')).not.toBe(native);
});

test('SVG intrinsic and CSS dimensions agree only at the same rendered size', async ({
	page,
}) => {
	const fixture = (attributes: string) =>
		`<style>svg{width:16px;height:16px}</style><span data-testid="icon"><svg ${attributes} viewBox="0 0 24 24"><path d="M5 12h14"/></svg></span>`;
	await page.setContent(fixture('xmlns="http://www.w3.org/2000/svg"'));
	const css = await captureDomSnapshot(page, 'body');
	await page.setContent(fixture('width="16" height="16"'));
	expect(await captureDomSnapshot(page, 'body')).toBe(css);
	await page.locator('svg').evaluate((svg) => (svg.style.width = '24px'));
	expect(await captureDomSnapshot(page, 'body')).not.toBe(css);
	await page.setContent(fixture('width="16" height="16"'));
	await page
		.locator('path')
		.evaluate((path) => path.setAttribute('d', 'M12 5v14'));
	expect(await captureDomSnapshot(page, 'body')).not.toBe(css);
});
