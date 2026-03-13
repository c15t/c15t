/**
 * Tests for ConsentManagerProvider context values.
 *
 * Mirrors: packages/react/src/providers/__tests__/provider-context.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/svelte';
import { clearConsentRuntimeCache } from 'c15t';
import { beforeEach, describe, expect, test } from 'vitest';
import ContextConsumerFixture from '../../__tests__/fixtures/ContextConsumerFixture.svelte';

describe('ConsentManagerProvider Context Values', () => {
	beforeEach(() => {
		clearConsentRuntimeCache();
		window.localStorage.clear();
		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const name = cookie.split('=')[0]?.trim();
			if (name) {
				document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
			}
		}
	});

	test('should provide correct context values to children', async () => {
		render(ContextConsumerFixture, {
			options: {
				mode: 'offline',
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('has-manager')).toHaveTextContent('true');
		});
	});

	test('should provide activeUI state', async () => {
		render(ContextConsumerFixture, {
			options: {
				mode: 'offline',
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('active-ui')).toBeInTheDocument();
		});
	});

	test('should provide model state', async () => {
		render(ContextConsumerFixture, {
			options: {
				mode: 'offline',
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('model')).toBeInTheDocument();
		});
	});
});
