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
import { ConsentBanner } from '~/v3/components/consent-banner';
import { ConsentDialog } from '~/v3/components/consent-dialog';
import { ConsentDialogTrigger } from '~/v3/components/consent-dialog-trigger';
import { ConsentWidget } from '~/v3/components/consent-widget';
import { ConsentProvider } from '~/v3/provider';
import { clearConsentRuntimeCache } from '~/v3/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/v3/types/consent-manager';

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
	consentCategories: [
		'necessary',
		'functionality',
		'experience',
		'marketing',
		'measurement',
	],
	offlinePolicy: {
		policy: {
			id: 'consent-flow-test',
			model: 'opt-in',
			consent: {
				categories: [
					'necessary',
					'functionality',
					'experience',
					'marketing',
					'measurement',
				],
				scopeMode: 'permissive',
			},
			ui: {
				mode: 'banner',
			},
		},
	},
};

const storedAcceptAllConsent = () => ({
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
		subjectId: 'sub_123456789ABC',
	},
});

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
				<ConsentProvider options={defaultOptions}>
					<ConsentBanner />
				</ConsentProvider>
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
				<ConsentProvider options={defaultOptions}>
					<ConsentBanner />
				</ConsentProvider>
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
				<ConsentProvider options={defaultOptions}>
					<ConsentBanner />
				</ConsentProvider>
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
				<ConsentProvider options={defaultOptions}>
					<ConsentBanner />
				</ConsentProvider>
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
				<ConsentProvider options={defaultOptions}>
					<ConsentBanner />
				</ConsentProvider>
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
			window.localStorage.setItem(
				'c15t',
				JSON.stringify(storedAcceptAllConsent())
			);

			render(
				<ConsentProvider options={defaultOptions}>
					<ConsentBanner />
				</ConsentProvider>
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
			window.localStorage.setItem(
				'c15t',
				JSON.stringify(storedAcceptAllConsent())
			);

			render(
				<ConsentProvider options={defaultOptions}>
					<ConsentDialogTrigger showWhen="always" />
				</ConsentProvider>
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
				<ConsentProvider options={defaultOptions}>
					<ConsentWidget />
				</ConsentProvider>
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
				<ConsentProvider options={defaultOptions}>
					<ConsentWidget />
				</ConsentProvider>
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
				<ConsentProvider options={defaultOptions}>
					<ConsentDialog open={true} />
				</ConsentProvider>
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

		test('should add aria-modal when focus trap is enabled', async () => {
			render(
				<ConsentProvider options={defaultOptions}>
					<ConsentDialog open={true} />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-dialog-root"]'
					);
					expect(dialog).toBeInTheDocument();
					expect(dialog?.getAttribute('aria-modal')).toBe('true');
				},
				{ timeout: 3000 }
			);
		});

		test('should contain widget inside dialog', async () => {
			render(
				<ConsentProvider options={defaultOptions}>
					<ConsentDialog open={true} />
				</ConsentProvider>
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
				<ConsentProvider options={defaultOptions}>
					<ConsentDialog open={true} />
				</ConsentProvider>
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

		test('should close managed dialog on Escape', async () => {
			render(
				<ConsentProvider options={defaultOptions}>
					<ConsentBanner />
					<ConsentDialog />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					expect(
						document.querySelector(
							'[data-testid="consent-banner-customize-button"]'
						)
					).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			await userEvent.click(
				document.querySelector(
					'[data-testid="consent-banner-customize-button"]'
				)!
			);

			await vi.waitFor(
				() => {
					expect(
						document.querySelector('[data-testid="consent-dialog-root"]')
					).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			document.dispatchEvent(
				new KeyboardEvent('keydown', {
					bubbles: true,
					cancelable: true,
					key: 'Escape',
				})
			);

			await vi.waitFor(
				() => {
					expect(
						document.querySelector('[data-testid="consent-dialog-root"]')
					).not.toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Complete Flow', () => {
		test('should complete full consent flow: banner -> customize -> save', async () => {
			render(
				<ConsentProvider options={defaultOptions}>
					<ConsentBanner />
					<ConsentDialog />
				</ConsentProvider>
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
