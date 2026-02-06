/**
 * Component template generators for React
 * Generates consent-manager.tsx and related components
 */

import { STORAGE_MODES, type StorageMode } from '../../../../constants';

/**
 * Generate the ConsentManager component for React
 *
 * @param mode - Storage mode
 * @param backendURL - Backend URL (for c15t/self-hosted modes)
 * @param useEnvFile - Whether to use environment variable
 * @returns The complete component file content
 */
export function generateConsentManagerTemplate(
	mode: StorageMode = 'offline',
	backendURL?: string,
	useEnvFile?: boolean
): string {
	const optionsText = generateOptionsText(mode, backendURL, useEnvFile);

	return `import type { ReactNode } from 'react';
import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/react';

/**
 * Consent management wrapper for React
 *
 * This component wraps your app with consent management functionality,
 * including the cookie banner, consent dialog, and provider.
 *
 * Usage:
 * \`\`\`tsx
 * // In your App.tsx
 * import { ConsentManager } from './components/consent-manager';
 *
 * export default function App() {
 *   return (
 *     <ConsentManager>
 *       <YourApp />
 *     </ConsentManager>
 *   );
 * }
 * \`\`\`
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	return (
		<ConsentManagerProvider options={${optionsText}}>
			<CookieBanner />
			<ConsentManagerDialog />
			{children}
		</ConsentManagerProvider>
	);
}
`;
}

/**
 * Generate the options object text based on mode
 */
function generateOptionsText(
	mode: StorageMode,
	backendURL?: string,
	useEnvFile?: boolean
): string {
	switch (mode) {
		case STORAGE_MODES.C15T:
		case STORAGE_MODES.SELF_HOSTED: {
			const url = useEnvFile
				? 'process.env.NEXT_PUBLIC_C15T_URL'
				: `'${backendURL || 'https://your-instance.c15t.dev'}'`;
			return `{ mode: 'c15t', backendURL: ${url} }`;
		}

		case STORAGE_MODES.OFFLINE:
			return `{ mode: 'offline' }`;

		case STORAGE_MODES.CUSTOM: {
			const url = useEnvFile
				? 'process.env.NEXT_PUBLIC_CONSENT_API_URL'
				: `'${backendURL || '/api/consent'}'`;
			return `{
			mode: 'custom',
			endpointHandlers: {
				async getConsent() {
					const res = await fetch(${url});
					return res.json();
				},
				async setConsent(consent) {
					const res = await fetch(${url}, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(consent),
					});
					return res.json();
				},
			},
		}`;
		}

		default:
			return `{ mode: 'offline' }`;
	}
}

/**
 * Generate a basic ConsentManager wrapper using the store
 */
export function generateStoreBasedTemplate(
	configPath: string = './consent-config'
): string {
	return `import type { ReactNode } from 'react';
import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/react';
import { consentManager } from '${configPath}';

/**
 * Consent management wrapper using external configuration
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	return (
		<ConsentManagerProvider options={consentManager}>
			<CookieBanner />
			<ConsentManagerDialog />
			{children}
		</ConsentManagerProvider>
	);
}
`;
}

/**
 * Generate expanded React components with more customization
 */
export function generateExpandedTemplate(
	mode: StorageMode = 'offline',
	backendURL?: string,
	useEnvFile?: boolean
): string {
	const optionsText = generateOptionsText(mode, backendURL, useEnvFile);

	return `import type { ReactNode } from 'react';
import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
	useConsentManager,
} from '@c15t/react';

/**
 * Consent management wrapper for React
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	return (
		<ConsentManagerProvider options={${optionsText}}>
			<CookieBanner
				// Customize the banner appearance
				position="bottom"
				// Add custom actions
				onAcceptAll={() => console.log('All cookies accepted')}
				onRejectAll={() => console.log('All cookies rejected')}
			/>
			<ConsentManagerDialog
				// Customize the dialog
				showCloseButton
				// Add custom styling
				className="custom-dialog"
			/>
			{children}
		</ConsentManagerProvider>
	);
}

/**
 * Custom hook wrapper for consent state
 */
export function useConsent() {
	const consent = useConsentManager();
	return {
		...consent,
		// Add any custom helpers here
		hasAnalyticsConsent: consent.consents?.analytics ?? false,
		hasMarketingConsent: consent.consents?.marketing ?? false,
	};
}
`;
}
