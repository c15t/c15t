/**
 * The disclosure the example app draws, as one snapshot of web-model data.
 *
 * The drawer in `@c15t/react-native` renders from props and reads no consent
 * kernel, so a screen showing it has to be handed a whole display model. This
 * is that hand-over, written out: the rows the web resolver builds from the
 * sample GVL in
 * `packages/iab/src/__tests__/fixtures/gvl-sample`, field for field, in the
 * web's own order, with the web's own `testId` on every row.
 *
 * It is data and nothing but data. The nine partner constants below are the
 * four partners repeated: the web re-maps a partner for every row it appears
 * on, and the one field that differs between two of those copies is
 * `usesLegitimateInterest`, which says whether the partner claims that row
 * itself under legitimate interest. Nothing here computes a row, an order, or
 * an id.
 *
 * Written once against the web resolver and kept by hand after that. There is
 * deliberately no generator: the parity test at
 * `packages/react-native/src/components/__tests__/iab-display-parity.test.ts`
 * rebuilds this from the same sample GVL and the web resolver, and its whole
 * value is that a change on the web side has to arrive here as a failure
 * somebody reads.
 *
 * @packageDocumentation
 */

import type {
	ConsentIabDisplayModel,
	ConsentIabProcessedVendor,
} from '@c15t/react-native';
/** Partner 1 on a purpose row it claims under consent. */
const GVL_VENDOR_1: ConsentIabProcessedVendor = {
	cookieMaxAgeSeconds: 7776000,
	cookieRefresh: true,
	dataRetention: undefined,
	deviceStorageDisclosureUrl: null,
	features: [1, 2, 3],
	id: 1,
	isCustom: false,
	legIntPurposes: [],
	legitimateInterestUrl: null,
	name: 'Exponential Interactive, Inc d/b/a VDX.tv',
	policyUrl: '',
	purposes: [1, 2, 3, 4, 7, 9, 10],
	specialFeatures: [1],
	specialPurposes: [1, 2],
	usesCookies: true,
	usesLegitimateInterest: false,
	usesNonCookieAccess: false,
};

/** Partner 1 on the partners tab. The web builds that row off the GVL entry rather than off a purpose, so it is the one shape here that carries the partner's declared data categories and none of its legitimate-interest flags. */
const GVL_VENDOR_1_PARTNER: ConsentIabProcessedVendor = {
	cookieMaxAgeSeconds: 7776000,
	cookieRefresh: true,
	dataDeclaration: [],
	dataRetention: undefined,
	deviceStorageDisclosureUrl: null,
	features: [1, 2, 3],
	id: 1,
	isCustom: false,
	legIntPurposes: [],
	legitimateInterestUrl: null,
	name: 'Exponential Interactive, Inc d/b/a VDX.tv',
	policyUrl: '',
	purposes: [1, 2, 3, 4, 7, 9, 10],
	specialFeatures: [1],
	specialPurposes: [1, 2],
	usesCookies: true,
	usesNonCookieAccess: false,
};

/** Partner 2 on a purpose row it claims under consent. */
const GVL_VENDOR_2: ConsentIabProcessedVendor = {
	cookieMaxAgeSeconds: 31536000,
	cookieRefresh: true,
	dataRetention: undefined,
	deviceStorageDisclosureUrl: null,
	features: [1, 2, 3],
	id: 2,
	isCustom: false,
	legIntPurposes: [],
	legitimateInterestUrl: null,
	name: 'Captify Technologies Limited',
	policyUrl: '',
	purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	specialFeatures: [],
	specialPurposes: [1, 2],
	usesCookies: true,
	usesLegitimateInterest: false,
	usesNonCookieAccess: true,
};

/** Partner 2 on the partners tab. The web builds that row off the GVL entry rather than off a purpose, so it is the one shape here that carries the partner's declared data categories and none of its legitimate-interest flags. */
const GVL_VENDOR_2_PARTNER: ConsentIabProcessedVendor = {
	cookieMaxAgeSeconds: 31536000,
	cookieRefresh: true,
	dataDeclaration: [],
	dataRetention: undefined,
	deviceStorageDisclosureUrl: null,
	features: [1, 2, 3],
	id: 2,
	isCustom: false,
	legIntPurposes: [],
	legitimateInterestUrl: null,
	name: 'Captify Technologies Limited',
	policyUrl: '',
	purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	specialFeatures: [],
	specialPurposes: [1, 2],
	usesCookies: true,
	usesNonCookieAccess: true,
};

