/**
 * Minimal Global Vendor List fixture for IAB TCF conformance mounts.
 *
 * Mirrors the shape of the GVL served by IAB Europe (and the `mockGVL`
 * fixture used by the React IAB unit tests / storybook IAB stories) but
 * trimmed to the smallest payload that makes the prebuilt IAB surfaces
 * render: one vendor, two purposes, one stack, one special feature.
 *
 * Typed loosely on purpose — this package stays zero-import on runtime
 * framework/schema code. Drivers cast it to their `GlobalVendorList` type.
 */

export const MINIMAL_GVL = {
	gvlSpecificationVersion: 3,
	vendorListVersion: 142,
	tcfPolicyVersion: 5,
	lastUpdated: '2024-01-15T16:00:23Z',
	purposes: {
		1: {
			id: 1,
			name: 'Store and/or access information on a device',
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
			name: 'Use precise geolocation data',
			description: '',
			illustrations: [],
		},
	},
	vendors: {
		1: {
			id: 1,
			name: 'Conformance Test Vendor',
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
			name: 'Conformance Test Stack',
			description: '',
			purposes: [2],
			specialFeatures: [],
		},
	},
} as const;

/** CMP registration fixture used alongside {@link MINIMAL_GVL}. */
export const IAB_FIXTURE_CMP_ID = 160;
export const IAB_FIXTURE_CMP_VERSION = 1;
