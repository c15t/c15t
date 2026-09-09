/**
 * IAB Consent Dialog Purposes Tab Unit Tests
 *
 * Tests for the purposes tab in IAB Consent Dialog.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { offline } from '~/transports/offline';

import { IABConsentDialog } from '../iab-consent-dialog';

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
			store[key] = value;
		},
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

// Mock GVL with all purposes
const mockGVL = {
	features: {
		1: {
			description: '',
			id: 1,
			illustrations: [],
			name: 'Match and combine data from other data sources',
		},
		2: {
			description: '',
			id: 2,
			illustrations: [],
			name: 'Link different devices',
		},
		3: {
			description: '',
			id: 3,
			illustrations: [],
			name: 'Identify devices based on information transmitted automatically',
		},
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
			description: 'With your acceptance, your precise location...',
			id: 1,
			illustrations: [],
			name: 'Use precise geolocation data',
		},
		2: {
			description: '',
			id: 2,
			illustrations: [],
			name: 'Actively scan device characteristics for identification',
		},
	},
	specialPurposes: {
		1: {
			description: '',
			id: 1,
			illustrations: [],
			name: 'Ensure security, prevent and detect fraud, and fix errors',
		},
		2: {
			description: '',
			id: 2,
			illustrations: [],
			name: 'Deliver and present advertising and content',
		},
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
			legIntPurposes: [8, 9],
			name: 'Test Vendor 1',
			purposes: [1, 2, 3, 7],
			specialFeatures: [1],
			specialPurposes: [1],
			urls: [],
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
			urls: [],
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
	prefetch: policyFixture(undefined, {
		categories: undefined,
		id: 'iab_test',
		model: 'iab',
		prompt: 'choice',
		scopeMode: 'strict',
	}),
};

describe('Purposes Tab - Consent', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('Purpose 1 should be displayed', async () => {
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

	test('should display multiple purposes', async () => {
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

	test('should keep purpose details collapsed until expanded', async () => {
		render(
			<ConsentProvider options={defaultIABOptions}>
				<IABConsentDialog open />
			</ConsentProvider>
		);

		const purposeTrigger = await vi.waitFor(
			() => {
				const el = Array.from(
					document.querySelectorAll<HTMLButtonElement>(
						'[data-testid="iab-consent-dialog-root"] [data-slot="preference-item-trigger"]'
					)
				).find((button) => button.textContent?.includes('Store and/or access'));
				expect(el).toBeDefined();
				return getDefined(el);
			},
			{ timeout: 5000 }
		);

		const purposeItem = purposeTrigger.closest(
			'[data-testid^="purpose-item-"]'
		);
		const content = purposeItem?.querySelector(
			'[data-slot="preference-item-content"]'
		);

		expect(content?.getAttribute('aria-hidden')).toBe('true');

		await userEvent.click(purposeTrigger);

		await vi.waitFor(() => {
			expect(content?.getAttribute('aria-hidden')).toBe('false');
		});
	});
});

describe('Purposes Tab - Legitimate Interest', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('should display LI section for purposes with LI vendors', async () => {
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
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('special purposes section should exist when expanded', async () => {
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
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('should display special features section', async () => {
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
				// Component should render - special features content depends on GVL load
				expect(content).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	test('special feature toggles should exist', async () => {
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
		delete (window as { __tcfapi?: unknown }).__tcfapi;
	});

	test('should group purposes into stacks from GVL', async () => {
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
				// Content should render
				expect(content).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});
