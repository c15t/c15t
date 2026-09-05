import { useState } from 'react';
import type { ReactNode } from 'react';

import { mockGVL } from '../../../packages/react/src/components/iab/__tests__/fixtures/mock-consent-state';
import { IABProvider } from '../../../packages/react/src/iab';
import { ConsentProvider, offline } from '../../../packages/react/src/index';
import type { ConsentProviderOptions } from '../../../packages/react/src/index';
import {
	storybookPolicy,
	storybookIABPolicy,
	storybookPresentation,
	seedStorybookChoice,
} from '../../storybook-consent-policy';

type ConsentRecord = Record<string, boolean>;

interface StorybookProviderProps {
	children: ReactNode;
	options?: Partial<ConsentProviderOptions>;
	storedConsent?: ConsentRecord;
	tcString?: string | null;
}

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

export const defaultConsentOptions: ConsentProviderOptions = {
	mode: offline({ policyRules: [storybookPolicy] }),
	presentation: storybookPresentation,
};

export const editableConsentOptions: Partial<ConsentProviderOptions> = {
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

export const defaultIABOptions: ConsentProviderOptions = {
	...defaultConsentOptions,
	mode: offline({ policyRules: [storybookIABPolicy] }),
};

export const StorybookConsentProvider = ({
	children,
	options,
	storedConsent,
	tcString = null,
}: StorybookProviderProps) => {
	const [initialized, setInitialized] = useState(() => {
		resetStorybookConsentState();

		if (storedConsent) {
			seedStoredConsent(storedConsent);
		}

		seedTCString(tcString);
		return true;
	});
	void initialized;
	void setInitialized;

	return (
		<ConsentProvider
			options={{
				...defaultConsentOptions,
				...options,
			}}
		>
			{children}
		</ConsentProvider>
	);
};

export const StorybookIABProvider = ({
	children,
	options,
	storedConsent,
	tcString = 'COtybn4Otybn4AcABBENAPCgAAAAAAAAAAwAA4AuAAA',
}: StorybookProviderProps) => {
	const [initialized, setInitialized] = useState(() => {
		resetStorybookConsentState();

		if (storedConsent) {
			seedStoredConsent(storedConsent, storybookIABPolicy);
		}

		seedTCString(tcString);
		return true;
	});
	void initialized;
	void setInitialized;

	return (
		<ConsentProvider
			options={{
				...defaultIABOptions,
				...options,
			}}
		>
			<IABProvider
				cmpId={160}
				cmpVersion={1}
				gvl={mockGVL}
			>
				{children}
			</IABProvider>
		</ConsentProvider>
	);
};
