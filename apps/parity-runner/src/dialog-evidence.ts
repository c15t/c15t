import type { Page } from '@playwright/test';

/** Capture dialog semantics independently of each framework's positioned shell. */
export const captureDialogEvidence = (page: Page) =>
	page.evaluate(() => {
		const dialog = document.querySelector<HTMLElement>(
			'[data-testid="consent-dialog-root"]'
		);
		if (!dialog) {
			return null;
		}
		const card = dialog.querySelector<HTMLElement>(
			'[data-testid="consent-dialog-card"]'
		);
		if (!card) {
			throw new Error('Dialog card missing');
		}
		const shell =
			dialog.closest<HTMLElement>('[data-slot="dialog-positioner"]') ?? dialog;
		const referencedText = (attribute: string) =>
			(dialog.getAttribute(attribute) ?? '')
				.split(/\s+/u)
				.filter(Boolean)
				.map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
				.join(' ')
				.replace(/\s+/gu, ' ');
		const rect = (element: HTMLElement) => {
			const { height, width, x, y } = element.getBoundingClientRect();
			return { height, width, x, y };
		};
		const visible = (element: HTMLElement) => {
			for (
				let node: HTMLElement | null = element;
				node;
				node = node.parentElement
			) {
				const style = getComputedStyle(node);
				if (
					node.hidden ||
					style.display === 'none' ||
					style.visibility === 'hidden' ||
					style.visibility === 'collapse' ||
					Number(style.opacity) === 0
				) {
					return false;
				}
			}
			const bounds = element.getBoundingClientRect();
			return bounds.width > 0 && bounds.height > 0;
		};
		const focused = document.activeElement;
		return {
			cardBounds: rect(card),
			description: referencedText('aria-describedby'),
			focus:
				focused?.closest('[data-testid]')?.getAttribute('data-testid') ?? null,
			modal: dialog.getAttribute('aria-modal'),
			name:
				dialog.getAttribute('aria-label') ?? referencedText('aria-labelledby'),
			role:
				dialog.getAttribute('role') ??
				(dialog.tagName === 'DIALOG' ? 'dialog' : null),
			shellBounds: rect(shell),
			visible: visible(card),
		};
	});
