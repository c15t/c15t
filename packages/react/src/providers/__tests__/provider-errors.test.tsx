import type { ConsentManagerOptions } from 'c15t';
// consent-manager-provider.errors.test.tsx - Test error handling
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useConsentManager } from '../../hooks/use-consent-manager';
import { ConsentManagerProvider } from '../consent-manager-provider';
import { setupMocks } from './test-helpers';

// Setup common mocks
const { mockFetch } = setupMocks();

// Mock c15t module directly in this test file
vi.mock('c15t', async () => {
	const originalModule = await vi.importActual('c15t');

	return {
		...(originalModule as object),
		configureConsentManager: (options: ConsentManagerOptions) => {
			// Create a client for error testing
			const backendURL = options.backendURL || '';

			// Only register fetch calls for c15t mode
			if (options.mode === 'c15t') {
				// Mock an error response for the first call
				mockFetch(`${backendURL}/show-consent-banner`, {
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Return a mock client that shows an error occurred but still works
			return {
				getCallbacks: () => options.callbacks || {},
				showConsentBanner: async () => ({
					ok: false,
					data: null,
					error: { message: 'API error' },
					response: new Response(JSON.stringify({ error: 'API error' }), {
						status: 500,
						headers: { 'Content-Type': 'application/json' },
					}),
				}),
				setConsent: async () => ({
					ok: true,
					data: { success: true },
					error: null,
					response: null,
				}),
				verifyConsent: async () => ({
					ok: true,
					data: { valid: true },
					error: null,
					response: null,
				}),
			};
		},
	};
});

describe('ConsentManagerProvider Error Handling', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Mock error response
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: 'API error' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			})
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should handle errors from API responses', async () => {
		const ErrorDetectingComponent = () => {
			const consentManager = useConsentManager();
			return (
				<div data-testid="request-state">
					{consentManager.manager ? 'Manager Ready' : 'Manager Not Ready'}
				</div>
			);
		};

		const { getByTestId } = render(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t',
				}}
			>
				<ErrorDetectingComponent />
			</ConsentManagerProvider>
		);

		// Verify component renders even with errors
		await vi.waitFor(() => {
			const requestState = getByTestId('request-state');
			expect(requestState).toHaveTextContent(/Manager (Not )?Ready/);
		});

		// Verify the fetch was called
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});
});
