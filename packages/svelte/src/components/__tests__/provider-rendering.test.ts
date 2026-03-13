/**
 * Tests for ConsentManagerProvider rendering/hydration behavior.
 *
 * Mirrors: packages/react/src/providers/__tests__/provider-hydration.test.tsx
 */

import { render, screen } from '@testing-library/svelte';
import { clearConsentRuntimeCache } from 'c15t';
import { beforeEach, describe, expect, test } from 'vitest';
import ProviderOnlyFixture from '../../__tests__/fixtures/ProviderOnlyFixture.svelte';

describe('ConsentManagerProvider Rendering Behavior', () => {
	beforeEach(() => {
		clearConsentRuntimeCache();
	});

	test('should render children immediately without blocking', () => {
		render(ProviderOnlyFixture, {
			options: {
				mode: 'offline',
				consentCategories: ['necessary', 'marketing'],
			},
		});

		expect(screen.getByTestId('render-child')).toBeInTheDocument();
		expect(screen.getByTestId('render-child')).toHaveTextContent('child');
	});

	test('should render children with custom label', () => {
		render(ProviderOnlyFixture, {
			options: {
				mode: 'offline',
			},
			label: 'custom-content',
		});

		expect(screen.getByTestId('render-custom-content')).toBeInTheDocument();
		expect(screen.getByTestId('render-custom-content')).toHaveTextContent(
			'custom-content'
		);
	});

	test('should render children with different consent categories', () => {
		render(ProviderOnlyFixture, {
			options: {
				mode: 'offline',
				consentCategories: ['necessary'],
			},
		});

		expect(screen.getByTestId('render-child')).toBeInTheDocument();
	});
});
