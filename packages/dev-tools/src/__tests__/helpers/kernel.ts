import type { ConsentSnapshot } from '@c15t/core';

export const createConsentSnapshot = function createConsentSnapshot(
	overrides: Partial<ConsentSnapshot> = {}
): ConsentSnapshot {
	return {
		activeUI: 'none',
		branding: null,
		consents: { necessary: true },
		hasConsented: false,
		iab: null,
		location: null,
		model: 'opt-in',
		overrides: {},
		policy: null,
		policyBanner: null,
		policyCategories: [],
		policyDecision: null,
		policyDialog: null,
		policyProvisional: false,
		policyScopeMode: 'strict',
		policySnapshotToken: null,
		revision: 0,
		subjectId: null,
		translations: null,
		user: null,
		...overrides,
	};
};
