/**
 * Mock Consent State for IAB React Component Tests
 *
 * Provides mock IAB state objects for testing React components.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList } from '@c15t/core';

/**
 * Mock GVL for React component testing
 */
export const mockGVL: GlobalVendorList = {
	features: {
		1: {
			description: 'Information about your activity on this service...',
			id: 1,
			illustrations: [],
			name: 'Match and combine data from other data sources',
		},
		2: {
			description: 'In support of the purposes explained in this notice...',
			id: 2,
			illustrations: [],
			name: 'Link different devices',
		},
		3: {
			description: 'Your device might be distinguished from other devices...',
			id: 3,
			illustrations: [],
			name: 'Identify devices based on information transmitted automatically',
		},
	},
	gvlSpecificationVersion: 3,
	lastUpdated: '2024-01-15T16:00:23Z',
	purposes: {
		1: {
			description: 'Cookies, device or similar online identifiers...',
			id: 1,
			illustrations: ['Most purposes explained in this notice...'],
			name: 'Store and/or access information on a device',
		},
		10: {
			description: 'Your data can be used to improve existing systems...',
			id: 10,
			illustrations: [],
			name: 'Develop and improve services',
		},
		11: {
			description: 'Content can be presented to you based on limited data...',
			id: 11,
			illustrations: [],
			name: 'Use limited data to select content',
		},
		2: {
			description:
				'Advertising can be presented to you based on limited data...',
			id: 2,
			illustrations: [],
			name: 'Use limited data to select advertising',
		},
		3: {
			description: 'Information about your activity on this service...',
			id: 3,
			illustrations: [],
			name: 'Create profiles for personalised advertising',
		},
		4: {
			description: 'Advertising can be presented to you based on a profile...',
			id: 4,
			illustrations: [],
			name: 'Use profiles to select personalised advertising',
		},
		5: {
			description: 'Information about your activity on this service...',
			id: 5,
			illustrations: [],
			name: 'Create profiles to personalise content',
		},
		6: {
			description: 'Content can be presented to you based on a profile...',
			id: 6,
			illustrations: [],
			name: 'Use profiles to select personalised content',
		},
		7: {
			description: 'The performance and effectiveness of ads...',
			id: 7,
			illustrations: [],
			name: 'Measure advertising performance',
		},
		8: {
			description: 'The performance and effectiveness of content...',
			id: 8,
			illustrations: [],
			name: 'Measure content performance',
		},
		9: {
			description:
				'Reports can be generated based on the combination of data sets...',
			id: 9,
			illustrations: [],
			name: 'Understand audiences through statistics or combinations of data',
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
			description:
				'With your acceptance, certain characteristics specific to your device...',
			id: 2,
			illustrations: [],
			name: 'Actively scan device characteristics for identification',
		},
	},
	specialPurposes: {
		1: {
			description:
				'Your data can be used to monitor for and prevent unusual...',
			id: 1,
			illustrations: [],
			name: 'Ensure security, prevent and detect fraud, and fix errors',
		},
		2: {
			description:
				'Certain information is used to ensure technical compatibility...',
			id: 2,
			illustrations: [],
			name: 'Deliver and present advertising and content',
		},
	},
	stacks: {
		1: {
			description: 'Advertising can be presented based on limited data.',
			id: 1,
			name: 'Advertising based on limited data and advertising measurement',
			purposes: [2, 7],
			specialFeatures: [],
		},
		2: {
			description: 'Advertising can be personalised based on a profile.',
			id: 2,
			name: 'Personalised advertising profile and target audience measurement',
			purposes: [3, 4, 9],
			specialFeatures: [],
		},
		3: {
			description: 'Content can be personalised based on a profile.',
			id: 3,
			name: 'Content personalisation',
			purposes: [5, 6, 11],
			specialFeatures: [],
		},
		4: {
			description: 'Content performance can be measured.',
			id: 4,
			name: 'Content measurement and product development',
			purposes: [8, 10],
			specialFeatures: [],
		},
	},
	tcfPolicyVersion: 5,
	vendorListVersion: 142,
	vendors: {
		1: {
			cookieMaxAgeSeconds: 7776000,
			cookieRefresh: true,
			features: [1, 2, 3],
			flexiblePurposes: [],
			id: 1,
			legIntPurposes: [],
			name: 'Exponential Interactive, Inc d/b/a VDX.tv',
			purposes: [1, 2, 3, 4, 7, 9, 10],
			specialFeatures: [1],
			specialPurposes: [1, 2],
			urls: [{ langId: 'en', privacy: 'https://vdx.tv/privacy/' }],
			usesCookies: true,
			usesNonCookieAccess: false,
		},
		10: {
			cookieMaxAgeSeconds: 31536000,
			cookieRefresh: true,
			features: [2, 3],
			flexiblePurposes: [],
			id: 10,
			legIntPurposes: [2, 7, 9, 10],
			name: 'Index Exchange, Inc.',
			purposes: [1],
			specialFeatures: [],
			specialPurposes: [1, 2],
			urls: [
				{ langId: 'en', privacy: 'https://www.indexexchange.com/privacy/' },
			],
			usesCookies: true,
			usesNonCookieAccess: false,
		},
		2: {
			cookieMaxAgeSeconds: 31536000,
			cookieRefresh: true,
			features: [1, 2, 3],
			flexiblePurposes: [2, 7, 8, 9],
			id: 2,
			legIntPurposes: [],
			name: 'Captify Technologies Limited',
			purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
			specialFeatures: [],
			specialPurposes: [1, 2],
			urls: [
				{
					langId: 'en',
					privacy: 'https://www.captifytechnologies.com/privacy-notice/',
				},
			],
			usesCookies: true,
			usesNonCookieAccess: true,
		},
		755: {
			cookieMaxAgeSeconds: 63072000,
			cookieRefresh: true,
			features: [1, 2, 3],
			flexiblePurposes: [2, 7, 9, 10, 11],
			id: 755,
			legIntPurposes: [],
			name: 'Google Advertising Products',
			purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
			specialFeatures: [1, 2],
			specialPurposes: [1, 2],
			urls: [{ langId: 'en', privacy: 'https://policies.google.com/privacy' }],
			usesCookies: true,
			usesNonCookieAccess: true,
		},
	},
};

