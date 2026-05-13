/**
 * Tests for ConsentManagerProvider error handling.
 *
 * Mirrors: packages/react/src/providers/__tests__/provider-errors.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/svelte';
import { clearConsentRuntimeCache } from 'c15t';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ContextConsumerFixture from '../../__tests__/fixtures/context-consumer-fixture.svelte';

const mockFetch = vi.fn();
window.fetch = mockFetch;

describe('ConsentManagerProvider Error Handling', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearConsentRuntimeCache();

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

	test('should render children even when API errors occur', async () => {
		render(ContextConsumerFixture, {
			options: {
				mode: 'offline',
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('has-manager')).toBeInTheDocument();
		});
	});
});
