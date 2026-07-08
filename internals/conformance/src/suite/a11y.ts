/**
 * Accessibility behavior conformance suite.
 *
 * Covers cross-framework dialog semantics, focus management, and keyboard
 * dismissal behavior for the consent banner/dialog flow.
 */

import { TEST_IDS } from '../contract/test-ids';
import type { MountResult, TestDriver } from '../driver';
import { conformanceTest, type SuiteApi } from './helpers';

const FOCUSABLE_SELECTOR = [
	'a[href]:not([disabled]):not([tabindex="-1"])',
	'button:not([disabled]):not([tabindex="-1"])',
	'textarea:not([disabled]):not([tabindex="-1"])',
	'input:not([disabled]):not([tabindex="-1"])',
	'select:not([disabled]):not([tabindex="-1"])',
	'[contenteditable]:not([tabindex="-1"])',
	'[tabindex]:not([tabindex="-1"])',
].join(',');

function ownerBody(mounted: MountResult): HTMLElement {
	return mounted.root.ownerDocument.body;
}

function byTestId(root: ParentNode, testId: string): HTMLElement | null {
	return root.querySelector(`[data-testid="${testId}"]`);
}

function hasRoleDialog(element: HTMLElement): boolean {
	return (
		element.getAttribute('role') === 'dialog' ||
		element.tagName.toLowerCase() === 'dialog'
	);
}

function getDialogElement(root: ParentNode): HTMLElement | null {
	const dialogRoot = byTestId(root, TEST_IDS.consentDialog.root);
	if (!dialogRoot) {
		return null;
	}
	if (hasRoleDialog(dialogRoot)) {
		return dialogRoot;
	}
	return dialogRoot.querySelector('[role="dialog"],dialog');
}

function hasAccessibleName(element: HTMLElement): boolean {
	const label = element.getAttribute('aria-label');
	const labelledBy = element.getAttribute('aria-labelledby');
	return Boolean(label?.trim() || labelledBy?.trim());
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
	return Array.from(
		container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
	).filter(
		(element) =>
			!element.closest('[hidden]') && element.style.display !== 'none'
	);
}

function keydown(
	target: Document | HTMLElement,
	key: string,
	options: KeyboardEventInit = {}
): void {
	target.dispatchEvent(
		new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key,
			...options,
		})
	);
}

async function wait(ms = 20): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForElement(
	root: ParentNode,
	testId: string
): Promise<HTMLElement> {
	const started = Date.now();
	while (Date.now() - started < 1000) {
		const element = byTestId(root, testId);
		if (element) {
			return element;
		}
		await wait(10);
	}
	throw new Error(`Timed out waiting for [data-testid="${testId}"]`);
}

async function waitForElementRemoved(
	root: ParentNode,
	testId: string
): Promise<void> {
	const started = Date.now();
	while (Date.now() - started < 1000) {
		if (!byTestId(root, testId)) {
			return;
		}
		await wait(10);
	}
	throw new Error(`Timed out waiting for [data-testid="${testId}"] removal`);
}

async function mountBanner(driver: TestDriver): Promise<MountResult> {
	return driver.mount({
		component: 'consent-banner',
		providerOptions: { trapFocus: true },
	});
}

