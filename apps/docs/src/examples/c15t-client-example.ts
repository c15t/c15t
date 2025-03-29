export const c15tClientExample = `import { createConsentClient } from '@c15t/react';

/**
 * Create a client for React components to use
 */
export const clientConfig = {
    baseURL: '/api/c15t-demo',
    defaultPreferences: {
        analytics: true,
        marketing: true,
        preferences: true,
    },
    // Example of setting consent
    onConsentChange: async (preferences) => {
        const client = createConsentClient({ baseURL: '/api/c15t-demo' });
        
        try {
            const { data } = await client.setConsent({
                type: 'cookie_banner',
                domain: window.location.hostname,
                preferences,
                metadata: {
                    source: 'cookie_banner',
                    acceptanceMethod: 'button_click'
                }
            });
            
            console.log('Consent saved:', data);
        } catch (error) {
            console.error('Failed to save consent:', error);
        }
    }
};`;
