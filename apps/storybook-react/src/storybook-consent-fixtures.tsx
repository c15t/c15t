import React, { type ReactNode, useRef } from 'react';
import { mockGVL } from '../../../packages/react/src/components/iab/__tests__/fixtures/mock-consent-state';
import {
	type ConsentManagerOptions,
	ConsentManagerProvider,
} from '../../../packages/react/src/index';
import { clearConsentRuntimeCache } from '../../../packages/react/src/providers/consent-manager-provider';
import { enTranslations } from '../../../packages/translations/src';

type ConsentRecord = Record<string, boolean>;

interface StorybookProviderProps {
	children: ReactNode;
	options?: Partial<ConsentManagerOptions>;
	storedConsent?: ConsentRecord;
	tcString?: string | null;
}

function clearCookies() {
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
		}
	}
}

export function resetStorybookConsentState() {
	if (typeof window === 'undefined') {
		return;
	}

	clearConsentRuntimeCache();
	window.localStorage.clear();
	clearCookies();
}

export function seedStoredConsent(consents: ConsentRecord) {
	window.localStorage.setItem(
		'c15t',
		JSON.stringify({
			consents,
			consentInfo: {
				time: Date.now(),
				type: 'storybook',
			},
		})
	);
}

export function seedTCString(tcString: string | null) {
	if (!tcString) {
		window.localStorage.removeItem('euconsent-v2');
		return;
	}

	window.localStorage.setItem('euconsent-v2', tcString);
}

export const defaultConsentOptions: ConsentManagerOptions = {
	mode: 'offline',
	translations: {
		language: 'en',
		translations: enTranslations,
	},
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
	necessary: true,
	measurement: false,
	marketing: false,
	functionality: false,
	experience: false,
};

export const defaultIABOptions: ConsentManagerOptions = {
	...defaultConsentOptions,
	iab: {
		enabled: true,
		cmpId: 160,
		cmpVersion: 1,
		gvl: mockGVL,
	},
	offlinePolicy: {
		policy: { id: 'storybook_iab', model: 'iab' },
	},
};

export function StorybookConsentProvider({
	children,
	options,
	storedConsent,
	tcString = null,
}: StorybookProviderProps) {
	const initializedRef = useRef(false);

	if (!initializedRef.current) {
		resetStorybookConsentState();

		if (storedConsent) {
			seedStoredConsent(storedConsent);
		}

		seedTCString(tcString);
		initializedRef.current = true;
	}

	return (
		<ConsentManagerProvider
			options={{
				...defaultConsentOptions,
				...options,
			}}
		>
			{children}
		</ConsentManagerProvider>
	);
}

export function StorybookIABProvider({
	children,
	options,
	storedConsent,
	tcString = 'COtybn4Otybn4AcABBENAPCgAAAAAAAAAAwAA4AuAAA',
}: StorybookProviderProps) {
	const initializedRef = useRef(false);

	if (!initializedRef.current) {
		resetStorybookConsentState();

		if (storedConsent) {
			seedStoredConsent(storedConsent);
		}

		seedTCString(tcString);
		initializedRef.current = true;
	}

	return (
		<ConsentManagerProvider
			options={{
				...defaultIABOptions,
				...options,
			}}
		>
			{children}
		</ConsentManagerProvider>
	);
}
