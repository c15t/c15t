/**
 * Sample GVL data for testing.
 *
 * This file contains realistic sample data that mirrors actual GVL structure.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList } from '../../../../types/iab-tcf';

/**
 * A minimal GVL for fast tests.
 */
export const minimalGVL: GlobalVendorList = {
	gvlSpecificationVersion: 3,
	vendorListVersion: 142,
	tcfPolicyVersion: 5,
	lastUpdated: '2024-01-15T16:00:23Z',
	purposes: {
		1: {
			id: 1,
			name: 'Store and/or access information on a device',
			description:
				'Cookies, device or similar online identifiers (e.g. login-based identifiers, randomly assigned identifiers, network based identifiers) together with other information (e.g. browser type and information, language, screen size, supported technologies etc.) can be stored or read on your device to recognise it each time it connects to an app or to a website, for one or several of the purposes presented here.',
			illustrations: [
				'Most purposes explained in this notice rely on the storage or accessing of information from your device when you use an app or visit a website. For example, a vendor or publisher might need to store a cookie on your device during your first visit on a website, to be able to recognise your device during your next visits (by accessing this cookie each time).',
			],
		},
	},
	specialPurposes: {
		1: {
			id: 1,
			name: 'Ensure security, prevent and detect fraud, and fix errors',
			description:
				'Your data can be used to monitor for and prevent unusual and possibly fraudulent activity.',
			illustrations: [],
		},
	},
	features: {
		1: {
			id: 1,
			name: 'Match and combine data from other data sources',
			description:
				'Information about your activity on this service may be matched and combined with other information relating to you and originating from various sources.',
			illustrations: [],
		},
	},
	specialFeatures: {
		1: {
			id: 1,
			name: 'Use precise geolocation data',
			description:
				'With your acceptance, your precise location (within a radius of less than 500 metres) may be used in support of the purposes explained in this notice.',
			illustrations: [],
		},
	},
	vendors: {
		1: {
			id: 1,
			name: 'Exponential Interactive, Inc d/b/a VDX.tv',
			purposes: [1, 2, 3, 4, 7, 9, 10],
			legIntPurposes: [],
			flexiblePurposes: [],
			specialPurposes: [1, 2],
			features: [1, 2, 3],
			specialFeatures: [1],
			cookieMaxAgeSeconds: 7776000,
			usesCookies: true,
			cookieRefresh: true,
			usesNonCookieAccess: false,
			urls: [
				{
					langId: 'en',
					privacy: 'https://vdx.tv/privacy/',
				},
			],
		},
	},
	stacks: {
		1: {
			id: 1,
			name: 'Advertising based on limited data and advertising measurement',
			description:
				'Advertising can be presented based on limited data. Advertising performance can be measured.',
			purposes: [2, 7],
			specialFeatures: [],
		},
	},
};

/**
 * A more complete GVL with multiple vendors.
 */
