/**
 * Tests for ConsentManagerProvider rendering/hydration behavior.
 *
 * Mirrors: packages/react/src/providers/__tests__/provider-hydration.test.tsx
 */

import { clearConsentRuntimeCache } from '@c15t/core';
import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, test } from 'vitest';

import BannerFixture from '../../__tests__/fixtures/banner-fixture.svelte';
import ProviderOnlyFixture from '../../__tests__/fixtures/provider-only-fixture.svelte';

describe('ConsentManagerProvider Rendering Behavior', () => {
	beforeEach(() => {
		clearConsentRuntimeCache();
	});

	test('should render children immediately without blocking', () => {
		render(ProviderOnlyFixture, {
			options: {
				consentCategories: ['necessary', 'marketing'],
				mode: 'offline',
			},
		});

		expect(screen.getByTestId('render-child')).toBeInTheDocument();
		expect(screen.getByTestId('render-child')).toHaveTextContent('child');
	});

	test('should render children with custom label', () => {
		render(ProviderOnlyFixture, {
			label: 'custom-content',
			options: {
				mode: 'offline',
			},
		});

		expect(screen.getByTestId('render-custom-content')).toBeInTheDocument();
		expect(screen.getByTestId('render-custom-content')).toHaveTextContent(
			'custom-content'
		);
	});

	test('should render children with different consent categories', () => {
		render(ProviderOnlyFixture, {
			options: {
				consentCategories: ['necessary'],
				mode: 'offline',
			},
		});

		expect(screen.getByTestId('render-child')).toBeInTheDocument();
	});

	test('should not render the banner overlay by default', async () => {
		render(BannerFixture, {
			options: {
				mode: 'offline',
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('consent-banner-root')).toBeInTheDocument();
		});

		expect(
			screen.queryByTestId('consent-banner-overlay')
		).not.toBeInTheDocument();
	});

	test('should render the banner overlay when scroll lock is enabled', async () => {
		render(BannerFixture, {
			options: {
				mode: 'offline',
				scrollLock: true,
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('consent-banner-overlay')).toBeInTheDocument();
		});
	});
});