export function runA11yConformance(driver: TestDriver, api: SuiteApi): void {
	api.describe(`[${driver.framework}] a11y`, () => {
		conformanceTest(
			api,
			'a11y banner card exposes dialog semantics when trapping',
			async () => {
				const mounted = await mountBanner(driver);
				try {
					const card = await waitForElement(
						ownerBody(mounted),
						TEST_IDS.consentBanner.card
					);
					api.expect(card.getAttribute('role')).toBe('dialog');
					api.expect(card.getAttribute('aria-modal')).toBe('true');
					api.expect(hasAccessibleName(card)).toBe(true);
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'a11y banner moves initial focus to the card on open',
			async () => {
				const mounted = await mountBanner(driver);
				try {
					const body = ownerBody(mounted);
					const card = await waitForElement(body, TEST_IDS.consentBanner.card);
					await wait(20);
					api.expect(body.ownerDocument.activeElement).toBe(card);
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(api, 'a11y banner focus trap wraps', async () => {
			const mounted = await mountBanner(driver);
			try {
				const body = ownerBody(mounted);
				const card = await waitForElement(body, TEST_IDS.consentBanner.card);
				await wait(20);

				const focusable = getFocusableElements(card);
				api.expect(focusable.length).toBeGreaterThanOrEqual(2);
				const first = focusable[0] as HTMLElement;
				const last = focusable[focusable.length - 1] as HTMLElement;

				last.focus();
				keydown(body.ownerDocument, 'Tab');
				api.expect(body.ownerDocument.activeElement).toBe(first);

				first.focus();
				keydown(body.ownerDocument, 'Tab', { shiftKey: true });
				api.expect(body.ownerDocument.activeElement).toBe(last);
			} finally {
				await mounted.unmount();
			}
		});

		conformanceTest(
			api,
			'a11y Shift+Tab from the focused banner card stays trapped',
			async () => {
				const mounted = await mountBanner(driver);
				try {
					const body = ownerBody(mounted);
					const card = await waitForElement(body, TEST_IDS.consentBanner.card);
					await wait(20);
					api.expect(body.ownerDocument.activeElement).toBe(card);

					// The element before the card in tab order is outside the
					// trap; Shift+Tab must wrap to the last focusable instead
					// of escaping behind the surface.
					const focusable = getFocusableElements(card);
					const last = focusable[focusable.length - 1];
					keydown(body.ownerDocument, 'Tab', { shiftKey: true });
					api.expect(body.ownerDocument.activeElement).toBe(last);
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'a11y Escape does not dismiss the banner',
			async () => {
				const mounted = await mountBanner(driver);
				try {
					const body = ownerBody(mounted);
					await waitForElement(body, TEST_IDS.consentBanner.root);
					keydown(body.ownerDocument, 'Escape');
					await wait(20);
					api
						.expect(byTestId(body, TEST_IDS.consentBanner.root))
						.not.toBeNull();
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(
			api,
			'a11y dialog opens with correct semantics',
			async () => {
				const mounted = await mountBanner(driver);
				try {
					const body = ownerBody(mounted);
					const customizeButton = await waitForElement(
						body,
						TEST_IDS.consentBanner.customizeButton
					);
					customizeButton.click();

					await waitForElement(body, TEST_IDS.consentDialog.root);
					const dialog = getDialogElement(body);
					api.expect(dialog).not.toBeNull();
					if (!dialog) return;

					api.expect(hasRoleDialog(dialog)).toBe(true);
					api.expect(dialog.getAttribute('aria-modal')).toBe('true');
					const labelledBy = dialog.getAttribute('aria-labelledby');
					api.expect(Boolean(labelledBy)).toBe(true);
					if (labelledBy) {
						api.expect(body.querySelector(`#${labelledBy}`)).not.toBeNull();
					}
					const overlay = byTestId(body, TEST_IDS.consentDialog.overlay);
					api.expect(overlay).not.toBeNull();
					api.expect(overlay?.getAttribute('role')).toBe('presentation');
				} finally {
					await mounted.unmount();
				}
			}
		);

		conformanceTest(api, 'a11y Escape dismisses the dialog', async () => {
			const mounted = await mountBanner(driver);
			try {
				const body = ownerBody(mounted);
				const customizeButton = await waitForElement(
					body,
					TEST_IDS.consentBanner.customizeButton
				);
				customizeButton.click();
				await waitForElement(body, TEST_IDS.consentDialog.root);
				const dialog = getDialogElement(body);
				api.expect(dialog).not.toBeNull();
				if (!dialog) return;

				keydown(dialog, 'Escape');
				await waitForElementRemoved(body, TEST_IDS.consentDialog.root);
			} finally {
				await mounted.unmount();
			}
		});

		conformanceTest(api, 'a11y dialog restores focus on Escape', async () => {
			const mounted = await mountBanner(driver);
			try {
				const body = ownerBody(mounted);
				const customizeButton = await waitForElement(
					body,
					TEST_IDS.consentBanner.customizeButton
				);
				customizeButton.focus();
				const returnTarget = body.ownerDocument.activeElement as HTMLElement;
				customizeButton.click();
				await waitForElement(body, TEST_IDS.consentDialog.root);
				const dialog = getDialogElement(body);
				api.expect(dialog).not.toBeNull();
				if (!dialog) return;

				keydown(dialog, 'Escape');
				await waitForElementRemoved(body, TEST_IDS.consentDialog.root);
				await wait(20);

				api
					.expect(body.ownerDocument.activeElement)
					.toBe(returnTarget.isConnected ? returnTarget : body);
			} finally {
				await mounted.unmount();
			}
		});
	});
}
