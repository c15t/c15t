/**
 * Minimal Global Vendor List fixture for IAB TCF conformance mounts.
 *
 * Mirrors the shape of the GVL served by IAB Europe (and the `mockGVL`
 * fixture used by the React IAB unit tests / storybook IAB stories) but
 * trimmed to the smallest payload that still exercises every section an
 * IAB preference centre renders: two purposes (one standalone, one the
 * stack absorbs), a stack, a special feature, a special purpose and a
 * feature. The single vendor declares all of them, because a purpose no
 * vendor claims is filtered out of the display model and would leave the
 * section it belongs to untested.
 *
 * Typed loosely on purpose — this package stays zero-import on runtime
 * framework/schema code. Drivers cast it to their `GlobalVendorList` type.
 */

export const MINIMAL_GVL = {
	features: {
		1: {
			description: '',
			id: 1,
			illustrations: [],
			name: 'Match and combine data',
		},
	},
	gvlSpecificationVersion: 3,
	lastUpdated: '2024-01-15T16:00:23Z',
	purposes: {
		1: {
			description: '',
			id: 1,
			illustrations: [],
			name: 'Store and/or access information on a device',
		},
		2: {
			description: '',
			id: 2,
			illustrations: [],
			name: 'Use limited data to select advertising',
		},
	},
	specialFeatures: {
		1: {
			description: '',
			id: 1,
			illustrations: [],
			name: 'Use precise geolocation data',
		},
	},
	specialPurposes: {
		1: { description: '', id: 1, illustrations: [], name: 'Security' },
	},
	stacks: {
		1: {
			description: '',
			id: 1,
			name: 'Conformance Test Stack',
			purposes: [2],
			specialFeatures: [],
		},
	},
	tcfPolicyVersion: 5,
	vendorListVersion: 142,
	vendors: {
		1: {
			cookieMaxAgeSeconds: 0,
			cookieRefresh: false,
			features: [1],
			flexiblePurposes: [],
			id: 1,
			legIntPurposes: [],
			name: 'Conformance Test Vendor',
			purposes: [1, 2],
			specialFeatures: [1],
			specialPurposes: [1],
			urls: [],
			usesCookies: false,
			usesNonCookieAccess: false,
		},
	},
} as const;

/** CMP registration fixture used alongside {@link MINIMAL_GVL}. */
export const IAB_FIXTURE_CMP_ID = 160;
export const IAB_FIXTURE_CMP_VERSION = 1;
