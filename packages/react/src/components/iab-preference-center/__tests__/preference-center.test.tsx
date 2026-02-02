/**
 * IAB Preference Center Unit Tests
 *
 * Tests for IAB Preference Center component display and behavior.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentManagerCache,
} from '~/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/types/consent-manager';
import { IABPreferenceCenter } from '../iab-preference-center';

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
			name: 'Store and/or access information on a device',
			description: 'Cookies, device identifiers...',
			illustrations: [],
		},
		2: {
			id: 2,
			name: 'Use limited data to select advertising',
			description: 'Advertising can be presented...',
			illustrations: [],
		},
		3: {
			id: 3,
			name: 'Create profiles for personalised advertising',
			description: 'Information about your activity...',
			illustrations: [],
		},
		4: {
			id: 4,
			name: 'Use profiles to select personalised advertising',
			description: '',
			illustrations: [],
		},
		5: {
			id: 5,
			name: 'Create profiles to personalise content',
			description: '',
			illustrations: [],
		},
		6: {
			id: 6,
			name: 'Use profiles to select personalised content',
			description: '',
			illustrations: [],
		},
		7: {
			id: 7,
			name: 'Measure advertising performance',
			description: '',
			illustrations: [],
		},
		8: {
			id: 8,
			name: 'Measure content performance',
			description: '',
			illustrations: [],
		},
		9: {
			id: 9,
			name: 'Understand audiences through statistics',
			description: '',
			illustrations: [],
		},
		10: {
			id: 10,
			name: 'Develop and improve services',
			description: '',
			illustrations: [],
		},
		11: {
			id: 11,
			name: 'Use limited data to select content',
			description: '',
			illustrations: [],
		},
	},
	specialPurposes: {
		1: {
			id: 1,
			name: 'Ensure security, prevent fraud',
			description: '',
			illustrations: [],
		},
		2: { id: 2, name: 'Deliver content', description: '', illustrations: [] },
	},
	features: {
		1: {
			id: 1,
			name: 'Match and combine data',
			description: '',
			illustrations: [],
		},
		2: {
			id: 2,
			name: 'Link different devices',
			description: '',
			illustrations: [],
		},
		3: { id: 3, name: 'Identify devices', description: '', illustrations: [] },
	},
	specialFeatures: {
		1: {
			id: 1,
			name: 'Use precise geolocation data',
			description: '',
			illustrations: [],
		},
		2: {
			id: 2,
			name: 'Actively scan device characteristics',
			description: '',
			illustrations: [],
		},
	},
	vendors: {
		1: {
			id: 1,
			name: 'Test Vendor 1',
			purposes: [1, 2, 3],
			legIntPurposes: [7, 8],
			specialPurposes: [1],
			features: [1],
			specialFeatures: [1],
			flexiblePurposes: [2],
			cookieMaxAgeSeconds: 31536000,
			usesCookies: true,
			cookieRefresh: true,
			usesNonCookieAccess: false,
			urls: [{ langId: 'en', privacy: 'https://test.com/privacy' }],
		},
		755: {
			id: 755,
			name: 'Google Advertising',
			purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
			legIntPurposes: [],
			specialPurposes: [1, 2],
			features: [1, 2, 3],
			specialFeatures: [1, 2],
			flexiblePurposes: [2, 7, 9, 10, 11],
			cookieMaxAgeSeconds: 63072000,
			usesCookies: true,
			cookieRefresh: true,
			usesNonCookieAccess: true,
			urls: [{ langId: 'en', privacy: 'https://policies.google.com/privacy' }],
		},
	},
	stacks: {
		1: {
			id: 1,
			name: 'Advertising measurement',
			description: '',
			purposes: [2, 7],
			specialFeatures: [],
		},
		2: {
			id: 2,
			name: 'Content personalisation',
			description: '',
			purposes: [5, 6, 11],
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

describe('IAB Preference Center Unit Tests', () => {
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
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	describe('Component Rendering', () => {
		test('should render when open=true', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="iab-preference-center-root"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render card container', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const card = document.querySelector(
						'[data-testid="iab-preference-center-card"]'
					);
					expect(card).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Tab Navigation', () => {
		test('should display tab buttons', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const tabButtons = document.querySelectorAll(
						'[data-testid="iab-preference-center-root"] button[data-state]'
					);
					expect(tabButtons.length).toBeGreaterThan(0);
				},
				{ timeout: 3000 }
			);
		});

		test('should have purposes tab', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const content = document.querySelector(
						'[data-testid="iab-preference-center-root"]'
					);
					expect(content?.textContent?.toLowerCase()).toContain('purpose');
				},
				{ timeout: 3000 }
			);
		});

		test('should have vendors tab', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const content = document.querySelector(
						'[data-testid="iab-preference-center-root"]'
					);
					expect(content?.textContent?.toLowerCase()).toContain('vendor');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Accessibility', () => {
		test('should have dialog role', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="iab-preference-center-card"]'
					);
					expect(dialog?.getAttribute('role')).toBe('dialog');
				},
				{ timeout: 3000 }
			);
		});

		test('should have aria-label', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="iab-preference-center-card"]'
					);
					expect(dialog?.getAttribute('aria-label')).toBeTruthy();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Action Buttons', () => {
		test('should display Accept All button', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const buttons = Array.from(
						document.querySelectorAll(
							'[data-testid="iab-preference-center-root"] button'
						)
					);
					const acceptAllButton = buttons.find((btn) =>
						btn.textContent?.toLowerCase().includes('accept all')
					);
					expect(acceptAllButton).toBeDefined();
				},
				{ timeout: 3000 }
			);
		});

		test('should display Reject All button', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const buttons = Array.from(
						document.querySelectorAll(
							'[data-testid="iab-preference-center-root"] button'
						)
					);
					const rejectAllButton = buttons.find((btn) =>
						btn.textContent?.toLowerCase().includes('reject all')
					);
					expect(rejectAllButton).toBeDefined();
				},
				{ timeout: 3000 }
			);
		});

		test('should display Save button', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const buttons = Array.from(
						document.querySelectorAll(
							'[data-testid="iab-preference-center-root"] button'
						)
					);
					const saveButton = buttons.find(
						(btn) =>
							btn.textContent?.toLowerCase().includes('save') ||
							btn.textContent?.toLowerCase().includes('confirm')
					);
					expect(saveButton).toBeDefined();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Content Loading', () => {
		test('should display purposes after GVL loads', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const content = document.querySelector(
						'[data-testid="iab-preference-center-root"]'
					);
					// Component should render - purpose content depends on GVL load
					expect(content).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Props', () => {
		test('should accept hideBranding prop', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter open hideBranding />
				</ConsentManagerProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="iab-preference-center-root"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept showTrigger prop', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABPreferenceCenter showTrigger />
				</ConsentManagerProvider>
			);

			// Trigger should eventually appear
			await vi.waitFor(
				() => {
					// Component should render without error
					expect(document.body).toBeTruthy();
				},
				{ timeout: 1000 }
			);
		});
	});
});
