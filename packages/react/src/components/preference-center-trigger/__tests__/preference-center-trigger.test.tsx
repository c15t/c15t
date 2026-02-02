/**
 * Comprehensive tests for the PreferenceCenterTrigger component.
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
import { PreferenceCenterTrigger } from '../preference-center-trigger';

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

// Helper to set consent in localStorage to simulate "after consent" state
function setConsentedState() {
	const consentData = {
		consents: {
			necessary: true,
			functionality: true,
			marketing: false,
			measurement: false,
			experience: false,
		},
		consentInfo: {
			time: Date.now(),
			type: 'custom',
		},
	};
	window.localStorage.setItem('c15t-consent', JSON.stringify(consentData));
}

describe('PreferenceCenterTrigger', () => {
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

	describe('Visibility', () => {
		test('should not render when showWhen is "after-consent" and no consent given', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger showWhen="after-consent" />
				</ConsentManagerProvider>
			);

			// Wait for potential render
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Trigger should not be visible without consent
			const buttons = document.querySelectorAll(
				'button[aria-label="Open privacy settings"]'
			);
			expect(buttons.length).toBe(0);
		});

		test('should render when showWhen is "always"', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger showWhen="always" />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should not render when showWhen is "never"', async () => {
			setConsentedState();

			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger showWhen="never" />
				</ConsentManagerProvider>
			);

			// Wait for potential render
			await new Promise((resolve) => setTimeout(resolve, 500));

			const buttons = document.querySelectorAll(
				'button[aria-label="Open privacy settings"]'
			);
			expect(buttons.length).toBe(0);
		});
	});

	describe('Props', () => {
		test('should accept custom ariaLabel', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger
						showWhen="always"
						ariaLabel="Manage cookies"
					/>
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Manage cookies"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept size prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger showWhen="always" size="lg" />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept className prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger
						showWhen="always"
						className="my-custom-class"
					/>
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
					expect(button?.className).toContain('my-custom-class');
				},
				{ timeout: 3000 }
			);
		});

		test('should accept noStyle prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger showWhen="always" noStyle={true} />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Accessibility', () => {
		test('should have correct aria-label', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger showWhen="always" />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should be a button element', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger showWhen="always" />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
					expect(button?.tagName.toLowerCase()).toBe('button');
				},
				{ timeout: 3000 }
			);
		});

		test('should have type="button"', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger showWhen="always" />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					) as HTMLButtonElement;
					expect(button).toBeInTheDocument();
					expect(button?.type).toBe('button');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Portal Rendering', () => {
		test('should render in document.body via portal', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<div id="test-container">
						<PreferenceCenterTrigger showWhen="always" />
					</div>
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
					// Button should be rendered directly in body, not inside test-container
					const testContainer = document.getElementById('test-container');
					expect(testContainer?.contains(button)).toBe(false);
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Compound Components', () => {
		test('should render using compound component pattern', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger.Root showWhen="always">
						<PreferenceCenterTrigger.Button>
							<PreferenceCenterTrigger.Icon />
						</PreferenceCenterTrigger.Button>
					</PreferenceCenterTrigger.Root>
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render with custom text', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger.Root showWhen="always">
						<PreferenceCenterTrigger.Button>
							<PreferenceCenterTrigger.Icon />
							<PreferenceCenterTrigger.Text>
								Privacy Settings
							</PreferenceCenterTrigger.Text>
						</PreferenceCenterTrigger.Button>
					</PreferenceCenterTrigger.Root>
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
					expect(button?.textContent).toContain('Privacy Settings');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Icon Variants', () => {
		test('should accept branding icon', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger showWhen="always" icon="branding" />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept fingerprint icon', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger showWhen="always" icon="fingerprint" />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept cookie icon', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger showWhen="always" icon="cookie" />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Default Position', () => {
		test('should accept defaultPosition prop', async () => {
			render(
				<ConsentManagerProvider options={defaultOptions}>
					<PreferenceCenterTrigger
						showWhen="always"
						defaultPosition="top-left"
					/>
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'button[aria-label="Open privacy settings"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});
});