export const completeGVL: GlobalVendorList = {
	gvlSpecificationVersion: 3,
	vendorListVersion: 142,
	tcfPolicyVersion: 5,
	lastUpdated: '2024-01-15T16:00:23Z',
	purposes: {
		1: {
			id: 1,
			name: 'Store and/or access information on a device',
			description: 'Cookies, device or similar online identifiers...',
			illustrations: ['Most purposes explained in this notice...'],
		},
		2: {
			id: 2,
			name: 'Use limited data to select advertising',
			description:
				'Advertising can be presented to you based on limited data...',
			illustrations: [],
		},
		3: {
			id: 3,
			name: 'Create profiles for personalised advertising',
			description: 'Information about your activity on this service...',
			illustrations: [],
		},
		4: {
			id: 4,
			name: 'Use profiles to select personalised advertising',
			description: 'Advertising can be presented to you based on a profile...',
			illustrations: [],
		},
		5: {
			id: 5,
			name: 'Create profiles to personalise content',
			description: 'Information about your activity on this service...',
			illustrations: [],
		},
		6: {
			id: 6,
			name: 'Use profiles to select personalised content',
			description: 'Content can be presented to you based on a profile...',
			illustrations: [],
		},
		7: {
			id: 7,
			name: 'Measure advertising performance',
			description: 'The performance and effectiveness of ads...',
			illustrations: [],
		},
		8: {
			id: 8,
			name: 'Measure content performance',
			description: 'The performance and effectiveness of content...',
			illustrations: [],
		},
		9: {
			id: 9,
			name: 'Understand audiences through statistics or combinations of data',
			description:
				'Reports can be generated based on the combination of data sets...',
			illustrations: [],
		},
		10: {
			id: 10,
			name: 'Develop and improve services',
			description: 'Your data can be used to improve existing systems...',
			illustrations: [],
		},
		11: {
			id: 11,
			name: 'Use limited data to select content',
			description: 'Content can be presented to you based on limited data...',
			illustrations: [],
		},
	},
	specialPurposes: {
		1: {
			id: 1,
			name: 'Ensure security, prevent and detect fraud, and fix errors',
			description:
				'Your data can be used to monitor for and prevent unusual...',
			illustrations: [],
		},
		2: {
			id: 2,
			name: 'Deliver and present advertising and content',
			description:
				'Certain information is used to ensure technical compatibility...',
			illustrations: [],
		},
	},
	features: {
		1: {
			id: 1,
			name: 'Match and combine data from other data sources',
			description: 'Information about your activity on this service...',
			illustrations: [],
		},
		2: {
			id: 2,
			name: 'Link different devices',
			description: 'In support of the purposes explained in this notice...',
			illustrations: [],
		},
		3: {
			id: 3,
			name: 'Identify devices based on information transmitted automatically',
			description: 'Your device might be distinguished from other devices...',
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
			description:
				'With your acceptance, certain characteristics specific to your device...',
			illustrations: [],
		},
	},
	vendors: {
		1: {
			id: 1,
			name: 'Exponential Interactive, Inc d/b/a VDX.tv',
			purposes: [1, 2, 3, 4, 7, 9, 10],
			legIntPurposes: [],
			flexiblePurposes: [],
			specialPurposes: [1, 2],
			features: [1, 2, 3],
			specialFeatures: [1],
			cookieMaxAgeSeconds: 7776000,
			usesCookies: true,
			cookieRefresh: true,
			usesNonCookieAccess: false,
			urls: [{ langId: 'en', privacy: 'https://vdx.tv/privacy/' }],
		},
		2: {
			id: 2,
			name: 'Captify Technologies Limited',
			purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
			legIntPurposes: [],
			flexiblePurposes: [2, 7, 8, 9],
			specialPurposes: [1, 2],
			features: [1, 2, 3],
			specialFeatures: [],
			cookieMaxAgeSeconds: 31536000,
			usesCookies: true,
			cookieRefresh: true,
			usesNonCookieAccess: true,
			urls: [
				{
					langId: 'en',
					privacy: 'https://www.captifytechnologies.com/privacy-notice/',
				},
			],
		},
		10: {
			id: 10,
			name: 'Index Exchange, Inc.',
			purposes: [1],
			legIntPurposes: [2, 7, 9, 10],
			flexiblePurposes: [],
			specialPurposes: [1, 2],
			features: [2, 3],
			specialFeatures: [],
			cookieMaxAgeSeconds: 31536000,
			usesCookies: true,
			cookieRefresh: true,
			usesNonCookieAccess: false,
			urls: [
				{ langId: 'en', privacy: 'https://www.indexexchange.com/privacy/' },
			],
		},
		755: {
			id: 755,
			name: 'Google Advertising Products',
			purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
			legIntPurposes: [],
			flexiblePurposes: [2, 7, 9, 10, 11],
			specialPurposes: [1, 2],
			features: [1, 2, 3],
			specialFeatures: [1, 2],
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
			name: 'Advertising based on limited data and advertising measurement',
			description: 'Advertising can be presented based on limited data.',
			purposes: [2, 7],
			specialFeatures: [],
		},
		2: {
			id: 2,
			name: 'Personalised advertising profile and target audience measurement',
			description: 'Advertising can be personalised based on a profile.',
			purposes: [3, 4, 9],
			specialFeatures: [],
		},
		3: {
			id: 3,
			name: 'Content personalisation',
			description: 'Content can be personalised based on a profile.',
			purposes: [5, 6, 11],
			specialFeatures: [],
		},
		4: {
			id: 4,
			name: 'Content measurement and product development',
			description: 'Content performance can be measured.',
			purposes: [8, 10],
			specialFeatures: [],
		},
	},
};