/** Partner 10 on a purpose row it claims under consent. */
const GVL_VENDOR_10: ConsentIabProcessedVendor = {
	cookieMaxAgeSeconds: 31536000,
	cookieRefresh: true,
	dataRetention: undefined,
	deviceStorageDisclosureUrl: null,
	features: [2, 3],
	id: 10,
	isCustom: false,
	legIntPurposes: [2, 7, 9, 10],
	legitimateInterestUrl: null,
	name: 'Index Exchange, Inc.',
	policyUrl: '',
	purposes: [1],
	specialFeatures: [],
	specialPurposes: [1, 2],
	usesCookies: true,
	usesLegitimateInterest: false,
	usesNonCookieAccess: false,
};

/** Partner 10 on a purpose row it claims under legitimate interest as well as consent. */
const GVL_VENDOR_10_CLAIMS_LI: ConsentIabProcessedVendor = {
	cookieMaxAgeSeconds: 31536000,
	cookieRefresh: true,
	dataRetention: undefined,
	deviceStorageDisclosureUrl: null,
	features: [2, 3],
	id: 10,
	isCustom: false,
	legIntPurposes: [2, 7, 9, 10],
	legitimateInterestUrl: null,
	name: 'Index Exchange, Inc.',
	policyUrl: '',
	purposes: [1],
	specialFeatures: [],
	specialPurposes: [1, 2],
	usesCookies: true,
	usesLegitimateInterest: true,
	usesNonCookieAccess: false,
};

/** Partner 10 on the partners tab. The web builds that row off the GVL entry rather than off a purpose, so it is the one shape here that carries the partner's declared data categories and none of its legitimate-interest flags. */
const GVL_VENDOR_10_PARTNER: ConsentIabProcessedVendor = {
	cookieMaxAgeSeconds: 31536000,
	cookieRefresh: true,
	dataDeclaration: [],
	dataRetention: undefined,
	deviceStorageDisclosureUrl: null,
	features: [2, 3],
	id: 10,
	isCustom: false,
	legIntPurposes: [2, 7, 9, 10],
	legitimateInterestUrl: null,
	name: 'Index Exchange, Inc.',
	policyUrl: '',
	purposes: [1],
	specialFeatures: [],
	specialPurposes: [1, 2],
	usesCookies: true,
	usesNonCookieAccess: false,
};

/** Partner 755 on a purpose row it claims under consent. */
const GVL_VENDOR_755: ConsentIabProcessedVendor = {
	cookieMaxAgeSeconds: 63072000,
	cookieRefresh: true,
	dataRetention: undefined,
	deviceStorageDisclosureUrl: null,
	features: [1, 2, 3],
	id: 755,
	isCustom: false,
	legIntPurposes: [],
	legitimateInterestUrl: null,
	name: 'Google Advertising Products',
	policyUrl: '',
	purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
	specialFeatures: [1, 2],
	specialPurposes: [1, 2],
	usesCookies: true,
	usesLegitimateInterest: false,
	usesNonCookieAccess: true,
};

/** Partner 755 on the partners tab. The web builds that row off the GVL entry rather than off a purpose, so it is the one shape here that carries the partner's declared data categories and none of its legitimate-interest flags. */
const GVL_VENDOR_755_PARTNER: ConsentIabProcessedVendor = {
	cookieMaxAgeSeconds: 63072000,
	cookieRefresh: true,
	dataDeclaration: [],
	dataRetention: undefined,
	deviceStorageDisclosureUrl: null,
	features: [1, 2, 3],
	id: 755,
	isCustom: false,
	legIntPurposes: [],
	legitimateInterestUrl: null,
	name: 'Google Advertising Products',
	policyUrl: '',
	purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
	specialFeatures: [1, 2],
	specialPurposes: [1, 2],
	usesCookies: true,
	usesNonCookieAccess: true,
};

