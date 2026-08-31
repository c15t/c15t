/**
 * E2E tests for activeUI state transitions.
 *
 * Tests that UI visibility is driven by the `activeUI` enum
 * and transitions correctly between 'none', 'banner', and 'dialog'.
 *
 * @packageDocumentation
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { createVoidDeferredPromise } from '~/__tests__/deferred-promise';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
import {
	ConsentDialogTrigger,
	ConsentDialogTriggerToolbar,
} from '~/components/consent-dialog-trigger';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/types/consent-manager';

const getDefined = <Value,>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			Reflect.deleteProperty(store, key);
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

const defaultOptions: ConsentManagerOptions = {
	mode: 'offline',
};

function queryRequiredElement(selector: string): HTMLElement {
	const element = document.querySelector<HTMLElement>(selector);
	if (!element) {
		throw new Error(`Expected element matching ${selector}`);
	}
	return element;
}

describe('activeUI Transitions E2E Tests', () => {
	beforeEach(() => {
		window.localStorage.clear();
		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const name = cookie.split('=')[0]?.trim();
			if (name) {
				document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
			}
		}
		vi.clearAllMocks();
		clearConsentRuntimeCache();
	});

	test('banner shows on first visit (activeUI becomes banner)', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
			</ConsentManagerProvider>
		);

		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	test('customize transitions banner → dialog', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
			</ConsentManagerProvider>
		);

		// Wait for banner
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Click customize
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		await userEvent.click(getDefined(customizeButton));

		// Dialog should open
		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Banner should be gone
		const banner = document.querySelector(
			'[data-testid="consent-banner-root"]'
		);
		expect(banner).not.toBeInTheDocument();
	});

	test('save from dialog hides all UI', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
			</ConsentManagerProvider>
		);

		// Wait for banner, then click customize
		await vi.waitFor(
			() => {
				const btn = document.querySelector(
					'[data-testid="consent-banner-customize-button"]'
				);
				expect(btn).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		await userEvent.click(getDefined(customizeButton));

		// Wait for dialog
		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Click save in dialog
		const saveButton = document.querySelector(
			'[data-testid="consent-widget-footer-save-button"]'
		);
		await userEvent.click(getDefined(saveButton));

		// Both banner and dialog should be gone
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(banner).not.toBeInTheDocument();
				expect(dialog).not.toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	test('banner hidden for returning visitor', async () => {
		// Pre-set localStorage consent
		const consentData = {
			consents: {
				necessary: true,
				functionality: true,
				marketing: true,
				measurement: true,
				experience: true,
			},
			consentInfo: {
				time: Date.now(),
				type: 'accept-all',
			},
		};
		window.localStorage.setItem('c15t', JSON.stringify(consentData));

		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
			</ConsentManagerProvider>
		);

		// Wait long enough to confirm banner doesn't appear
		await createVoidDeferredPromise((resolve) => setTimeout(resolve, 500));

		const banner = document.querySelector(
			'[data-testid="consent-banner-root"]'
		);
		expect(banner).not.toBeInTheDocument();
	});

	test('trigger appears after consent, opens dialog on click', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
				<ConsentDialogTrigger showWhen="always" />
			</ConsentManagerProvider>
		);

		// Wait for banner
		await vi.waitFor(
			() => {
				const btn = document.querySelector(
					'[data-testid="consent-banner-accept-button"]'
				);
				expect(btn).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Accept all
		const acceptButton = document.querySelector(
			'[data-testid="consent-banner-accept-button"]'
		);
		await userEvent.click(getDefined(acceptButton));

		// Banner should disappear
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).not.toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Trigger should appear
		await vi.waitFor(
			() => {
				const trigger = document.querySelector(
					'button[aria-label="Open privacy settings"]'
				);
				expect(trigger).toBeInTheDocument();
				expect(
					document.querySelector(
						'[role="toolbar"][aria-label="Privacy controls"]'
					)
				).not.toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Click trigger — dialog should open
		const trigger = document.querySelector(
			'button[aria-label="Open privacy settings"]'
		);
		await userEvent.click(getDefined(trigger));

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	test.each([
		['horizontal', 'bottom-right', '{ArrowRight}', -1],
		['horizontal', 'top-left', '{ArrowRight}', 0],
		['vertical', 'bottom-right', '{ArrowDown}', -1],
		['vertical', 'top-left', '{ArrowDown}', 0],
	] as const)(
		'trigger %s toolbar at %s runs custom actions and opens preferences',
		async (orientation, defaultPosition, navigationKey, preferencesIndex) => {
			const openSupport = vi.fn();

			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentBanner />
					<ConsentDialog />
					<ConsentDialogTriggerToolbar
						showWhen="always"
						ariaLabel="Site controls"
						defaultPosition={defaultPosition}
						orientation={orientation}
						actions={[
							{
								id: 'theme',
								label: 'Toggle color scheme',
								icon: <span data-testid="theme-icon" />,
								onSelect: vi.fn(),
							},
							{
								id: 'support',
								label: 'Open support chat',
								icon: <span />,
								onSelect: openSupport,
							},
						]}
					/>
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					expect(
						document.querySelector(
							'[data-testid="consent-banner-accept-button"]'
						)
					).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			await userEvent.click(
				queryRequiredElement('[data-testid="consent-banner-accept-button"]')
			);

			await vi.waitFor(
				() => {
					expect(
						document.querySelector(
							`[role="toolbar"][aria-label="Site controls"][aria-orientation="${orientation}"]`
						)
					).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const toolbarButtons = Array.from(
				queryRequiredElement(
					'[role="toolbar"][aria-label="Site controls"]'
				).querySelectorAll('button')
			);
			expect(toolbarButtons.at(preferencesIndex)).toHaveAttribute(
				'aria-label',
				'Open privacy settings'
			);

			expect(
				document.querySelector('[data-testid="theme-icon"]')
			).toBeInTheDocument();
			const privacyButton = queryRequiredElement(
				'button[aria-label="Open privacy settings"]'
			);
			const themeButton = queryRequiredElement(
				'button[aria-label="Toggle color scheme"]'
			);
			privacyButton.focus();
			await userEvent.keyboard(navigationKey);
			expect(themeButton).toHaveFocus();

			await userEvent.click(
				queryRequiredElement('button[aria-label="Open support chat"]')
			);
			expect(openSupport).toHaveBeenCalledOnce();
			expect(
				document.querySelector('[data-testid="consent-dialog-root"]')
			).not.toBeInTheDocument();

			await userEvent.click(privacyButton);

			await vi.waitFor(
				() => {
					expect(
						document.querySelector('[data-testid="consent-dialog-root"]')
					).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		}
	);

	test('full lifecycle: banner → customize → dialog → save → trigger → dialog', async () => {
		render(
			<ConsentManagerProvider options={defaultOptions}>
				<ConsentBanner />
				<ConsentDialog />
				<ConsentDialogTrigger showWhen="always" />
			</ConsentManagerProvider>
		);

		// Step 1: Banner appears
		await vi.waitFor(
			() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 2: Click customize → transitions to dialog
		const customizeButton = document.querySelector(
			'[data-testid="consent-banner-customize-button"]'
		);
		await userEvent.click(getDefined(customizeButton));

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 3: Save from dialog → hides everything
		const saveButton = document.querySelector(
			'[data-testid="consent-widget-footer-save-button"]'
		);
		await userEvent.click(getDefined(saveButton));

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).not.toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 4: Trigger appears
		await vi.waitFor(
			() => {
				const trigger = document.querySelector(
					'button[aria-label="Open privacy settings"]'
				);
				expect(trigger).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 5: Click trigger → dialog opens again
		const trigger = document.querySelector(
			'button[aria-label="Open privacy settings"]'
		);
		await userEvent.click(getDefined(trigger));

		await vi.waitFor(
			() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});
