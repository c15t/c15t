import { readStoredRecords } from '@c15t/core/modules/persistence';
/**
 * E2E tests for the complete consent flow.
 *
 * Tests the full user journey from first visit through consent management.
 *
 * @packageDocumentation
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { createVoidDeferredPromise } from '~/__tests__/deferred-promise';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
import { ConsentDialogTrigger } from '~/components/consent-dialog-trigger';
import { ConsentWidget } from '~/components/consent-widget';
import { offline } from '~/transports/offline';

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
		clear: () => {
			store = {};
		},
		getItem: (key: string) => store[key] || null,
		removeItem: (key: string) => {
			Reflect.deleteProperty(store, key);
		},
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

const defaultOptions: ConsentProviderOptions = {
	consentCategories: [
		'necessary',
		'functionality',
		'experience',
		'marketing',
		'measurement',
	],
	mode: offline(),
	prefetch: policyFixture(undefined, {
		categories: [
			'necessary',
			'functionality',
			'experience',
			'marketing',
			'measurement',
		],
		id: 'consent-flow-test',
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'permissive',
	}),
};

const storedAcceptAllConsent = () => ({
	consentInfo: {
		subjectId: 'sub_123456789ABC',
		time: Date.now(),
		type: 'accept-all',
	},
	consents: {
		experience: true,
		functionality: true,
		marketing: true,
		measurement: true,
		necessary: true,
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
			await userEvent.click(getDefined(acceptButton));

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
			await userEvent.click(getDefined(rejectButton));

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
			await userEvent.click(getDefined(acceptButton));

			await vi.waitFor(
				() => {
					const stored = readStoredRecords(undefined, Date.now()).records
						.choice;
					expect(stored).toBeTruthy();
					const consent = getDefined(stored);
					expect(consent.categories).toBeTruthy();
					expect(consent.categories.necessary).toBeUndefined();
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
			await userEvent.click(getDefined(rejectButton));

			await vi.waitFor(
				() => {
					const stored = readStoredRecords(undefined, Date.now()).records
						.choice;
					expect(stored).toBeTruthy();
					const consent = getDefined(stored);
					expect(consent.categories.necessary).toBeUndefined();
					expect(consent.categories.marketing?.value).toBe(false);
					expect(consent.categories.measurement?.value).toBe(false);
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
			await createVoidDeferredPromise((resolve) => setTimeout(resolve, 500));

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
				getDefined(
					document.querySelector(
						'[data-testid="consent-banner-customize-button"]'
					)
				)
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
			await userEvent.click(getDefined(customizeButton));

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
			await userEvent.click(getDefined(saveButton));

			// Step 6: Verify consent was saved
			await vi.waitFor(
				() => {
					const stored = readStoredRecords(undefined, Date.now()).records
						.choice;
					expect(stored).toBeTruthy();
					const consent = getDefined(stored);
					expect(consent.categories).toBeTruthy();
				},
				{ timeout: 3000 }
			);
		});
	});
});
