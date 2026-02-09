/**
 * IAB Consent Banner Unit Tests
 *
 * Tests for IAB Consent Banner component display and behavior.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/types/consent-manager';
import { IABConsentBanner } from '../iab-consent-banner';

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

// Mock fetch for GVL
const mockGVL = {
	gvlSpecificationVersion: 3,
	vendorListVersion: 142,
	tcfPolicyVersion: 5,
	lastUpdated: '2024-01-15T16:00:23Z',
	purposes: {
		1: {
			id: 1,
			name: 'Store and/or access information',
			description: '',
			illustrations: [],
		},
		2: {
			id: 2,
			name: 'Use limited data to select advertising',
			description: '',
			illustrations: [],
		},
	},
	specialPurposes: {
		1: { id: 1, name: 'Security', description: '', illustrations: [] },
	},
	features: {
		1: {
			id: 1,
			name: 'Match and combine data',
			description: '',
			illustrations: [],
		},
	},
	specialFeatures: {
		1: {
			id: 1,
			name: 'Use precise geolocation',
			description: '',
			illustrations: [],
		},
	},
	vendors: {
		1: {
			id: 1,
			name: 'Test Vendor',
			purposes: [1, 2],
			legIntPurposes: [],
			specialPurposes: [],
			features: [],
			specialFeatures: [],
			flexiblePurposes: [],
			cookieMaxAgeSeconds: 0,
			usesCookies: false,
			cookieRefresh: false,
			usesNonCookieAccess: false,
			urls: [],
		},
	},
	stacks: {
		1: {
			id: 1,
			name: 'Test Stack',
			description: '',
			purposes: [2],
			specialFeatures: [],
		},
	},
};

globalThis.fetch = vi.fn(() =>
	Promise.resolve(
		new Response(JSON.stringify(mockGVL), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	)
) as typeof fetch;

const defaultIABOptions: ConsentManagerOptions = {
	mode: 'offline',
	iab: {
		enabled: true,
		cmpId: 160,
		cmpVersion: 1,
	},
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
		clearConsentRuntimeCache();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	describe('Component Rendering', () => {
		test('should render banner when IAB is enabled', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentManagerProvider>
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
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentManagerProvider>
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
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentManagerProvider>
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
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentManagerProvider>
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
	});

	describe('Accessibility', () => {
		test('should have dialog role', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="iab-consent-banner-card"]'
					);
					expect(banner?.getAttribute('role')).toBe('dialog');
				},
				{ timeout: 3000 }
			);
		});

		test('should have aria-label', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentManagerProvider>
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
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="iab-consent-banner-card"]'
					) as HTMLElement;
					expect(banner?.tabIndex).toBe(0);
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Props', () => {
		test('should accept primaryButton prop', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner primaryButton="accept" />
				</ConsentManagerProvider>
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
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner trapFocus={true} />
				</ConsentManagerProvider>
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
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentManagerProvider>
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
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
				</ConsentManagerProvider>
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
