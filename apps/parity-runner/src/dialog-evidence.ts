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
		// Untagged wrappers still affect every descendant's rendered opacity.
		let effectiveOpacity = 1;
		for (let node: HTMLElement | null = card; node; node = node.parentElement) {
			effectiveOpacity *= Number(getComputedStyle(node).opacity);
		}
		const focused = document.activeElement;
		const captureFocus = () => {
			if (!focused) {
				return null;
			}
			const focusAnchor = focused.closest('[data-testid]');
			const focusPath: number[] = [];
			for (
				let node = focused;
				node && node !== focusAnchor && node.parentElement;
				node = node.parentElement
			) {
				focusPath.unshift([...node.parentElement.children].indexOf(node));
			}
			const focusReferencedText = (attribute: string) =>
				(focused?.getAttribute(attribute) ?? '')
					.split(/\s+/u)
					.filter(Boolean)
					.map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
					.join(' ')
					.replace(/\s+/gu, ' ');
			const getFocusedRole = () => {
				const explicitRole = focused.getAttribute('role');
				if (explicitRole) {
					return explicitRole;
				}
				if (focused.tagName === 'DIALOG') {
					return 'dialog';
				}
				if (focused.tagName === 'BUTTON') {
					return 'button';
				}
				if (focused.tagName === 'A' && focused.hasAttribute('href')) {
					return 'link';
				}
				return focused.tagName.toLowerCase();
			};
			const focusedRole = getFocusedRole();
			return {
				anchor: focusAnchor?.getAttribute('data-testid') ?? null,
				controls: (focused.getAttribute('aria-controls') ?? '')
					.split(/\s+/u)
					.filter(Boolean)
					.map((id) => {
						const target = document.getElementById(id);
						return (
							target?.getAttribute('data-testid') ??
							target?.textContent?.trim() ??
							null
						);
					}),
				name:
					focused.getAttribute('aria-label') ??
					(focusReferencedText('aria-labelledby') ||
						(['button', 'link'].includes(focusedRole ?? '')
							? (focused.textContent?.trim().replace(/\s+/gu, ' ') ?? '')
							: '')),
				path: focusPath,
				role: focusedRole,
			};
		};
		return {
			cardBounds: rect(card),
			description: referencedText('aria-describedby'),
			effectiveOpacity,
			focus:
				focused?.closest('[data-testid]')?.getAttribute('data-testid') ?? null,
			focusDetails: captureFocus(),
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
