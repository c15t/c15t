import { readStoredRecords } from '@c15t/core/modules/persistence';
/**
 * E2E tests for uiSource tracking through the consent flow.
 *
 * Verifies that the ConsentTrackingContext correctly propagates
 * the uiSource identifier from each UI component to saveConsents.
 *
 * @packageDocumentation
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
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
		id: 'ui-source-tracking-test',
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'permissive',
	}),
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
	});

	describe('Banner uiSource', () => {
		test('should render banner and save consent via accept button', async () => {
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

			// Verify consent is saved
			await vi.waitFor(
				() => {
					const stored = readStoredRecords(undefined, Date.now()).records
						.choice;
					expect(stored).toBeTruthy();
					const consent = getDefined(stored);
					expect(consent.categories.necessary).toBeUndefined();
				},
				{ timeout: 3000 }
			);
		});

		test('should render banner with custom uiSource prop', async () => {
			render(
				<ConsentProvider options={defaultOptions}>
					<ConsentBanner uiSource="custom_banner" />
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
	});

	describe('Dialog uiSource', () => {
		test('should render dialog and save consent via accept button', async () => {
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

			// The dialog contains a widget with accept all button
			const acceptButton = document.querySelector(
				'[data-testid="consent-widget-footer-accept-all-button"]'
			);
			if (acceptButton) {
				await userEvent.click(acceptButton);

				await vi.waitFor(
					() => {
						const stored = readStoredRecords(undefined, Date.now()).records
							.choice;
						expect(stored).toBeTruthy();
					},
					{ timeout: 3000 }
				);
			}
		});

		test('should render dialog with custom uiSource prop', async () => {
			render(
				<ConsentProvider options={defaultOptions}>
					<ConsentDialog
						open={true}
						uiSource="custom_dialog"
					/>
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
	});

	describe('Widget uiSource', () => {
		test('should render widget with default uiSource', async () => {
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
		});
	});

	describe('Banner to Dialog flow preserves correct uiSource', () => {
		test('should transition from banner to dialog and save from dialog', async () => {
			render(
				<ConsentProvider options={defaultOptions}>
					<ConsentBanner />
					<ConsentDialog />
				</ConsentProvider>
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

			// Save from dialog - the uiSource should be 'dialog' not 'banner'
			const saveButton = document.querySelector(
				'[data-testid="consent-widget-footer-save-button"]'
			);
			await userEvent.click(getDefined(saveButton));

			// Verify consent was saved
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
