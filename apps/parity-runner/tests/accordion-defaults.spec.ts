import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { preprocessCSS, resolveConfig } from 'vite';
import type { PreprocessCSSResult } from 'vite';

const styles: Record<string, PreprocessCSSResult> = {};

test.beforeAll(async () => {
	const config = await resolveConfig(
		{
			configFile: false,
			css: { postcss: { plugins: [] } },
			logLevel: 'silent',
		},
		'build'
	);
	await Promise.all(
		['primitives', 'components'].map(async (kind) => {
			const filename = fileURLToPath(
				new URL(
					`../../../packages/ui/src/styles/${kind}/accordion.module.css`,
					import.meta.url
				)
			);
			styles[kind] = await preprocessCSS(
				await readFile(filename, 'utf8'),
				filename,
				config
			);
		})
	);
});

const mount = async (page: Page, order: string[]) => {
	const primitive = styles.primitives?.modules;
	const component = styles.components?.modules;
	if (!(primitive && component)) {
		throw new Error('Both accordion CSS modules must compile');
	}
	await page.setContent(`
		<style>
			:root { --c15t-space-sm: 8px; --c15t-space-md: 16px;
				--c15t-text-muted: rgb(102, 102, 102); --c15t-primary: blue;
				--c15t-duration-normal: 0s; --c15t-easing: ease; }
		</style>
		${order.map((kind) => `<style>${styles[kind]?.code}</style>`).join('')}
		<section id="scope">
			<div id="primitive" class="${primitive.item}">
				<button id="primitive-button" class="${primitive.triggerInner}">Primitive</button>
				<div id="primitive-description" class="${primitive.contentInner}">Description</div>
			</div>
			<div id="component" class="${component.item}">
				<div id="component-row" class="${component.triggerRow}">
					<button id="component-button" class="${component.trigger}">Consent category</button>
				</div>
				<div id="component-description" class="${component.content}" data-state="open">Description</div>
			</div>
		</section>
	`);
};

for (const order of [
	['primitives', 'components'],
	['components', 'primitives'],
]) {
	test(`accordion defaults are independent of import order: ${order.join(',')}`, async ({
		page,
	}) => {
		await mount(page, order);
		await expect(page.locator('#primitive')).toHaveCSS('padding-top', '16px');
		await expect(page.locator('#component-row')).toHaveCSS(
			'padding-top',
			'8px'
		);
		await expect(page.locator('#component-description')).toHaveCSS(
			'color',
			'rgb(92, 92, 92)'
		);
		await expect(page.locator('#primitive-description')).toHaveCSS(
			'color',
			'rgb(102, 102, 102)'
		);
		await page.locator('#scope').evaluate((element) => {
			element.classList.add('c15t-dark');
		});
		await expect(page.locator('#component-description')).toHaveCSS(
			'color',
			'rgb(153, 153, 153)'
		);
		await expect(page.locator('#primitive-description')).toHaveCSS(
			'color',
			'rgb(102, 102, 102)'
		);
	});

	test(`accordion defaults resolve scoped theme tokens: ${order.join(',')}`, async ({
		page,
	}) => {
		await mount(page, order);
		await page.locator('#scope').evaluate((element) => {
			element.style.setProperty('--c15t-space-sm', '12px');
			element.style.setProperty('--c15t-space-md', '24px');
			element.style.setProperty('--c15t-text-muted', 'rgb(10, 20, 30)');
		});
		await expect(page.locator('#primitive')).toHaveCSS('padding-top', '24px');
		await expect(page.locator('#component-row')).toHaveCSS(
			'padding-top',
			'12px'
		);
		await expect(page.locator('#primitive-description')).toHaveCSS(
			'color',
			'rgb(10, 20, 30)'
		);
	});

	test(`accordion host overrides remain inherited: ${order.join(',')}`, async ({
		page,
	}) => {
		await mount(page, order);
		await page.evaluate(() => {
			document.documentElement.style.setProperty('--accordion-padding', '20px');
		});
		await expect(page.locator('#primitive')).toHaveCSS('padding-top', '20px');
		await expect(page.locator('#component-row')).toHaveCSS(
			'padding-top',
			'20px'
		);
		await page.locator('#scope').evaluate((element) => {
			element.style.setProperty('--accordion-padding', '28px');
			element.style.setProperty('--accordion-focus-ring', 'rgb(12, 34, 56)');
			element.style.setProperty(
				'--accordion-focus-ring-dark',
				'rgb(65, 43, 21)'
			);
		});
		await expect(page.locator('#primitive')).toHaveCSS('padding-top', '28px');
		await expect(page.locator('#component-row')).toHaveCSS(
			'padding-top',
			'28px'
		);
		await page.locator('#primitive-button').focus();
		await expect(page.locator('#primitive')).toHaveCSS(
			'box-shadow',
			'rgb(12, 34, 56) 0px 0px 0px 2px'
		);
		await page.locator('#component-button').focus();
		await expect(page.locator('#component')).toHaveCSS(
			'outline-color',
			'rgb(12, 34, 56)'
		);
		await page
			.locator('#scope')
			.evaluate((element) => element.classList.add('c15t-dark'));
		await page.locator('#primitive-button').focus();
		await expect(page.locator('#primitive')).toHaveCSS(
			'box-shadow',
			'rgb(65, 43, 21) 0px 0px 0px 2px'
		);
		await page.locator('#component-button').focus();
		await expect(page.locator('#component')).toHaveCSS(
			'outline-color',
			'rgb(65, 43, 21)'
		);
		await page.locator('#primitive').evaluate((element) => {
			element.style.setProperty(
				'--accordion-focus-shadow-dark',
				'0 0 0 3px rgb(1, 2, 3)'
			);
		});
		await page.locator('#primitive-button').focus();
		await expect(page.locator('#primitive')).toHaveCSS(
			'box-shadow',
			'rgb(1, 2, 3) 0px 0px 0px 3px'
		);
	});
}
