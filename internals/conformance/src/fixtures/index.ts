/**
 * Framework-agnostic fixture data for consent storybook stories.
 * React/Vue/Svelte/Solid each wrap these in their own provider components.
 */

export const editableConsentOptions = {
	consentCategories: [
		'necessary',
		'functionality',
		'measurement',
		'experience',
		'marketing',
	],
};

export const editableStoredConsent: Record<string, boolean> = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

export * from './policy-records';
export * from './policy-scenarios';
export * from './policy-contract-cases';
