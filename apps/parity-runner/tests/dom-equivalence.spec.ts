import { expect, test } from '@playwright/test';

import { captureComputedStyleMap } from '../src/diff-computed-style';
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

test('dialog layout wrappers normalize without dropping substantive content or attributes', async ({
	page,
}) => {
	const card =
		'<div data-testid="consent-dialog-card"><button data-testid="save">Save</button></div>';
	const attributes =
		'data-testid="consent-dialog-root" aria-label="Privacy" aria-modal="true" tabindex="-1"';
	await page.setContent(
		`<dialog open class="root dialogVisible" ${attributes}><div class="container contentVisible">${card}</div></dialog>`
	);
	const native = await captureDomSnapshot(page, 'body');
	await page.setContent(
		`<div data-slot="dialog-positioner"><div role="dialog" data-slot="dialog-content" data-state="open" class="container contentVisible" ${attributes}>${card.replace('data-testid="consent-dialog-card"', 'data-testid="consent-dialog-card" tabindex="-1"')}</div></div>`
	);
	expect(await captureDomSnapshot(page, 'body')).toBe(native);
	await page.setContent(
		`<div role="dialog" class="root" ${attributes}><div class="container" role="group">${card}</div></div>`
	);
	expect(await captureDomSnapshot(page, 'body')).not.toBe(native);
	await page.setContent(
		`<div role="dialog" class="root" ${attributes}><div class="container extra-layout">${card}</div></div>`
	);
	expect(await captureDomSnapshot(page, 'body')).not.toBe(native);
	await page.setContent(
		`<div role="dialog" class="root" ${attributes}><div class="container">Important warning${card}</div></div>`
	);
	expect(await captureDomSnapshot(page, 'body')).not.toBe(native);
});

test('branding content wrappers and hidden icon metadata preserve rendered geometry', async ({
	page,
}) => {
	const icon =
		'<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>';
	const content = `<span>Secured by</span>${icon}`;
	const fixture = (children: string) =>
		`<style>a,.brandingContent{display:inline-flex;gap:6px;align-items:center}svg{width:16px;height:16px}</style><a data-testid="consent-banner-branding" href="/">${children}</a>`;
	await page.setContent(
		fixture(
			`<span class="brandingContent" data-slot="tag-content">${content}</span>`
		)
	);
	const wrapped = await captureDomSnapshot(page, 'body');
	await page.setContent(
		fixture(
			content
				.replace(
					'<svg ',
					'<svg class="c15t-icon" aria-labelledby="icon-label" '
				)
				.replace('<path ', '<title id="icon-label">Logo</title><path ')
		)
	);
	expect(await captureDomSnapshot(page, 'body')).toBe(wrapped);
	await page.locator('svg').evaluate((svg) => {
		svg.style.transform = 'translateX(2px)';
	});
	expect(await captureDomSnapshot(page, 'body')).not.toBe(wrapped);
	await page.setContent(
		fixture(
			`Important text<span class="brandingContent" data-slot="tag-content">${content}</span>`
		)
	);
	expect(await captureDomSnapshot(page, 'body')).not.toBe(wrapped);
	await page.setContent(
		fixture(
			`<span role="group" class="brandingContent" data-slot="tag-content">${content}</span>`
		)
	);
	expect(await captureDomSnapshot(page, 'body')).not.toBe(wrapped);
});

test('switch size classes and data attributes agree while state and thumb styling remain checked', async ({
	page,
}) => {
	const fixture = (variants: boolean) =>
		`<button role="switch" data-testid="consent-widget-switch-necessary" disabled aria-checked="true" class="root${variants ? ' root-small' : ''}" ${variants ? '' : 'data-size="small"'}><span data-slot="switch-track" class="track${variants ? ' track-small track-disabled' : ''}"><span data-slot="switch-thumb" class="thumb${variants ? ' thumb-small thumb-disabled' : ''}"></span></span></button>`;
	await page.setContent(fixture(false));
	const attributes = await captureDomSnapshot(page, 'body');
	const styles = await captureComputedStyleMap(page, 'body');
	await page.setContent(fixture(true));
	expect(await captureDomSnapshot(page, 'body')).toBe(attributes);
	expect(await captureComputedStyleMap(page, 'body')).toEqual(styles);
	await page
		.locator('[role="switch"]')
		.evaluate((toggle) => toggle.setAttribute('aria-checked', 'false'));
	expect(await captureDomSnapshot(page, 'body')).not.toBe(attributes);
	await page
		.locator('[data-slot="switch-thumb"]')
		.evaluate((thumb: HTMLElement) => {
			thumb.style.backgroundColor = 'red';
		});
	expect(await captureComputedStyleMap(page, 'body')).not.toEqual(styles);
});

test('generated ID references resolve to their actual contract targets', async ({
	page,
}) => {
	const fixture = (suffix: string) =>
		`<div data-testid="widget"><button data-testid="trigger" aria-controls="content-${suffix}">Open</button><div data-testid="content" id="content-${suffix}">Choices</div><div data-testid="other" id="other-${suffix}">Other choices</div></div>`;
	await page.setContent(fixture('react'));
	const baseline = await captureDomSnapshot(page, 'body');
	await page.setContent(fixture('vue'));
	expect(await captureDomSnapshot(page, 'body')).toBe(baseline);
	await page
		.locator('button')
		.evaluate((button) => button.setAttribute('aria-controls', 'other-vue'));
	expect(await captureDomSnapshot(page, 'body')).not.toBe(baseline);
});

test('fixed trigger placement compares rendered bounds and still checks z-index', async ({
	page,
}) => {
	const fixture = (attributes: string) =>
		`<style>.trigger{position:fixed;width:40px;height:40px;right:20px;bottom:20px;z-index:9999}</style><button data-testid="consent-dialog-trigger" ${attributes}>Privacy</button>`;
	await page.setContent(fixture('class="trigger md bottomRight"'));
	const baseline = await captureDomSnapshot(page, 'body');
	const styles = await captureComputedStyleMap(page, 'body');
	const position = await page.locator('button').boundingBox();
	if (!position) {
		throw new Error('Missing trigger');
	}
	await page.setContent(
		fixture(
			`class="trigger" data-size="md" style="position:fixed;left:${position.x}px;top:${position.y}px;z-index:9999;transform:none"`
		)
	);
	expect(await captureDomSnapshot(page, 'body')).toBe(baseline);
	expect(await captureComputedStyleMap(page, 'body')).toEqual(styles);
	await page.locator('button').evaluate((button) => {
		button.style.left = '100px';
	});
	expect(await captureDomSnapshot(page, 'body')).not.toBe(baseline);
	await page.locator('button').evaluate((button) => {
		button.style.zIndex = '1';
	});
	expect(await captureComputedStyleMap(page, 'body')).not.toEqual(styles);
});

test('hidden SVG metadata follows its ancestor while paint changes remain visible', async ({
	page,
}) => {
	const fixture = (attributes: string) =>
		`<span data-testid="icon" aria-hidden="true"><svg viewBox="0 0 24 24" ${attributes}><path d="M5 12h14"/></svg></span>`;
	await page.setContent(fixture(''));
	const inherited = await captureDomSnapshot(page, 'body');
	await page.setContent(fixture('aria-hidden="true"'));
	expect(await captureDomSnapshot(page, 'body')).toBe(inherited);
	await page.addStyleTag({ content: 'svg path { fill: red; }' });
	expect(await captureDomSnapshot(page, 'body')).not.toBe(inherited);
});
