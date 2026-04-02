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
	necessary: true,
	measurement: false,
	marketing: false,
	functionality: false,
	experience: false,
};
