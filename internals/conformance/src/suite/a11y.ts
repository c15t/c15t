/**
 * Accessibility behavior conformance suite.
 *
 * Covers cross-framework dialog semantics, focus management, and keyboard
 * dismissal behavior for the consent banner/dialog flow.
 */

import { TEST_IDS } from '../contract/test-ids';
import type { MountResult, TestDriver } from '../driver';
import { conformanceTest } from './helpers';
import type { SuiteApi } from './helpers';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

const FOCUSABLE_SELECTOR = [
	'a[href]:not([disabled]):not([tabindex="-1"])',
	'button:not([disabled]):not([tabindex="-1"])',
	'textarea:not([disabled]):not([tabindex="-1"])',
	'input:not([disabled]):not([tabindex="-1"])',
	'select:not([disabled]):not([tabindex="-1"])',
	'[contenteditable]:not([tabindex="-1"])',
	'[tabindex]:not([tabindex="-1"])',
].join(',');

const ownerBody = function ownerBody(mounted: MountResult): HTMLElement {
	return mounted.root.ownerDocument.body;
};

const byTestId = function byTestId(
	root: ParentNode,
	testId: string
): HTMLElement | null {
	return root.querySelector(`[data-testid="${testId}"]`);
};

const hasRoleDialog = function hasRoleDialog(element: HTMLElement): boolean {
	return (
		element.getAttribute('role') === 'dialog' ||
		element.tagName.toLowerCase() === 'dialog'
	);
};

const getDialogElement = function getDialogElement(
	root: ParentNode
): HTMLElement | null {
	const dialogRoot = byTestId(root, TEST_IDS.consentDialog.root);
	if (!dialogRoot) {
		return null;
	}
	if (hasRoleDialog(dialogRoot)) {
		return dialogRoot;
	}
	return dialogRoot.querySelector('[role="dialog"],dialog');
};

const hasAccessibleName = function hasAccessibleName(
	element: HTMLElement
): boolean {
	const label = element.getAttribute('aria-label');
	const labelledBy = element.getAttribute('aria-labelledby');
	return Boolean(label?.trim() || labelledBy?.trim());
};

const getFocusableElements = function getFocusableElements(
	container: HTMLElement
): HTMLElement[] {
	return Array.from(
		container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
	).filter(
		(element) =>
			!element.closest('[hidden]') && element.style.display !== 'none'
	);
};

const keydown = function keydown(
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
};

const wait = async function wait(ms = 20): Promise<void> {
	await createDeferredPromise((resolve) => setTimeout(resolve, ms));
};

const waitForElement = async function waitForElement(
	root: ParentNode,
	testId: string
): Promise<HTMLElement> {
	const started = Date.now();
	// A loaded CI runner can take well over a second to mount the dialog's
	// lazy chunk on first use; the budget only bounds a genuine failure.
	while (Date.now() - started < 5000) {
		const element = byTestId(root, testId);
		if (element) {
			return element;
		}
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await wait(10);
	}
	throw new Error(`Timed out waiting for [data-testid="${testId}"]`);
};

const waitForElementRemoved = async function waitForElementRemoved(
	root: ParentNode,
	testId: string
): Promise<void> {
	const started = Date.now();
	while (Date.now() - started < 1000) {
		if (!byTestId(root, testId)) {
			return;
		}
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await wait(10);
	}
	throw new Error(`Timed out waiting for [data-testid="${testId}"] removal`);
};

/**
 * Polls until `document.activeElement` satisfies `predicate`, then returns it.
 * Focus moves asynchronously (setTimeout/rAF in the trap), so a fixed sleep is
 * flaky on slow CI — poll instead, matching `assertInitialFocus` in focus.ts.
 */
const waitForActiveElement = async function waitForActiveElement(
	doc: Document,
	predicate: (active: Element | null) => boolean
): Promise<Element | null> {
	const started = Date.now();
	while (Date.now() - started < 1000) {
		if (predicate(doc.activeElement)) {
			return doc.activeElement;
		}
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await wait(10);
	}
	return doc.activeElement;
};

const mountBanner = function mountBanner(
	driver: TestDriver
): Promise<MountResult> {
	return driver.mount({
		component: 'consent-banner',
		providerOptions: { trapFocus: true },
	});
};

export const runA11yConformance = function runA11yConformance(
	driver: TestDriver,
	api: SuiteApi
): void {
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
					const active = await waitForActiveElement(
						body.ownerDocument,
						(el) => el === card
					);
					api.expect(active).toBe(card);
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
				await waitForActiveElement(body.ownerDocument, (el) => el === card);

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
					const active = await waitForActiveElement(
						body.ownerDocument,
						(el) => el === card
					);
					api.expect(active).toBe(card);

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
					if (!dialog) {
						return;
					}

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
				if (!dialog) {
					return;
				}

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
				if (!dialog) {
					return;
				}

				keydown(dialog, 'Escape');
				await waitForElementRemoved(body, TEST_IDS.consentDialog.root);

				// Focus restore runs on a deferred (setTimeout 0) tick; poll for
				// the expected target rather than a fixed sleep.
				const expected = returnTarget.isConnected
					? returnTarget
					: body.ownerDocument.body;
				const active = await waitForActiveElement(
					body.ownerDocument,
					(el) => el === expected
				);
				api.expect(active).toBe(expected);
			} finally {
				await mounted.unmount();
			}
		});
	});
};
