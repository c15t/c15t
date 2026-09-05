import { expect, test } from '@playwright/test';

import { captureDialogEvidence } from '../src/dialog-evidence';
import { captureComputedStyleMap } from '../src/diff-computed-style';

const fixture = (native: boolean) => {
	const content =
		'<div data-testid="consent-dialog-card"><h2 id="title">Privacy preferences</h2><p id="description">Choose categories.</p><button data-testid="save">Save</button></div>';
	const semantics =
		'data-testid="consent-dialog-root" aria-modal="true" aria-labelledby="title" aria-describedby="description" tabindex="-1"';
	return `<style>body,h2{margin:0}.shell{background:none;position:fixed;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;display:flex;align-items:center;justify-content:center}[data-testid="consent-dialog-card"]{box-sizing:border-box;width:400px;height:200px}</style>${native ? `<dialog open class="shell" ${semantics}>${content}</dialog>` : `<div data-slot="dialog-positioner" class="shell"><div role="dialog" ${semantics}>${content}</div></div>`}`;
};

test('native and positioned dialogs preserve the same visible and accessible contract', async ({
	page,
}) => {
	await page.setContent(fixture(true));
	await page.locator('[data-testid="consent-dialog-root"]').focus();
	const native = await captureDialogEvidence(page);
	const nativeShell = (await captureComputedStyleMap(page, 'body'))[
		'consent-dialog-root'
	];
	await page.setContent(fixture(false));
	await page.locator('[data-testid="consent-dialog-root"]').focus();
	expect(await captureDialogEvidence(page)).toEqual(native);
	expect(
		(await captureComputedStyleMap(page, 'body'))['consent-dialog-root']
	).toEqual(nativeShell);
	expect(native).toMatchObject({
		description: 'Choose categories.',
		focus: 'consent-dialog-root',
		modal: 'true',
		name: 'Privacy preferences',
		role: 'dialog',
		visible: true,
	});
});

for (const mutation of [
	'role',
	'name',
	'description',
	'focus',
	'visibility',
	'card geometry',
	'shell geometry',
	'modal',
] as const) {
	test(`dialog evidence detects incorrect ${mutation}`, async ({ page }) => {
		await page.setContent(fixture(false));
		await page.locator('[data-testid="consent-dialog-root"]').focus();
		const before = await captureDialogEvidence(page);
		await page.evaluate((change) => {
			const dialog = document.querySelector<HTMLElement>(
				'[data-testid="consent-dialog-root"]'
			);
			const card = dialog?.querySelector<HTMLElement>(
				'[data-testid="consent-dialog-card"]'
			);
			const shell = dialog?.parentElement;
			if (!dialog || !card || !shell) {
				throw new Error('Dialog fixture incomplete');
			}
			switch (change) {
				case 'role':
					dialog.setAttribute('role', 'region');
					break;
				case 'name':
					dialog.setAttribute('aria-labelledby', 'missing');
					break;
				case 'description':
					dialog.setAttribute('aria-describedby', 'missing');
					break;
				case 'focus':
					document.querySelector('button')?.focus();
					break;
				case 'visibility':
					dialog.style.display = 'none';
					break;
				case 'card geometry':
					card.style.width = '350px';
					break;
				case 'shell geometry':
					shell.style.width = '90%';
					break;
				case 'modal':
					dialog.setAttribute('aria-modal', 'false');
					break;
				default:
					throw new Error('Unknown mutation');
			}
		}, mutation);
		expect(await captureDialogEvidence(page)).not.toEqual(before);
	});
}