/** The whole disclosure, in the order the web resolver returns it. */
export const IAB_DEMO_DISPLAY_MODEL: ConsentIabDisplayModel = {
	consentRows: [
		{
			description: 'Cookies, device or similar online identifiers...',
			id: 1,
			illustrations: ['Most purposes explained in this notice...'],
			kind: 'purpose',
			locked: false,
			name: 'Store and/or access information on a device',
			testId: 'purpose-item-1',
			toggle: 'purpose',
			vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_10, GVL_VENDOR_755],
		},
		{
			description: 'Advertising can be personalised based on a profile.',
			id: 2,
			kind: 'stack',
			name: 'Personalised advertising profile and target audience measurement',
			purposes: [
				{
					description: 'Information about your activity on this service...',
					id: 3,
					illustrations: [],
					kind: 'purpose',
					locked: false,
					name: 'Create profiles for personalised advertising',
					testId: 'purpose-item-3',
					toggle: 'purpose',
					vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_755],
				},
				{
					description:
						'Advertising can be presented to you based on a profile...',
					id: 4,
					illustrations: [],
					kind: 'purpose',
					locked: false,
					name: 'Use profiles to select personalised advertising',
					testId: 'purpose-item-4',
					toggle: 'purpose',
					vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_755],
				},
				{
					description:
						'Reports can be generated based on the combination of data sets...',
					id: 9,
					illustrations: [],
					kind: 'purpose',
					locked: false,
					name: 'Understand audiences through statistics or combinations of data',
					testId: 'purpose-item-9',
					toggle: 'purpose',
					vendors: [
						GVL_VENDOR_1,
						GVL_VENDOR_2,
						GVL_VENDOR_10_CLAIMS_LI,
						GVL_VENDOR_755,
					],
				},
			],
			testId: 'stack-item-2',
		},
		{
			description: 'Content can be personalised based on a profile.',
			id: 3,
			kind: 'stack',
			name: 'Content personalisation',
			purposes: [
				{
					description: 'Information about your activity on this service...',
					id: 5,
					illustrations: [],
					kind: 'purpose',
					locked: false,
					name: 'Create profiles to personalise content',
					testId: 'purpose-item-5',
					toggle: 'purpose',
					vendors: [GVL_VENDOR_2, GVL_VENDOR_755],
				},
				{
					description: 'Content can be presented to you based on a profile...',
					id: 6,
					illustrations: [],
					kind: 'purpose',
					locked: false,
					name: 'Use profiles to select personalised content',
					testId: 'purpose-item-6',
					toggle: 'purpose',
					vendors: [GVL_VENDOR_2, GVL_VENDOR_755],
				},
				{
					description:
						'Content can be presented to you based on limited data...',
					id: 11,
					illustrations: [],
					kind: 'purpose',
					locked: false,
					name: 'Use limited data to select content',
					testId: 'purpose-item-11',
					toggle: 'purpose',
					vendors: [GVL_VENDOR_755],
				},
			],
			testId: 'stack-item-3',
		},
		{
			description: 'Advertising can be presented based on limited data.',
			id: 1,
			kind: 'stack',
			name: 'Advertising based on limited data and advertising measurement',
			purposes: [
				{
					description:
						'Advertising can be presented to you based on limited data...',
					id: 2,
					illustrations: [],
					kind: 'purpose',
					locked: false,
					name: 'Use limited data to select advertising',
					testId: 'purpose-item-2',
					toggle: 'purpose',
					vendors: [
						GVL_VENDOR_1,
						GVL_VENDOR_2,
						GVL_VENDOR_10_CLAIMS_LI,
						GVL_VENDOR_755,
					],
				},
				{
					description: 'The performance and effectiveness of ads...',
					id: 7,
					illustrations: [],
					kind: 'purpose',
					locked: false,
					name: 'Measure advertising performance',
					testId: 'purpose-item-7',
					toggle: 'purpose',
					vendors: [
						GVL_VENDOR_1,
						GVL_VENDOR_2,
						GVL_VENDOR_10_CLAIMS_LI,
						GVL_VENDOR_755,
					],
				},
			],
			testId: 'stack-item-1',
		},
		{
			description: 'Content performance can be measured.',
			id: 4,
			kind: 'stack',
			name: 'Content measurement and product development',
			purposes: [
				{
					description: 'The performance and effectiveness of content...',
					id: 8,
					illustrations: [],
					kind: 'purpose',
					locked: false,
					name: 'Measure content performance',
					testId: 'purpose-item-8',
					toggle: 'purpose',
					vendors: [GVL_VENDOR_2, GVL_VENDOR_755],
				},
				{
					description: 'Your data can be used to improve existing systems...',
					id: 10,
					illustrations: [],
					kind: 'purpose',
					locked: false,
					name: 'Develop and improve services',
					testId: 'purpose-item-10',
					toggle: 'purpose',
					vendors: [
						GVL_VENDOR_1,
						GVL_VENDOR_2,
						GVL_VENDOR_10_CLAIMS_LI,
						GVL_VENDOR_755,
					],
				},
			],
			testId: 'stack-item-4',
		},
		{
			description: 'With your acceptance, your precise location...',
			id: 1,
			illustrations: [],
			kind: 'special-feature',
			locked: false,
			name: 'Use precise geolocation data',
			testId: 'special-feature-item-1',
			toggle: 'special-feature',
			vendors: [GVL_VENDOR_1, GVL_VENDOR_755],
		},
		{
			description:
				'With your acceptance, certain characteristics specific to your device...',
			id: 2,
			illustrations: [],
			kind: 'special-feature',
			locked: false,
			name: 'Actively scan device characteristics for identification',
			testId: 'special-feature-item-2',
			toggle: 'special-feature',
			vendors: [GVL_VENDOR_755],
		},
	],
	data: {
		features: [
			{
				description: 'Information about your activity on this service...',
				descriptionLegal: undefined,
				id: 1,
				illustrations: [],
				name: 'Match and combine data from other data sources',
				vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_755],
			},
			{
				description: 'In support of the purposes explained in this notice...',
				descriptionLegal: undefined,
				id: 2,
				illustrations: [],
				name: 'Link different devices',
				vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_10, GVL_VENDOR_755],
			},
			{
				description: 'Your device might be distinguished from other devices...',
				descriptionLegal: undefined,
				id: 3,
				illustrations: [],
				name: 'Identify devices based on information transmitted automatically',
				vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_10, GVL_VENDOR_755],
			},
		],
		isLoading: false,
		isReady: true,
		purposes: [
			{
				description: 'Cookies, device or similar online identifiers...',
				descriptionLegal: undefined,
				id: 1,
				illustrations: ['Most purposes explained in this notice...'],
				name: 'Store and/or access information on a device',
				vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_10, GVL_VENDOR_755],
			},
			{
				description:
					'Advertising can be presented to you based on limited data...',
				descriptionLegal: undefined,
				id: 2,
				illustrations: [],
				name: 'Use limited data to select advertising',
				vendors: [
					GVL_VENDOR_1,
					GVL_VENDOR_2,
					GVL_VENDOR_10_CLAIMS_LI,
					GVL_VENDOR_755,
				],
			},
			{
				description: 'Information about your activity on this service...',
				descriptionLegal: undefined,
				id: 3,
				illustrations: [],
				name: 'Create profiles for personalised advertising',
				vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_755],
			},
			{
				description:
					'Advertising can be presented to you based on a profile...',
				descriptionLegal: undefined,
				id: 4,
				illustrations: [],
				name: 'Use profiles to select personalised advertising',
				vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_755],
			},
			{
				description: 'Information about your activity on this service...',
				descriptionLegal: undefined,
				id: 5,
				illustrations: [],
				name: 'Create profiles to personalise content',
				vendors: [GVL_VENDOR_2, GVL_VENDOR_755],
			},
			{
				description: 'Content can be presented to you based on a profile...',
				descriptionLegal: undefined,
				id: 6,
				illustrations: [],
				name: 'Use profiles to select personalised content',
				vendors: [GVL_VENDOR_2, GVL_VENDOR_755],
			},
			{
				description: 'The performance and effectiveness of ads...',
				descriptionLegal: undefined,
				id: 7,
				illustrations: [],
				name: 'Measure advertising performance',
				vendors: [
					GVL_VENDOR_1,
					GVL_VENDOR_2,
					GVL_VENDOR_10_CLAIMS_LI,
					GVL_VENDOR_755,
				],
			},
			{
				description: 'The performance and effectiveness of content...',
				descriptionLegal: undefined,
				id: 8,
				illustrations: [],
				name: 'Measure content performance',
				vendors: [GVL_VENDOR_2, GVL_VENDOR_755],
			},
			{
				description:
					'Reports can be generated based on the combination of data sets...',
				descriptionLegal: undefined,
				id: 9,
				illustrations: [],
				name: 'Understand audiences through statistics or combinations of data',
				vendors: [
					GVL_VENDOR_1,
					GVL_VENDOR_2,
					GVL_VENDOR_10_CLAIMS_LI,
					GVL_VENDOR_755,
				],
			},
			{
				description: 'Your data can be used to improve existing systems...',
				descriptionLegal: undefined,
				id: 10,
				illustrations: [],
				name: 'Develop and improve services',
				vendors: [
					GVL_VENDOR_1,
					GVL_VENDOR_2,
					GVL_VENDOR_10_CLAIMS_LI,
					GVL_VENDOR_755,
				],
			},
			{
				description: 'Content can be presented to you based on limited data...',
				descriptionLegal: undefined,
				id: 11,
				illustrations: [],
				name: 'Use limited data to select content',
				vendors: [GVL_VENDOR_755],
			},
		],
		specialFeatures: [
			{
				description: 'With your acceptance, your precise location...',
				descriptionLegal: undefined,
				id: 1,
				illustrations: [],
				name: 'Use precise geolocation data',
				vendors: [GVL_VENDOR_1, GVL_VENDOR_755],
			},
			{
				description:
					'With your acceptance, certain characteristics specific to your device...',
				descriptionLegal: undefined,
				id: 2,
				illustrations: [],
				name: 'Actively scan device characteristics for identification',
				vendors: [GVL_VENDOR_755],
			},
		],
		specialPurposes: [
			{
				description:
					'Your data can be used to monitor for and prevent unusual...',
				descriptionLegal: undefined,
				id: 1,
				illustrations: [],
				isSpecialPurpose: true,
				name: 'Ensure security, prevent and detect fraud, and fix errors',
				vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_10, GVL_VENDOR_755],
			},
			{
				description:
					'Certain information is used to ensure technical compatibility...',
				descriptionLegal: undefined,
				id: 2,
				illustrations: [],
				isSpecialPurpose: true,
				name: 'Deliver and present advertising and content',
				vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_10, GVL_VENDOR_755],
			},
		],
		stacks: [
			{
				description: 'Advertising can be personalised based on a profile.',
				id: 2,
				name: 'Personalised advertising profile and target audience measurement',
				purposes: [
					{
						description: 'Information about your activity on this service...',
						descriptionLegal: undefined,
						id: 3,
						illustrations: [],
						name: 'Create profiles for personalised advertising',
						vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_755],
					},
					{
						description:
							'Advertising can be presented to you based on a profile...',
						descriptionLegal: undefined,
						id: 4,
						illustrations: [],
						name: 'Use profiles to select personalised advertising',
						vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_755],
					},
					{
						description:
							'Reports can be generated based on the combination of data sets...',
						descriptionLegal: undefined,
						id: 9,
						illustrations: [],
						name: 'Understand audiences through statistics or combinations of data',
						vendors: [
							GVL_VENDOR_1,
							GVL_VENDOR_2,
							GVL_VENDOR_10_CLAIMS_LI,
							GVL_VENDOR_755,
						],
					},
				],
			},
			{
				description: 'Content can be personalised based on a profile.',
				id: 3,
				name: 'Content personalisation',
				purposes: [
					{
						description: 'Information about your activity on this service...',
						descriptionLegal: undefined,
						id: 5,
						illustrations: [],
						name: 'Create profiles to personalise content',
						vendors: [GVL_VENDOR_2, GVL_VENDOR_755],
					},
					{
						description:
							'Content can be presented to you based on a profile...',
						descriptionLegal: undefined,
						id: 6,
						illustrations: [],
						name: 'Use profiles to select personalised content',
						vendors: [GVL_VENDOR_2, GVL_VENDOR_755],
					},
					{
						description:
							'Content can be presented to you based on limited data...',
						descriptionLegal: undefined,
						id: 11,
						illustrations: [],
						name: 'Use limited data to select content',
						vendors: [GVL_VENDOR_755],
					},
				],
			},
			{
				description: 'Advertising can be presented based on limited data.',
				id: 1,
				name: 'Advertising based on limited data and advertising measurement',
				purposes: [
					{
						description:
							'Advertising can be presented to you based on limited data...',
						descriptionLegal: undefined,
						id: 2,
						illustrations: [],
						name: 'Use limited data to select advertising',
						vendors: [
							GVL_VENDOR_1,
							GVL_VENDOR_2,
							GVL_VENDOR_10_CLAIMS_LI,
							GVL_VENDOR_755,
						],
					},
					{
						description: 'The performance and effectiveness of ads...',
						descriptionLegal: undefined,
						id: 7,
						illustrations: [],
						name: 'Measure advertising performance',
						vendors: [
							GVL_VENDOR_1,
							GVL_VENDOR_2,
							GVL_VENDOR_10_CLAIMS_LI,
							GVL_VENDOR_755,
						],
					},
				],
			},
			{
				description: 'Content performance can be measured.',
				id: 4,
				name: 'Content measurement and product development',
				purposes: [
					{
						description: 'The performance and effectiveness of content...',
						descriptionLegal: undefined,
						id: 8,
						illustrations: [],
						name: 'Measure content performance',
						vendors: [GVL_VENDOR_2, GVL_VENDOR_755],
					},
					{
						description: 'Your data can be used to improve existing systems...',
						descriptionLegal: undefined,
						id: 10,
						illustrations: [],
						name: 'Develop and improve services',
						vendors: [
							GVL_VENDOR_1,
							GVL_VENDOR_2,
							GVL_VENDOR_10_CLAIMS_LI,
							GVL_VENDOR_755,
						],
					},
				],
			},
		],
		standalonePurposes: [
			{
				description: 'Cookies, device or similar online identifiers...',
				descriptionLegal: undefined,
				id: 1,
				illustrations: ['Most purposes explained in this notice...'],
				name: 'Store and/or access information on a device',
				vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_10, GVL_VENDOR_755],
			},
		],
		totalVendors: 4,
	},
	essentialPartnerCount: 4,
	essentialRows: [
		{
			description:
				'Your data can be used to monitor for and prevent unusual...',
			id: 1,
			illustrations: [],
			kind: 'special-purpose',
			locked: true,
			name: 'Ensure security, prevent and detect fraud, and fix errors',
			testId: 'special-purpose-item-1',
			toggle: 'none',
			vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_10, GVL_VENDOR_755],
		},
		{
			description:
				'Certain information is used to ensure technical compatibility...',
			id: 2,
			illustrations: [],
			kind: 'special-purpose',
			locked: true,
			name: 'Deliver and present advertising and content',
			testId: 'special-purpose-item-2',
			toggle: 'none',
			vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_10, GVL_VENDOR_755],
		},
		{
			description: 'Information about your activity on this service...',
			id: 1,
			illustrations: [],
			kind: 'feature',
			locked: true,
			name: 'Match and combine data from other data sources',
			testId: 'feature-item-1',
			toggle: 'none',
			vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_755],
		},
		{
			description: 'In support of the purposes explained in this notice...',
			id: 2,
			illustrations: [],
			kind: 'feature',
			locked: true,
			name: 'Link different devices',
			testId: 'feature-item-2',
			toggle: 'none',
			vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_10, GVL_VENDOR_755],
		},
		{
			description: 'Your device might be distinguished from other devices...',
			id: 3,
			illustrations: [],
			kind: 'feature',
			locked: true,
			name: 'Identify devices based on information transmitted automatically',
			testId: 'feature-item-3',
			toggle: 'none',
			vendors: [GVL_VENDOR_1, GVL_VENDOR_2, GVL_VENDOR_10, GVL_VENDOR_755],
		},
	],
	isLoading: false,
	isReady: true,
	purposeTabCount: 18,
	vendorTabCount: 4,
	vendors: [
		GVL_VENDOR_2_PARTNER,
		GVL_VENDOR_1_PARTNER,
		GVL_VENDOR_755_PARTNER,
		GVL_VENDOR_10_PARTNER,
	],
};
