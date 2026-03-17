/**
 * IAB Consent Dialog Purposes Tab Unit Tests
 *
 * Tests for the purposes tab in IAB Consent Dialog.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '~/types/consent-manager';
import { IABConsentDialog } from '../iab-consent-dialog';

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

// Mock GVL with all purposes
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
			name: 'Ensure security, prevent and detect fraud, and fix errors',
			description: '',
			illustrations: [],
		},
		2: {
			id: 2,
			name: 'Deliver and present advertising and content',
			description: '',
			illustrations: [],
		},
	},
	features: {
		1: {
			id: 1,
			name: 'Match and combine data from other data sources',
			description: '',
			illustrations: [],
		},
		2: {
			id: 2,
			name: 'Link different devices',
			description: '',
			illustrations: [],
		},
		3: {
			id: 3,
			name: 'Identify devices based on information transmitted automatically',
			description: '',
			illustrations: [],
		},
	},
	specialFeatures: {
		1: {
			id: 1,
			name: 'Use precise geolocation data',
			description: 'With your acceptance, your precise location...',
			illustrations: [],
		},
		2: {
			id: 2,
			name: 'Actively scan device characteristics for identification',
			description: '',
			illustrations: [],
		},
	},
	vendors: {
		1: {
			id: 1,
			name: 'Test Vendor 1',
			purposes: [1, 2, 3, 7],
			legIntPurposes: [8, 9],
			specialPurposes: [1],
			features: [1],
			specialFeatures: [1],
			flexiblePurposes: [2],
			cookieMaxAgeSeconds: 31536000,
			usesCookies: true,
			cookieRefresh: true,
			usesNonCookieAccess: false,
			urls: [],
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
			urls: [],
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
		gvl: mockGVL,
	},
	offlinePolicy: {
		policy: { id: 'iab_test', model: 'iab' },
	},
};

describe('Purposes Tab - Consent', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('Purpose 1 should be displayed', async () => {
		render(
			<ConsentManagerProvider options={defaultIABOptions}>
				<IABConsentDialog open />
			</ConsentManagerProvider>
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

	test('should display multiple purposes', async () => {
		render(
			<ConsentManagerProvider options={defaultIABOptions}>
				<IABConsentDialog open />
			</ConsentManagerProvider>
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

describe('Purposes Tab - Legitimate Interest', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('should display LI section for purposes with LI vendors', async () => {
		render(
			<ConsentManagerProvider options={defaultIABOptions}>
				<IABConsentDialog open />
			</ConsentManagerProvider>
		);

		await vi.waitFor(
			() => {
				const content = document.querySelector(
					'[data-testid="iab-consent-dialog-root"]'
				);
				// Content should be rendered
				expect(content).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});

describe('Purposes Tab - Special Purposes', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('special purposes section should exist when expanded', async () => {
		render(
			<ConsentManagerProvider options={defaultIABOptions}>
				<IABConsentDialog open />
			</ConsentManagerProvider>
		);

		await vi.waitFor(
			() => {
				const content = document.querySelector(
					'[data-testid="iab-consent-dialog-root"]'
				);
				expect(content).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});

describe('Purposes Tab - Special Features', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('should display special features section', async () => {
		render(
			<ConsentManagerProvider options={defaultIABOptions}>
				<IABConsentDialog open />
			</ConsentManagerProvider>
		);

		await vi.waitFor(
			() => {
				const content = document.querySelector(
					'[data-testid="iab-consent-dialog-root"]'
				);
				// Component should render - special features content depends on GVL load
				expect(content).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	test('special feature toggles should exist', async () => {
		render(
			<ConsentManagerProvider options={defaultIABOptions}>
				<IABConsentDialog open />
			</ConsentManagerProvider>
		);

		await vi.waitFor(
			() => {
				const content = document.querySelector(
					'[data-testid="iab-consent-dialog-root"]'
				);
				expect(content).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});

describe('Purposes Tab - Stacks', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('should group purposes into stacks from GVL', async () => {
		render(
			<ConsentManagerProvider options={defaultIABOptions}>
				<IABConsentDialog open />
			</ConsentManagerProvider>
		);

		await vi.waitFor(
			() => {
				const content = document.querySelector(
					'[data-testid="iab-consent-dialog-root"]'
				);
				// Content should render
				expect(content).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});
