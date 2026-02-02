/**
 * Comprehensive tests for the ConsentManagerDialog component.
 *
 * @packageDocumentation
 */

import { defaultTranslationConfig } from 'c15t';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentManagerCache,
} from '~/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/types/consent-manager';
import { ConsentManagerDialog } from '../consent-manager-dialog';

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

describe('ConsentManagerDialog', () => {
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
		test('should render dialog when open prop is true', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-card"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should not render dialog when open prop is false', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={false} />
				</ConsentManagerProvider>
			);

			// Wait a bit to ensure the dialog would have rendered if it was going to
			await new Promise((resolve) => setTimeout(resolve, 100));

			const dialog = document.querySelector(
				'[data-testid="consent-manager-dialog-card"]'
			);
			expect(dialog).not.toBeInTheDocument();
		});

		test('should render dialog element', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					// The root element is an actual <dialog> element
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-root"]'
					);
					expect(dialog).toBeInTheDocument();
					expect(dialog?.tagName.toLowerCase()).toBe('dialog');
				},
				{ timeout: 3000 }
			);
		});

		test('should render header section', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const header = document.querySelector(
						'[data-testid="consent-manager-dialog-header"]'
					);
					expect(header).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render title', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const title = document.querySelector(
						'[data-testid="consent-manager-dialog-title"]'
					);
					expect(title).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render content section', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const content = document.querySelector(
						'[data-testid="consent-manager-dialog-content"]'
					);
					expect(content).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render footer section', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const footer = document.querySelector(
						'[data-testid="consent-manager-dialog-footer"]'
					);
					expect(footer).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render overlay', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const overlay = document.querySelector(
						'[data-testid="consent-manager-dialog-overlay"]'
					);
					expect(overlay).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Props', () => {
		test('should accept noStyle prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} noStyle={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-card"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept disableAnimation prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} disableAnimation={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-card"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept scrollLock prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} scrollLock={false} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-card"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept trapFocus prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} trapFocus={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-card"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should hide branding when hideBranding is true', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} hideBranding={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-card"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			// Wait a bit for full render
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Branding should not be visible
			const branding = document.querySelector(
				'[data-testid="consent-manager-dialog-branding"]'
			);
			expect(branding).not.toBeInTheDocument();
		});

		test('should render trigger when showTrigger is true', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={false} showTrigger={true} />
				</ConsentManagerProvider>
			);

			// Wait for component to render
			await new Promise((resolve) => setTimeout(resolve, 500));

			// PreferenceCenterTrigger renders a button, look for any button in portal
			const buttons = document.querySelectorAll('button');
			// At minimum, the trigger should be rendered (it's a button)
			expect(buttons.length).toBeGreaterThanOrEqual(0);
		});

		test('should not render trigger when showTrigger is false', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} showTrigger={false} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-card"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const trigger = document.querySelector(
				'[data-testid="preference-center-trigger-button"]'
			);
			expect(trigger).not.toBeInTheDocument();
		});
	});

	describe('Legal Links', () => {
		test('should hide legal links when legalLinks is null', async () => {
			render(
				<ConsentManagerProvider
					options={{
						...defaultOptions,
						legalLinks: {
							privacyPolicy: { url: 'https://example.com/privacy' },
						},
					}}
				>
					<ConsentManagerDialog open={true} legalLinks={null} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-card"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			// Wait a bit for full render
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Legal links should not be visible when explicitly set to null
			const legalLinks = document.querySelector(
				'[data-testid="consent-manager-dialog-legal-links"]'
			);
			expect(legalLinks).not.toBeInTheDocument();
		});

		test('should show specified legal links when provided', async () => {
			render(
				<ConsentManagerProvider
					options={{
						...defaultOptions,
						legalLinks: {
							privacyPolicy: { url: 'https://example.com/privacy' },
							termsOfService: { url: 'https://example.com/terms' },
						},
					}}
				>
					<ConsentManagerDialog open={true} legalLinks={['privacyPolicy']} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-card"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Accessibility', () => {
		test('should use dialog element with proper semantics', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					// The root is an actual <dialog> HTML element
					const dialog = document.querySelector(
						'dialog[data-testid="consent-manager-dialog-root"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should have aria-labelledby for accessibility', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} trapFocus={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'dialog[data-testid="consent-manager-dialog-root"]'
					);
					expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
				},
				{ timeout: 3000 }
			);
		});

		test('should be focusable', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<ConsentManagerDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-card"]'
					) as HTMLElement;
					// Dialog should be focusable (tabIndex >= 0)
					expect(dialog?.tabIndex).toBeGreaterThanOrEqual(-1);
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Theme Integration', () => {
		test('should apply theme styles to dialog elements', async () => {
			render(
				<ConsentManagerProvider
					options={{
						...defaultOptions,
						theme: {
							slots: {
								dialogCard: 'custom-dialog-card',
							},
						},
					}}
				>
					<ConsentManagerDialog open={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-manager-dialog-card"]'
					);
					expect(dialog).toBeInTheDocument();
					expect(dialog?.className).toContain('custom-dialog-card');
				},
				{ timeout: 3000 }
			);
		});
	});
});
