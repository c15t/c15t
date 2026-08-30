import { useRef } from 'react';
import type { ReactNode } from 'react';

import { iab } from '../../../packages/iab/src/index';
import { mockGVL } from '../../../packages/react/src/components/iab/__tests__/fixtures/mock-consent-state';
import { ConsentProvider } from '../../../packages/react/src/v3/index';
import type { ConsentProviderOptions } from '../../../packages/react/src/v3/index';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache as clearV3ConsentRuntimeCache,
} from '../../../packages/react/src/v3/providers/consent-manager-provider';
import type { ConsentManagerOptions } from '../../../packages/react/src/v3/types/consent-manager';
import {
	resetStorybookConsentState,
	seedStoredConsent,
	seedTCString,
} from './storybook-consent-fixtures';

type ConsentRecord = Record<string, boolean>;

interface StorybookV3ProviderProps {
	children: ReactNode;
	options?: Partial<ConsentProviderOptions>;
	storedConsent?: ConsentRecord;
	tcString?: string | null;
}

export const defaultV3ConsentOptions: ConsentProviderOptions = {
	mode: 'offline',
	consentCategories: [
		'necessary',
		'functionality',
		'measurement',
		'experience',
		'marketing',
	],
	offlinePolicy: {
		policy: {
			id: 'storybook_v3',
			model: 'opt-in',
			consent: {
				categories: [
					'necessary',
					'functionality',
					'measurement',
					'experience',
					'marketing',
				],
				scopeMode: 'permissive',
			},
			ui: {
				mode: 'banner',
			},
		},
	},
};

/**
 * v3 provider fixture: boots the kernel-based `ConsentProvider` in offline
 * mode. v3 hydrates from the same storage format as v2, so the v2 seed
 * helpers are reused as-is.
 */
export function StorybookV3ConsentProvider({
	children,
	options,
	storedConsent,
	tcString = null,
}: StorybookV3ProviderProps) {
	const initializedRef = useRef(false);

	if (!initializedRef.current) {
		clearV3ConsentRuntimeCache();
		resetStorybookConsentState();

		if (storedConsent) {
			seedStoredConsent(storedConsent);
		}

		seedTCString(tcString);
		initializedRef.current = true;
	}

	return (
		<ConsentProvider
			options={{
				...defaultV3ConsentOptions,
				...options,
			}}
		>
			{children}
		</ConsentProvider>
	);
}

interface StorybookV3IABProviderProps {
	children: ReactNode;
	options?: Partial<ConsentManagerOptions>;
	storedConsent?: ConsentRecord;
	tcString?: string | null;
}

export const defaultV3IABOptions: ConsentManagerOptions = {
	mode: 'offline',
	iab: iab({
		cmpId: 160,
		cmpVersion: 1,
		gvl: mockGVL,
	}),
	offlinePolicy: {
		policy: { id: 'storybook_iab_v3', model: 'iab' },
	},
};

/**
 * v3 IAB fixture: mirrors the v3 IAB test mounts — the v3
 * `ConsentManagerProvider` compat wrapper with an offline IAB policy and an
 * injected GVL (no network).
 */
export function StorybookV3IABProvider({
	children,
	options,
	storedConsent,
	tcString = null,
}: StorybookV3IABProviderProps) {
	const initializedRef = useRef(false);

	if (!initializedRef.current) {
		clearV3ConsentRuntimeCache();
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
				...defaultV3IABOptions,
				...options,
			}}
		>
			{children}
		</ConsentManagerProvider>
	);
}
