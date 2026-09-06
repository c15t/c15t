/**
 * A tiny Global Vendor List, for the demo only.
 *
 * A real site never ships one of these: hosted and manifest mode both get
 * the list from `/init`, and an offline site points `iab.gvlURL` at where
 * the real one lives. This is here so `bun run --cwd examples/astro-demo
 * dev` shows a working TCF banner with no backend and no network.
 */
export const demoGvl = {
	features: {
		1: {
			description:
				'Information about your activity on this service may be matched with other information.',
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
				'Cookies, device or similar online identifiers can be stored or accessed on your device.',
			id: 1,
			illustrations: [],
			name: 'Store and/or access information on a device',
		},
		2: {
			description:
				'Advertising can be presented to you based on limited data, such as the content you are viewing.',
			id: 2,
			illustrations: [],
			name: 'Use limited data to select advertising',
		},
		3: {
			description:
				'Information about your activity can be used to build a profile about you.',
			id: 3,
			illustrations: [],
			name: 'Create profiles for personalised advertising',
		},
	},
	specialFeatures: {
		1: {
			description:
				'Your precise location can be used in support of the purposes explained in this notice.',
			id: 1,
			illustrations: [],
			name: 'Use precise geolocation data',
		},
	},
	specialPurposes: {
		1: {
			description:
				'Your data can be used to monitor for and prevent fraudulent activity.',
			id: 1,
			illustrations: [],
			name: 'Ensure security, prevent and detect fraud, and fix errors',
		},
	},
	stacks: {
		1: {
			description:
				'Advertising can be personalised based on a profile built about you.',
			id: 1,
			name: 'Personalised advertising and profiling',
			purposes: [2, 3],
			specialFeatures: [],
		},
	},
	tcfPolicyVersion: 5,
	vendorListVersion: 1,
	vendors: {
		1: {
			cookieMaxAgeSeconds: 31_536_000,
			cookieRefresh: false,
			features: [1],
			flexiblePurposes: [],
			id: 1,
			legIntPurposes: [],
			name: 'Demo Advertising Partner',
			purposes: [1, 2, 3],
			specialFeatures: [1],
			specialPurposes: [1],
			urls: [],
			usesCookies: true,
			usesNonCookieAccess: false,
		},
		2: {
			cookieMaxAgeSeconds: 7_776_000,
			cookieRefresh: false,
			features: [],
			flexiblePurposes: [],
			id: 2,
			legIntPurposes: [1],
			name: 'Demo Measurement Partner',
			purposes: [1],
			specialFeatures: [],
			specialPurposes: [1],
			urls: [],
			usesCookies: true,
			usesNonCookieAccess: false,
		},
	},
};

/**
 * The offline policy the IAB pages resolve against.
 *
 * TCF fixes the IAB banner and dialog controls, so an `iab` pack cannot
 * carry `ui.*` overrides — the policy resolver rejects one that does.
 */
export const demoIabPolicy = {
	consent: {
		categories: ['necessary', 'marketing'],
		model: 'iab',
		scopeMode: 'permissive',
	},
	id: 'astro_demo_iab',
	match: { isDefault: true },
};
