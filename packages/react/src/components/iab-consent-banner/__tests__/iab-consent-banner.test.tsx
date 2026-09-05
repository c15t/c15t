/**
 * IAB Consent Banner Unit Tests
 *
 * Tests for IAB Consent Banner component display and behavior.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { offline } from '~/transports/offline';

import { IABConsentBanner } from '../iab-consent-banner';

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
			store[key] = value;
		},
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

// Mock fetch for GVL
const mockGVL = {
	features: {
		1: {
			description: '',
			id: 1,
			illustrations: [],
			name: 'Match and combine data',
		},
	},
	gvlSpecificationVersion: 3,
	lastUpdated: '2024-01-15T16:00:23Z',
	purposes: {
		1: {
			description: '',
			id: 1,
			illustrations: [],
			name: 'Store and/or access information',
		},
		2: {
			description: '',
			id: 2,
			illustrations: [],
			name: 'Use limited data to select advertising',
		},
	},
	specialFeatures: {
		1: {
			description: '',
			id: 1,
			illustrations: [],
			name: 'Use precise geolocation',
		},
	},
	specialPurposes: {
		1: { description: '', id: 1, illustrations: [], name: 'Security' },
	},
	stacks: {
		1: {
			description: '',
			id: 1,
			name: 'Test Stack',
			purposes: [2],
			specialFeatures: [],
		},
	},
	tcfPolicyVersion: 5,
	vendorListVersion: 142,
	vendors: {
		1: {
			cookieMaxAgeSeconds: 0,
			cookieRefresh: false,
			features: [],
			flexiblePurposes: [],
			id: 1,
			legIntPurposes: [],
			name: 'Test Vendor',
			purposes: [1, 2],
			specialFeatures: [],
			specialPurposes: [],
			urls: [],
			usesCookies: false,
			usesNonCookieAccess: false,
		},
	},
};

globalThis.fetch = vi.fn(() =>
	Promise.resolve(
		new Response(JSON.stringify(mockGVL), {
			headers: { 'Content-Type': 'application/json' },
			status: 200,
		})
	)
) as typeof fetch;

const defaultIABOptions: ConsentProviderOptions = {
	iab: {
		cmpId: 160,
		cmpVersion: 1,
		gvl: mockGVL,
	},
	mode: offline(),
	prefetch: policyFixture(undefined, {
		categories: undefined,
		id: 'iab_test',
		model: 'iab',
		prompt: 'choice',
		scopeMode: 'strict',
	}),
};

describe('IAB Consent Banner Unit Tests', () => {
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
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	describe('Component Rendering', () => {
		test('should render banner when IAB is enabled', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="iab-consent-banner-card"]'
					);
					expect(banner).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render accept button', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'[data-testid="iab-consent-banner-accept-button"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render reject button', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'[data-testid="iab-consent-banner-reject-button"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render customize button', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector(
						'[data-testid="iab-consent-banner-customize-button"]'
					);
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render branding tag', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const branding = document.querySelector(
						'[data-testid="iab-consent-banner-branding"]'
					);
					expect(branding).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Accessibility', () => {
		test('should have dialog role', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="iab-consent-banner-card"]'
					);
					expect(banner?.tagName).toBe('DIALOG');
				},
				{ timeout: 3000 }
			);
		});

		test('should have aria-label', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="iab-consent-banner-card"]'
					);
					expect(banner?.getAttribute('aria-label')).toBeTruthy();
				},
				{ timeout: 3000 }
			);
		});

		test('should be focusable', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="iab-consent-banner-card"]'
					) as HTMLElement;
					expect(banner?.tabIndex).toBe(-1);
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Props', () => {
		test('should accept primaryButton prop', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner primaryButton="accept" />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="iab-consent-banner-card"]'
					);
					expect(banner).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept trapFocus prop', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner trapFocus={true} />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="iab-consent-banner-card"]'
					);
					expect(banner?.getAttribute('aria-modal')).toBe('true');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Content', () => {
		test('should display header section', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const header = document.querySelector(
						'[data-testid="iab-consent-banner-header"]'
					);
					expect(header).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should display footer section', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const footer = document.querySelector(
						'[data-testid="iab-consent-banner-footer"]'
					);
					expect(footer).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});
});
