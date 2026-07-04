// consent-manager-provider.errors.test.tsx - Test error handling
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useConsentManager } from '../../hooks/use-consent-manager';
import { ConsentManagerProvider } from '../consent-manager-provider';
import { setupMocks } from './test-helpers';

// Setup common mocks
const { mockFetch } = setupMocks();

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

		const { getByTestId } = await render(
			<ConsentManagerProvider
				options={{
					mode: 'hosted',
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
