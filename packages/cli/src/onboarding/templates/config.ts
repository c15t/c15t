/**
 * Generates client configuration file content based on storage mode
 *
 * @param mode - The storage mode ('c15t', 'offline', or 'custom')
 * @param backendURL - URL for the c15t backend/API (for 'c15t' mode)
 * @param useEnvFile - Whether to use environment variable for backendURL
 * @returns The generated configuration file content
 */
export function generateClientConfigContent(
	mode: string,
	backendURL?: string,
	useEnvFile?: boolean
): string {
	let configContent = '';

	// Validate mode parameter
	const validModes = ['c15t', 'offline', 'custom'];
	if (!validModes.includes(mode)) {
		throw new Error(
			`Invalid mode: ${mode}. Valid modes are: ${validModes.join(', ')}`
		);
	}

	switch (mode) {
		case 'c15t': {
			configContent = `// c15t Client Configuration
import type { ConsentManagerOptions } from '@c15t/react';

export const c15tConfig = {
  // Using hosted c15t (consent.io) or self-hosted instance
  mode: 'c15t',
  backendURL: ${useEnvFile ? 'process.env.NEXT_PUBLIC_C15T_URL' : `'${backendURL || 'https://your-instance.c15t.dev'}'`},
  
  // Optional: Add callback functions for various events
  callbacks: {
    onConsentSet: (response) => {
      console.log('Consent has been saved');
    }
  }
} satisfies ConsentManagerOptions;

// Use in your app layout:
// <ConsentManagerProvider options={c15tConfig}>
//   {children}
//   <CookieBanner />
//   <ConsentManagerDialog />
// </ConsentManagerProvider>
`;
			break;
		}
		case 'offline': {
			configContent = `// c15t Client Configuration
import type { ConsentManagerOptions } from '@c15t/react';

export const c15tConfig = {
  // Using offline mode for browser-based storage
  mode: 'offline',
  
  // Optional: Add callback functions for various events
  callbacks: {
    onConsentSet: (response) => {
      console.log('Consent has been saved locally');
    }
  }
} satisfies ConsentManagerOptions;

// Use in your app layout:
// <ConsentManagerProvider options={c15tConfig}>
//   {children}
//   <CookieBanner />
//   <ConsentManagerDialog />
// </ConsentManagerProvider>
`;
			break;
		}
		case 'custom': {
			configContent = `// c15t Client Configuration
import type { ConsentManagerOptions } from '@c15t/react';
import { createCustomHandlers } from './consent-handlers';

export const c15tConfig = {
  // Using custom mode for complete control
  mode: 'custom',
  endpointHandlers: createCustomHandlers(),
  
  // Optional: Add callback functions for various events
  callbacks: {
    onConsentSet: (response) => {
      console.log('Consent has been saved');
    }
  }
} satisfies ConsentManagerOptions;

// Use in your app layout:
// <ConsentManagerProvider options={c15tConfig}>
//   {children}
//   <CookieBanner />
//   <ConsentManagerDialog />
// </ConsentManagerProvider>

// Don't forget to implement your custom handlers in consent-handlers.ts!
`;
			break;
		}
		default: {
			throw new Error(
				`Invalid mode: ${mode}. Valid modes are: ${validModes.join(', ')}`
			);
		}
	}

	return configContent;
}
