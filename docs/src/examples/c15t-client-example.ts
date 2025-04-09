export const c15tClientExample = `import { type ConsentManagerOptions } from '@c15t/react';

/**
 * C15t Mode - Uses HTTP requests to a backend
 * 
 * This mode makes actual API requests to the configured endpoint.
 * You must provide a valid backendURL.
 */
export const standardClient: ConsentManagerOptions = {
    // Required backend URL for C15t mode
    backendURL: '/api/c15t',
    store: {
        initialGdprTypes: ['necessary', 'marketing'],
    },
};

/**
 * Offline Mode - Disables all network requests
 * 
 * In offline mode:
 * - No actual network requests are made
 * - All client methods return successful empty responses
 * - Callbacks are still triggered with empty successful responses
 * - Perfect for testing, demos, or when backend is unavailable
 */
export const offlineClient: ConsentManagerOptions = {
    mode: 'offline',
    store: {
        initialGdprTypes: ['necessary', 'marketing'],
    },
    callbacks: {
        // All callbacks still work even though no network requests are made
        onConsentSet: (response) => {
            console.log('Consent updated (no actual API call made)');
            console.log('Response:', response);
            // Response will be: { data: null, error: null, ok: true, response: null }
        }
    }
};

/**
 * Custom Mode - Uses your own handler functions
 * 
 * This mode lets you provide custom implementations for each endpoint,
 * giving you complete control over the behavior without making real API calls.
 */
export const customClient: ConsentManagerOptions = {
    mode: 'custom',
    endpointHandlers: {
        showConsentBanner: async () => ({
            data: { 
                showConsentBanner: true,
                location: { 
                    countryCode: 'US',
                    regionCode: 'CA'
                },
                jurisdiction: {
                    code: 'CCPA',
                    message: 'California Consumer Privacy Act applies'
                }
            },
            ok: true,
            error: null,
            response: null
        }),
        setConsent: async (options) => ({
            data: { 
                success: true,
                consentId: 'mock-consent-123',
                timestamp: new Date().toISOString()
            },
            ok: true,
            error: null,
            response: null
        }),
        verifyConsent: async (options) => ({
            data: { 
                valid: true,
                reasons: []
            },
            ok: true,
            error: null,
            response: null
        })
    },
    store: {
      initialGdprTypes: ['necessary', 'marketing'],
    },
};`;
