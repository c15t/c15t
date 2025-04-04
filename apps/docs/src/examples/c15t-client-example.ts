export const c15tClientExample = `import { createConsentClient } from '@c15t/react';

/**
 * Create a client for React components to use
 */
export const c15tClient = createConsentClient({
    baseURL: '/api/c15t-demo',
    defaultPreferences: {
        analytics: true,
        marketing: true,
        preferences: true,
    },
});`;
