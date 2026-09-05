import { mockGVL } from '../../../packages/react/src/components/iab/__tests__/fixtures/mock-consent-state';
import { offline } from '../../../packages/svelte/src/lib/transports/offline';
import type { ConsentManagerOptions } from '../../../packages/svelte/src/lib/types';
import { enTranslations } from '../../../packages/translations/src/index';
import {
	storybookPolicy,
	storybookIABPolicy,
	storybookPresentation,
	seedStorybookChoice,
} from '../../storybook-consent-policy';

type ConsentRecord = Record<string, boolean>;

const clearCookies = function clearCookies() {
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
		}
	}
};

export const resetStorybookConsentState =
	function resetStorybookConsentState() {
		if (typeof window === 'undefined') {
			return;
		}

		window.localStorage.clear();
		clearCookies();
	};

export const seedStoredConsent = seedStorybookChoice;

export const seedTCString = function seedTCString(tcString: string | null) {
	if (!tcString) {
		window.localStorage.removeItem('euconsent-v2');
		return;
	}

	window.localStorage.setItem('euconsent-v2', tcString);
};

export const defaultConsentOptions: ConsentManagerOptions = {
	mode: offline({ policyRules: [storybookPolicy] }),
	presentation: storybookPresentation,
	translations: { language: 'en', translations: enTranslations },
};

export const editableConsentOptions: Partial<ConsentManagerOptions> = {
	consentCategories: [
		'necessary',
		'functionality',
		'measurement',
		'experience',
		'marketing',
	],
};

export const editableStoredConsent: ConsentRecord = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

export const defaultIABOptions: ConsentManagerOptions = {
	...defaultConsentOptions,
	iab: { cmpId: 160, cmpVersion: 1, gvl: mockGVL },
	mode: offline({ policyRules: [storybookIABPolicy] }),
};

export type { ConsentRecord };