/**
 * Mock IAB state for testing components
 */
export const createMockIABState = function createMockIABState(
	overrides?: Partial<{
		gvl: GlobalVendorList | null;
		isLoadingGVL: boolean;
		purposeConsents: Record<number, boolean>;
		purposeLegitimateInterests: Record<number, boolean>;
		vendorConsents: Record<string, boolean>;
		vendorLegitimateInterests: Record<string, boolean>;
		specialFeatureOptIns: Record<number, boolean>;
		vendorsDisclosed: Record<number, boolean>;
		tcString: string | null;
		preferenceCenterTab: 'purposes' | 'vendors';
	}>
) {
	return {
		_updateState: () => {},
		acceptAll: () => {},
		cmpApi: null,
		config: {
			cmpId: 160,
			cmpVersion: 1,
			enabled: true,
		},
		gvl: mockGVL,
		isLoadingGVL: false,
		nonIABVendors: [],
		preferenceCenterTab: 'purposes' as const,
		purposeConsents: {
			1: false,
			10: false,
			11: false,
			2: false,
			3: false,
			4: false,
			5: false,
			6: false,
			7: false,
			8: false,
			9: false,
		},
		purposeLegitimateInterests: {
			10: true,
			11: true,
			2: true,
			3: true,
			4: true,
			5: true,
			6: true,
			7: true,
			8: true,
			9: true,
		},
		rejectAll: () => {},
		save: () => {},
		setPreferenceCenterTab: () => {},
		// Actions
		setPurposeConsent: () => {},
		setPurposeLegitimateInterest: () => {},
		setSpecialFeatureOptIn: () => {},
		setVendorConsent: () => {},
		setVendorLegitimateInterest: () => {},
		specialFeatureOptIns: {
			1: false,
			2: false,
		},
		tcString: null,
		vendorConsents: {},
		vendorLegitimateInterests: {},
		vendorsDisclosed: {},
		...overrides,
	};
};

/**
 * Mock IAB state with all consents accepted
 */
export const createMockIABStateAllAccepted =
	function createMockIABStateAllAccepted() {
		return createMockIABState({
			purposeConsents: {
				1: true,
				10: true,
				11: true,
				2: true,
				3: true,
				4: true,
				5: true,
				6: true,
				7: true,
				8: true,
				9: true,
			},
			specialFeatureOptIns: {
				1: true,
				2: true,
			},
			vendorConsents: {
				'1': true,
				'10': true,
				'2': true,
				'755': true,
			},
			vendorLegitimateInterests: {
				'1': true,
				'10': true,
				'2': true,
				'755': true,
			},
			vendorsDisclosed: {
				1: true,
				10: true,
				2: true,
				755: true,
			},
		});
	};

/**
 * Mock IAB state with loading GVL
 */
export const createMockIABStateLoading = function createMockIABStateLoading() {
	return createMockIABState({
		gvl: null,
		isLoadingGVL: true,
	});
};

/**
 * Mock IAB state with LI objections
 */
export const createMockIABStateWithLIObjections =
	function createMockIABStateWithLIObjections() {
		return createMockIABState({
			purposeLegitimateInterests: {
				10: true,
				11: true,
				2: true,
				3: true,
				4: true,
				5: true,
				6: true,
				// Objected
				7: false,
				8: true,
				// Objected,
				9: false,
			},
			vendorLegitimateInterests: {
				'1': true,
				// Objected
				'10': false,
				'2': true,
				'755': true,
			},
		});
	};

/**
 * Custom vendor for testing non-IAB vendors
 */
export const mockCustomVendor = {
	cookieMaxAgeSeconds: 31536000,
	dataCategories: [1, 2, 6, 8],
	dataRetentionDays: 365,
	description: 'Custom analytics vendor for testing',
	features: [1],
	id: 'custom-analytics',
	legIntPurposes: [9],
	name: 'Custom Analytics Provider',
	privacyPolicyUrl: 'https://analytics.example.com/privacy',
	purposes: [1, 7, 8, 10],
	usesCookies: true,
};

/**
 * Mock IAB state with custom vendors
 */
export const createMockIABStateWithCustomVendors =
	function createMockIABStateWithCustomVendors() {
		return {
			...createMockIABState(),
			nonIABVendors: [mockCustomVendor],
		};
	};
