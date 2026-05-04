/**
 * E2E tests for the complete consent flow.
 *
 * Tests the full user journey from first visit through consent management.
 *
 * @packageDocumentation
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/types/consent-manager';
import { ConsentBanner } from '~/v3/components/consent-banner';
import { ConsentDialog } from '~/v3/components/consent-dialog';
import { ConsentDialogTrigger } from '~/v3/components/consent-dialog-trigger';
import { ConsentWidget } from '~/v3/components/consent-widget';

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
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

describe('Consent Flow E2E Tests', () => {
	beforeEach(() => {
		window.localStorage.clear();
		// Clear cookies
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

	describe('First Visit Flow', () => {
		test('should show cookie banner to first-time visitor', async () => {
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

		test('should hide banner after accepting all', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentBanner />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const acceptButton = document.querySelector(
						'[data-testid="consent-banner-accept-button"]'
					);
					expect(acceptButton).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const acceptButton = document.querySelector(
				'[data-testid="consent-banner-accept-button"]'
			);
			await userEvent.click(acceptButton!);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="consent-banner-root"]'
					);
					expect(banner).not.toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should hide banner after rejecting all', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentBanner />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const rejectButton = document.querySelector(
						'[data-testid="consent-banner-reject-button"]'
					);
					expect(rejectButton).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const rejectButton = document.querySelector(
				'[data-testid="consent-banner-reject-button"]'
			);
			await userEvent.click(rejectButton!);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="consent-banner-root"]'
					);
					expect(banner).not.toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Consent Persistence', () => {
		test('should persist consent to localStorage on accept', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentBanner />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const acceptButton = document.querySelector(
						'[data-testid="consent-banner-accept-button"]'
					);
					expect(acceptButton).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const acceptButton = document.querySelector(
				'[data-testid="consent-banner-accept-button"]'
			);
			await userEvent.click(acceptButton!);

			await vi.waitFor(
				() => {
					const stored = window.localStorage.getItem('c15t');
					expect(stored).toBeTruthy();
					const consent = JSON.parse(stored!);
					expect(consent.consents).toBeTruthy();
					expect(consent.consents.necessary).toBe(true);
				},
				{ timeout: 3000 }
			);
		});

		test('should persist reject decision to localStorage', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentBanner />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const rejectButton = document.querySelector(
						'[data-testid="consent-banner-reject-button"]'
					);
					expect(rejectButton).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const rejectButton = document.querySelector(
				'[data-testid="consent-banner-reject-button"]'
			);
			await userEvent.click(rejectButton!);

			await vi.waitFor(
				() => {
					const stored = window.localStorage.getItem('c15t');
					expect(stored).toBeTruthy();
					const consent = JSON.parse(stored!);
					expect(consent.consents.necessary).toBe(true);
					expect(consent.consents.marketing).toBe(false);
					expect(consent.consents.measurement).toBe(false);
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Returning Visitor Flow', () => {
		test('should not show banner if user has already consented', async () => {
			// Set existing consent
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

			// Wait a bit to ensure banner would have shown if it was going to
			await new Promise((resolve) => setTimeout(resolve, 500));

			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).not.toBeInTheDocument();
		});
	});

	describe('Preference Center Trigger', () => {
		test('should show trigger after consent given when showWhen is always', async () => {
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
					<ConsentDialogTrigger showWhen="always" />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const trigger = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(trigger).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Widget Integration', () => {
		test('should render widget with all consent categories', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const widget = document.querySelector(
						'[data-testid="consent-widget-root"]'
					);
					expect(widget).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			// Check for consent toggles
			await vi.waitFor(
				() => {
					const switches = document.querySelectorAll('[role="switch"]');
					expect(switches.length).toBeGreaterThan(0);
				},
				{ timeout: 3000 }
			);
		});

		test('should have disabled necessary consent toggle', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const necessarySwitch = document.querySelector(
						'[data-testid="consent-widget-switch-necessary"]'
					);
					expect(necessarySwitch).toBeInTheDocument();
					// Necessary consent is always required, so the switch should be disabled
					expect(necessarySwitch?.getAttribute('data-disabled')).toBe('');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Dialog Integration', () => {
		test('should show dialog when open prop is true', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentDialog open={true} />
				</ConsentManagerProvider>
			);

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

		test('should contain widget inside dialog', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const widget = document.querySelector(
						'[data-testid="consent-widget-root"]'
					);
					expect(widget).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render stock dialog branding without an empty footer wrapper', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					expect(
						document.querySelector('[data-testid="consent-dialog-branding"]')
					).toBeInTheDocument();
					expect(
						document.querySelector('[data-testid="consent-dialog-footer"]')
					).not.toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Complete Flow', () => {
		test('should complete full consent flow: banner -> customize -> save', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentBanner />
					<ConsentDialog />
				</ConsentManagerProvider>
			);

			// Step 1: Banner should appear
			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="consent-banner-root"]'
					);
					expect(banner).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			// Step 2: Click customize
			const customizeButton = document.querySelector(
				'[data-testid="consent-banner-customize-button"]'
			);
			await userEvent.click(customizeButton!);

			// Step 3: Dialog should open
			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-dialog-root"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			// Step 4: Toggle a consent category
			const marketingSwitch = document.querySelector(
				'[data-testid="consent-widget-switch-marketing"]'
			);
			if (marketingSwitch) {
				await userEvent.click(marketingSwitch);
			}

			// Step 5: Save preferences
			const saveButton = document.querySelector(
				'[data-testid="consent-widget-footer-save-button"]'
			);
			await userEvent.click(saveButton!);

			// Step 6: Verify consent was saved
			await vi.waitFor(
				() => {
					const stored = window.localStorage.getItem('c15t');
					expect(stored).toBeTruthy();
					const consent = JSON.parse(stored!);
					expect(consent.consents).toBeTruthy();
				},
				{ timeout: 3000 }
			);
		});
	});
});
