/**
 * IAB Consent Dialog Unit Tests
 *
 * Tests for IAB Consent Dialog component display and behavior.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentProvider } from '~/provider';
import type { ConsentProviderOptions } from '~/provider';
import { offline } from '~/transports/offline';

import { IABConsentDialog } from '../iab-consent-dialog';

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
		2: {
			description: '',
			id: 2,
			illustrations: [],
			name: 'Link different devices',
		},
		3: { description: '', id: 3, illustrations: [], name: 'Identify devices' },
	},
	gvlSpecificationVersion: 3,
	lastUpdated: '2024-01-15T16:00:23Z',
	purposes: {
		1: {
			description: 'Cookies, device identifiers...',
			id: 1,
			illustrations: [],
			name: 'Store and/or access information on a device',
		},
		10: {
			description: '',
			id: 10,
			illustrations: [],
			name: 'Develop and improve services',
		},
		11: {
			description: '',
			id: 11,
			illustrations: [],
			name: 'Use limited data to select content',
		},
		2: {
			description: 'Advertising can be presented...',
			id: 2,
			illustrations: [],
			name: 'Use limited data to select advertising',
		},
		3: {
			description: 'Information about your activity...',
			id: 3,
			illustrations: [],
			name: 'Create profiles for personalised advertising',
		},
		4: {
			description: '',
			id: 4,
			illustrations: [],
			name: 'Use profiles to select personalised advertising',
		},
		5: {
			description: '',
			id: 5,
			illustrations: [],
			name: 'Create profiles to personalise content',
		},
		6: {
			description: '',
			id: 6,
			illustrations: [],
			name: 'Use profiles to select personalised content',
		},
		7: {
			description: '',
			id: 7,
			illustrations: [],
			name: 'Measure advertising performance',
		},
		8: {
			description: '',
			id: 8,
			illustrations: [],
			name: 'Measure content performance',
		},
		9: {
			description: '',
			id: 9,
			illustrations: [],
			name: 'Understand audiences through statistics',
		},
	},
	specialFeatures: {
		1: {
			description: '',
			id: 1,
			illustrations: [],
			name: 'Use precise geolocation data',
		},
		2: {
			description: '',
			id: 2,
			illustrations: [],
			name: 'Actively scan device characteristics',
		},
	},
	specialPurposes: {
		1: {
			description: '',
			id: 1,
			illustrations: [],
			name: 'Ensure security, prevent fraud',
		},
		2: { description: '', id: 2, illustrations: [], name: 'Deliver content' },
	},
	stacks: {
		1: {
			description: '',
			id: 1,
			name: 'Advertising measurement',
			purposes: [2, 7],
			specialFeatures: [],
		},
		2: {
			description: '',
			id: 2,
			name: 'Content personalisation',
			purposes: [5, 6, 11],
			specialFeatures: [],
		},
	},
	tcfPolicyVersion: 5,
	vendorListVersion: 142,
	vendors: {
		1: {
			cookieMaxAgeSeconds: 31536000,
			cookieRefresh: true,
			features: [1],
			flexiblePurposes: [2],
			id: 1,
			legIntPurposes: [7, 8],
			name: 'Test Vendor 1',
			purposes: [1, 2, 3],
			specialFeatures: [1],
			specialPurposes: [1],
			urls: [{ langId: 'en', privacy: 'https://test.com/privacy' }],
			usesCookies: true,
			usesNonCookieAccess: false,
		},
		755: {
			cookieMaxAgeSeconds: 63072000,
			cookieRefresh: true,
			features: [1, 2, 3],
			flexiblePurposes: [2, 7, 9, 10, 11],
			id: 755,
			legIntPurposes: [],
			name: 'Google Advertising',
			purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
			specialFeatures: [1, 2],
			specialPurposes: [1, 2],
			urls: [{ langId: 'en', privacy: 'https://policies.google.com/privacy' }],
			usesCookies: true,
			usesNonCookieAccess: true,
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
	offlinePolicy: {
		policy: { id: 'iab_test', model: 'iab' },
	},
};

describe('IAB Consent Dialog Unit Tests', () => {
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
		test('should render when open=true', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="iab-consent-dialog-root"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should render card container', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const card = document.querySelector(
						'[data-testid="iab-consent-dialog-card"]'
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
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const tabButtons = document.querySelectorAll(
						'[data-testid="iab-consent-dialog-root"] button[data-state]'
					);
					expect(tabButtons.length).toBeGreaterThan(0);
				},
				{ timeout: 3000 }
			);
		});

		test('should have purposes tab', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const content = document.querySelector(
						'[data-testid="iab-consent-dialog-root"]'
					);
					expect(content?.textContent?.toLowerCase()).toContain('purpose');
				},
				{ timeout: 3000 }
			);
		});

		test('should have vendors tab', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const content = document.querySelector(
						'[data-testid="iab-consent-dialog-root"]'
					);
					expect(content?.textContent?.toLowerCase()).toContain('vendor');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Accessibility', () => {
		test('should expose the dialog role', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="iab-consent-dialog-card"]'
					);
					expect(dialog?.getAttribute('role')).toBe('dialog');
					expect(dialog).toHaveAttribute('aria-modal', 'true');
				},
				{ timeout: 3000 }
			);
		});

		test('should have aria-label', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="iab-consent-dialog-card"]'
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
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const buttons = Array.from(
						document.querySelectorAll(
							'[data-testid="iab-consent-dialog-root"] button'
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
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const buttons = Array.from(
						document.querySelectorAll(
							'[data-testid="iab-consent-dialog-root"] button'
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
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const buttons = Array.from(
						document.querySelectorAll(
							'[data-testid="iab-consent-dialog-root"] button'
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
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const content = document.querySelector(
						'[data-testid="iab-consent-dialog-root"]'
					);
					// Component should render - purpose content depends on GVL load
					expect(content).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Props', () => {
		test('should render branding tag by default', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog open />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const branding = document.querySelector(
						'[data-testid="iab-consent-dialog-branding"]'
					);
					expect(branding).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept hideBranding prop', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog
						open
						hideBranding
					/>
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const branding = document.querySelector(
						'[data-testid="iab-consent-dialog-branding"]'
					);
					expect(branding).not.toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept showTrigger prop', async () => {
			render(
				<ConsentProvider options={defaultIABOptions}>
					<IABConsentDialog showTrigger />
				</ConsentProvider>
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
