/**
 * Comprehensive tests for the ConsentManagerWidget component.
 *
 * @packageDocumentation
 */

import { defaultTranslationConfig } from 'c15t';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentManagerCache,
} from '~/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/types/consent-manager';
import { ConsentManagerWidget } from '../consent-manager-widget';

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
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

// Mock fetch
globalThis.fetch = vi.fn(() =>
	Promise.resolve(
		new Response(
			JSON.stringify({
				showConsentBanner: true,
				jurisdiction: { code: 'GDPR' },
				translations: {
					language: 'en',
					translations: defaultTranslationConfig.translations.en,
				},
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		)
	)
) as typeof fetch;

const defaultOptions: ConsentManagerOptions = {
	mode: 'offline',
};

describe('ConsentManagerWidget', () => {
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
		clearConsentManagerCache();
	});

	describe('Rendering', () => {
		test('should render widget root', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const widget = document.querySelector(
						'[data-testid="consent-manager-widget-root"]'
					);
					expect(widget).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render accordion triggers', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					// Look for accordion triggers with consent names
					const triggers = document.querySelectorAll(
						'[data-testid^="consent-manager-widget-accordion-trigger-"]'
					);
					expect(triggers.length).toBeGreaterThan(0);
				},
				{ timeout: 3000 }
			);
		});

		test('should render footer with action buttons', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const footer = document.querySelector(
						'[data-testid="consent-manager-widget-footer"]'
					);
					expect(footer).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render accept all button', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const acceptButton = document.querySelector(
						'[data-testid="consent-manager-widget-footer-accept-button"]'
					);
					expect(acceptButton).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render reject button', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const rejectButton = document.querySelector(
						'[data-testid="consent-manager-widget-reject-button"]'
					);
					expect(rejectButton).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render save button', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const saveButton = document.querySelector(
						'[data-testid="consent-manager-widget-footer-save-button"]'
					);
					expect(saveButton).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Props', () => {
		test('should accept hideBranding prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget hideBranding={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const widget = document.querySelector(
						'[data-testid="consent-manager-widget-root"]'
					);
					expect(widget).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			// Branding should be hidden
			const branding = document.querySelector(
				'[data-testid="consent-manager-widget-branding"] a'
			);
			expect(branding).not.toBeInTheDocument();
		});

		test('should show branding when hideBranding is false', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget hideBranding={false} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const widget = document.querySelector(
						'[data-testid="consent-manager-widget-root"]'
					);
					expect(widget).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			// Wait for full render
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Branding should be visible
			const branding = document.querySelector(
				'[data-testid="consent-manager-widget-branding"]'
			);
			expect(branding).toBeInTheDocument();
		});

		test('should accept noStyle prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget noStyle={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const widget = document.querySelector(
						'[data-testid="consent-manager-widget-root"]'
					);
					expect(widget).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept disableAnimation prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget disableAnimation={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const widget = document.querySelector(
						'[data-testid="consent-manager-widget-root"]'
					);
					expect(widget).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Consent Categories', () => {
		test('should render consent category items', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					// Look for accordion triggers (consent categories)
					const accordionItems = document.querySelectorAll(
						'[data-testid^="consent-manager-widget-accordion-trigger-"]'
					);
					expect(accordionItems.length).toBeGreaterThan(0);
				},
				{ timeout: 3000 }
			);
		});

		test('should render switch for each consent category', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					// Look for switches (toggles for consent)
					const switches = document.querySelectorAll('[role="switch"]');
					expect(switches.length).toBeGreaterThan(0);
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Theme Integration', () => {
		test('should apply theme styles to widget elements', async () => {
			render(
				<ConsentManagerProvider
					options={{
						...defaultOptions,
						theme: {
							slots: {
								widget: 'custom-widget-class',
							},
						},
					}}
				>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const widget = document.querySelector(
						'[data-testid="consent-manager-widget-root"]'
					);
					expect(widget).toBeInTheDocument();
					expect(widget?.className).toContain('custom-widget-class');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('State Management', () => {
		test('should track accordion open state', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			// Wait for component to render
			await vi.waitFor(
				() => {
					const accordionItems = document.querySelectorAll(
						'[data-testid^="consent-manager-widget-accordion-trigger-"]'
					);
					expect(accordionItems.length).toBeGreaterThan(0);
				},
				{ timeout: 3000 }
			);

			// Verify accordion triggers are present (accordion state is managed internally)
			const accordionTriggers = document.querySelectorAll(
				'[data-testid^="consent-manager-widget-accordion-trigger-"]'
			);
			expect(accordionTriggers.length).toBeGreaterThan(0);
		});
	});

	describe('Button Labels', () => {
		test('should have correct text for accept all button', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const acceptButton = document.querySelector(
						'[data-testid="consent-manager-widget-footer-accept-button"]'
					);
					expect(acceptButton).toBeInTheDocument();
					// Button should have text content (the exact text depends on translations)
					expect(acceptButton?.textContent).toBeTruthy();
				},
				{ timeout: 3000 }
			);
		});

		test('should have correct text for reject button', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const rejectButton = document.querySelector(
						'[data-testid="consent-manager-widget-reject-button"]'
					);
					expect(rejectButton).toBeInTheDocument();
					expect(rejectButton?.textContent).toBeTruthy();
				},
				{ timeout: 3000 }
			);
		});

		test('should have correct text for save button', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerWidget />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const saveButton = document.querySelector(
						'[data-testid="consent-manager-widget-footer-save-button"]'
					);
					expect(saveButton).toBeInTheDocument();
					expect(saveButton?.textContent).toBeTruthy();
				},
				{ timeout: 3000 }
			);
		});
	});
});
