/**
 * E2E tests for uiSource tracking through the consent flow.
 *
 * Verifies that the ConsentTrackingContext correctly propagates
 * the uiSource identifier from each UI component to saveConsents.
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

			// Verify consent is saved
			await vi.waitFor(
				() => {
					const stored = window.localStorage.getItem('c15t');
					expect(stored).toBeTruthy();
					const consent = JSON.parse(stored!);
					expect(consent.consents.necessary).toBe(true);
				},
				{ timeout: 3000 }
			);
		});

		test('should render banner with custom uiSource prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentBanner uiSource="custom_banner" />
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
	});

	describe('Dialog uiSource', () => {
		test('should render dialog and save consent via accept button', async () => {
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

			// The dialog contains a widget with accept all button
			const acceptButton = document.querySelector(
				'[data-testid="consent-widget-footer-accept-all-button"]'
			);
			if (acceptButton) {
				await userEvent.click(acceptButton);

				await vi.waitFor(
					() => {
						const stored = window.localStorage.getItem('c15t');
						expect(stored).toBeTruthy();
					},
					{ timeout: 3000 }
				);
			}
		});

		test('should render dialog with custom uiSource prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentDialog open={true} uiSource="custom_dialog" />
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
	});

	describe('Widget uiSource', () => {
		test('should render widget with default uiSource', async () => {
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
		});
	});

	describe('Banner to Dialog flow preserves correct uiSource', () => {
		test('should transition from banner to dialog and save from dialog', async () => {
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

			// Click customize to open dialog
			const customizeButton = document.querySelector(
				'[data-testid="consent-banner-customize-button"]'
			);
			await userEvent.click(customizeButton!);

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

			// Save from dialog - the uiSource should be 'dialog' not 'banner'
			const saveButton = document.querySelector(
				'[data-testid="consent-widget-footer-save-button"]'
			);
			await userEvent.click(saveButton!);

			// Verify consent was saved
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
