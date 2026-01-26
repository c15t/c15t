import type { CliLogger } from '~/utils/logger';

/**
 * Generates client configuration file content based on storage mode
 *
 * @param mode - The storage mode ('c15t', 'offline', or 'custom')
 * @param backendURL - URL for the c15t backend/API (for 'c15t' mode)
 * @param useEnvFile - Whether to use environment variable for backendURL
 * @param logger - Optional logger instance
 * @returns The generated configuration file content
 */
export function generateClientConfigContent(
	mode: string,
	backendURL?: string,
	useEnvFile?: boolean,
	logger?: CliLogger
): string {
	let configContent = '';

	// Validate mode parameter
	const validModes = ['c15t', 'offline', 'custom'];

	switch (mode) {
		case 'c15t': {
			configContent = `
import {
  type ConsentManagerOptions,
  configureConsentManager,
  createConsentManagerStore
} from "c15t";

export const consentManager = configureConsentManager({ mode: "c15t", backendURL: ${useEnvFile ? 'process.env.NEXT_PUBLIC_C15T_URL' : `'${backendURL || 'https://your-instance.c15t.dev'}'`}, });
export const store = createConsentManagerStore(consentManager, {
  initialGdprTypes: ["necessary", "marketing"], // Optional: Specify which consent categories to show in the banner.
  overrides: {
    country: 'GB', // Useful for development to always view the banner.
  }
});

store.getState().setConsent("marketing", true); // set consent to marketing
store.getState().showPopup; 
`;
			break;
		}
		case 'offline': {
			configContent = `
import {
  type ConsentManagerOptions,
  configureConsentManager,
  createConsentManagerStore
} from "c15t";

export const consentManager = configureConsentManager({ mode: "offline" });
export const store = createConsentManagerStore(consentManager, {
  initialGdprTypes: ["necessary", "marketing"], // Optional: Specify which consent categories to show in the banner.
});

store.getState().setConsent("marketing", true); // set consent to marketing
store.getState().showPopup; // should show popup?
      
`;
			break;
		}
		case 'custom': {
			configContent = `import {
  type ConsentManagerOptions,
  configureConsentManager,
  createConsentManagerStore
} from "c15t";

export const consentManager = configureConsentManager({ mode: "custom", endpointHandlers: createCustomHandlers(), });
export const store = createConsentManagerStore(consentManager, {
  initialGdprTypes: ["necessary", "marketing"], // Optional: Specify which consent categories to show in the banner.
  overrides: {
    country: 'GB', // Useful for development to always view the banner.
  }
});

store.getState().setConsent("marketing", true); // set consent to marketing
store.getState().showPopup; // should show popup?
`;
			break;
		}
		default: {
			logger?.failed(
				`Invalid mode: ${mode}. Valid modes are: ${validModes.join(', ')}`
			);
		}
	}

	return configContent;
}
