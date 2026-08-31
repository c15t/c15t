/**
 * Sample GVL data for testing.
 *
 * This file contains realistic sample data that mirrors actual GVL structure.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList } from '../../../tcf/iab-tcf-types';

/**
 * A minimal GVL for fast tests.
 */
export const minimalGVL: GlobalVendorList = {
	features: {
		1: {
			description:
				'Information about your activity on this service may be matched and combined with other information relating to you and originating from various sources.',
			id: 1,
			illustrations: [],
			name: 'Match and combine data from other data sources',
		},
	},
	gvlSpecificationVersion: 3,
	lastUpdated: '2024-01-15T16:00:23Z',
	purposes: {
		1: {
			description:
				'Cookies, device or similar online identifiers (e.g. login-based identifiers, randomly assigned identifiers, network based identifiers) together with other information (e.g. browser type and information, language, screen size, supported technologies etc.) can be stored or read on your device to recognise it each time it connects to an app or to a website, for one or several of the purposes presented here.',
			id: 1,
			illustrations: [
				'Most purposes explained in this notice rely on the storage or accessing of information from your device when you use an app or visit a website. For example, a vendor or publisher might need to store a cookie on your device during your first visit on a website, to be able to recognise your device during your next visits (by accessing this cookie each time).',
			],
			name: 'Store and/or access information on a device',
		},
	},
	specialFeatures: {
		1: {
			description:
				'With your acceptance, your precise location (within a radius of less than 500 metres) may be used in support of the purposes explained in this notice.',
			id: 1,
			illustrations: [],
			name: 'Use precise geolocation data',
		},
	},
	specialPurposes: {
		1: {
			description:
				'Your data can be used to monitor for and prevent unusual and possibly fraudulent activity.',
			id: 1,
			illustrations: [],
			name: 'Ensure security, prevent and detect fraud, and fix errors',
		},
	},
	stacks: {
		1: {
			description:
				'Advertising can be presented based on limited data. Advertising performance can be measured.',
			id: 1,
			name: 'Advertising based on limited data and advertising measurement',
			purposes: [2, 7],
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
			urls: [
				{
					langId: 'en',
					privacy: 'https://vdx.tv/privacy/',
				},
			],
			usesCookies: true,
			usesNonCookieAccess: false,
		},
	},
};

/**
 * A more complete GVL with multiple vendors.
 */
export const completeGVL: GlobalVendorList = {
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
