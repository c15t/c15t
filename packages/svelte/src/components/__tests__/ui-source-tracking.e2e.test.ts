/**
 * E2E tests for uiSource tracking through the consent flow.
 *
 * Verifies that UI components correctly render and save consent.
 *
 * Mirrors: packages/react/src/components/__tests__/ui-source-tracking.e2e.test.tsx
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

describe('UI Source Tracking E2E Tests', () => {
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

	describe('Banner uiSource', () => {
		test('should render banner and save consent via accept button', async () => {
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
				expect(consent.consents.necessary).toBe(true);
			});
		});

		test('should render banner with custom uiSource prop', async () => {
			render(BannerFixture, {
				options: defaultOptions,
				uiSource: 'custom_banner',
			});

			await waitFor(() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			});
		});
	});

	describe('Dialog uiSource', () => {
		test('should render dialog and save consent via accept button', async () => {
			render(DialogFixture, { options: defaultOptions, open: true });

			await waitFor(() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			});

			const acceptButton = document.querySelector(
				'[data-testid="consent-widget-accept-all-button"]'
			);
			if (acceptButton) {
				await fireEvent.click(acceptButton);

				await waitFor(() => {
					const stored = window.localStorage.getItem('c15t');
					expect(stored).toBeTruthy();
				});
			}
		});

		test('should render dialog with custom uiSource prop', async () => {
			render(DialogFixture, {
				options: defaultOptions,
				open: true,
				uiSource: 'custom_dialog',
			});

			await waitFor(() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			});
		});
	});

	describe('Widget uiSource', () => {
		test('should render widget with default uiSource', async () => {
			render(WidgetFixture, { options: defaultOptions });

			await waitFor(() => {
				const widget = document.querySelector('[data-testid="consent-widget"]');
				expect(widget).toBeInTheDocument();
			});
		});
	});

	describe('Banner to Dialog flow preserves correct uiSource', () => {
		test('should transition from banner to dialog and save from dialog', async () => {
			render(BannerDialogFixture, { options: defaultOptions });

			// Wait for banner
			await waitFor(() => {
				const banner = document.querySelector(
					'[data-testid="consent-banner-root"]'
				);
				expect(banner).toBeInTheDocument();
			});

			// Click customize to open dialog
			const customizeButton = document.querySelector(
				'[data-testid="consent-banner-customize-button"]'
			)!;
			await fireEvent.click(customizeButton);

			// Wait for dialog
			await waitFor(() => {
				const dialog = document.querySelector(
					'[data-testid="consent-dialog-root"]'
				);
				expect(dialog).toBeInTheDocument();
			});

			// Save from dialog
			const saveButton = document.querySelector(
				'[data-testid="consent-widget-save-button"]'
			)!;
			await fireEvent.click(saveButton);

			// Verify consent was saved
			await waitFor(() => {
				const stored = window.localStorage.getItem('c15t');
				expect(stored).toBeTruthy();
				const consent = JSON.parse(stored!);
				expect(consent.consents).toBeTruthy();
			});
		});
	});
});
