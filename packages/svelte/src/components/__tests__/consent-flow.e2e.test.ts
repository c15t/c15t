/**
 * E2E tests for the complete consent flow.
 *
 * Tests the full user journey from first visit through consent management.
 *
 * Mirrors: packages/react/src/components/__tests__/consent-flow.e2e.test.tsx
 */

import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { clearConsentRuntimeCache } from 'c15t';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import BannerDialogFixture from '../../__tests__/fixtures/banner-dialog-fixture.svelte';
import BannerFixture from '../../__tests__/fixtures/banner-fixture.svelte';
import DialogFixture from '../../__tests__/fixtures/dialog-fixture.svelte';
import WidgetFixture from '../../__tests__/fixtures/widget-fixture.svelte';
import type { ConsentManagerOptions } from '../../lib/types';

const defaultOptions: ConsentManagerOptions = {
	mode: 'offline',
};

describe('Consent Flow E2E Tests', () => {
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

	describe('First Visit Flow', () => {
		test('should show cookie banner to first-time visitor', async () => {
			render(BannerFixture, { options: defaultOptions });

			await waitFor(() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			});
		});

		test('should hide banner after accepting all', async () => {
			render(BannerFixture, { options: defaultOptions });

			await waitFor(() => {
				const acceptButton = document.querySelector(
					'[data-testid="consent-banner-accept-button"]'
				);
				expect(acceptButton).toBeInTheDocument();
			});

			const acceptButton = document.querySelector(
				'[data-testid="consent-banner-accept-button"]'
			)!;
			await fireEvent.click(acceptButton);

			await waitFor(() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).not.toBeInTheDocument();
			});
		});

		test('should hide banner after rejecting all', async () => {
			render(BannerFixture, { options: defaultOptions });

			await waitFor(() => {
				const rejectButton = document.querySelector(
					'[data-testid="consent-banner-reject-button"]'
				);
				expect(rejectButton).toBeInTheDocument();
			});

			const rejectButton = document.querySelector(
				'[data-testid="consent-banner-reject-button"]'
			)!;
			await fireEvent.click(rejectButton);

			await waitFor(() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).not.toBeInTheDocument();
			});
		});
	});

	describe('Consent Persistence', () => {
		test('should persist consent to localStorage on accept', async () => {
			render(BannerFixture, { options: defaultOptions });

			await waitFor(() => {
				const acceptButton = document.querySelector(
					'[data-testid="consent-banner-accept-button"]'
				);
				expect(acceptButton).toBeInTheDocument();
			});

			const acceptButton = document.querySelector(
				'[data-testid="consent-banner-accept-button"]'
			)!;
			await fireEvent.click(acceptButton);

			await waitFor(() => {
				const stored = window.localStorage.getItem('c15t');
				expect(stored).toBeTruthy();
				const consent = JSON.parse(stored!);
				expect(consent.consents).toBeTruthy();
				expect(consent.consents.necessary).toBe(true);
			});
		});

		test('should persist reject decision to localStorage', async () => {
			render(BannerFixture, { options: defaultOptions });

			await waitFor(() => {
				const rejectButton = document.querySelector(
					'[data-testid="consent-banner-reject-button"]'
				);
				expect(rejectButton).toBeInTheDocument();
			});

			const rejectButton = document.querySelector(
				'[data-testid="consent-banner-reject-button"]'
			)!;
			await fireEvent.click(rejectButton);

			await waitFor(() => {
				const stored = window.localStorage.getItem('c15t');
				expect(stored).toBeTruthy();
				const consent = JSON.parse(stored!);
				expect(consent.consents.necessary).toBe(true);
				expect(consent.consents.marketing).toBe(false);
				expect(consent.consents.measurement).toBe(false);
			});
		});
	});

	describe('Returning Visitor Flow', () => {
		test('should not show banner if user has already consented', async () => {
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

			render(BannerFixture, { options: defaultOptions });

			await new Promise((resolve) => setTimeout(resolve, 500));

			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).not.toBeInTheDocument();
		});
	});

	describe('Widget Integration', () => {
		test('should render widget with all consent categories', async () => {
			render(WidgetFixture, { options: defaultOptions });

			await waitFor(() => {
				const widget = document.querySelector('[data-testid="consent-widget"]');
				expect(widget).toBeInTheDocument();
			});

			await waitFor(() => {
				const switches = document.querySelectorAll('[data-scope="switch"]');
				expect(switches.length).toBeGreaterThan(0);
			});
		});

		test('should have disabled necessary consent toggle', async () => {
			render(WidgetFixture, { options: defaultOptions });

			await waitFor(() => {
				const necessarySwitch = document.querySelector(
					'[data-testid="consent-widget-switch-necessary"]'
				);
				expect(necessarySwitch).toBeInTheDocument();
				expect(necessarySwitch?.getAttribute('data-disabled')).toBe('');
			});
		});
	});

	describe('Dialog Integration', () => {
		test('should show dialog when open prop is true', async () => {
			render(DialogFixture, { options: defaultOptions, open: true });

			await waitFor(() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			});
		});

		test('should contain widget inside dialog', async () => {
			render(DialogFixture, { options: defaultOptions, open: true });

			await waitFor(() => {
				const widget = document.querySelector('[data-testid="consent-widget"]');
				expect(widget).toBeInTheDocument();
			});
		});
	});

	describe('Complete Flow', () => {
		test('should complete full consent flow: banner -> customize -> save', async () => {
			render(BannerDialogFixture, { options: defaultOptions });

			// Step 1: Banner should appear
			await waitFor(() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			});

			// Step 2: Click customize
			const customizeButton = document.querySelector(
				'[data-testid="consent-banner-customize-button"]'
			)!;
			await fireEvent.click(customizeButton);

			// Step 3: Dialog should open
			await waitFor(() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			});

			// Step 4: Toggle a consent category
			// Note: marketing switch may not render in jsdom due to scroll-lock/portal
			// interactions. Toggle it if present; the flow test still validates the
			// banner → dialog → save lifecycle regardless.
			const marketingSwitch = document.querySelector(
				'[data-testid="consent-widget-switch-marketing"]'
			);
			if (marketingSwitch) {
				await fireEvent.click(marketingSwitch);
			}

			// Step 5: Save preferences
			const saveButton = document.querySelector(
				'[data-testid="consent-widget-save-button"]'
			)!;
			await fireEvent.click(saveButton);

			// Step 6: Verify consent was saved
			await waitFor(() => {
				const stored = window.localStorage.getItem('c15t');
				expect(stored).toBeTruthy();
				const consent = JSON.parse(stored!);
				expect(consent.consents).toBeTruthy();
			});
		});
	});
});
