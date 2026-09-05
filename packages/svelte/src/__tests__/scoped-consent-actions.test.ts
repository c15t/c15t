import type { ConsentKernel } from '@c15t/core';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { offline } from '../lib/transports/offline';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';

beforeEach(() => {
	localStorage.clear();
	document.cookie = 'c15t=; Max-Age=0; path=/';
});

describe('displayed consent actions', () => {
	test.each(['Accept All', 'Reject All'])(
		'%s preserves configured categories excluded by the regional policy',
		async (label) => {
			const captured: { kernel?: ConsentKernel } = {};
			const result = render(ConformanceFixture, {
				component: 'consent-banner',
				onKernel: (kernel) => {
					captured.kernel = kernel;
				},
				options: {
					consentCategories: ['necessary', 'marketing', 'measurement'],
					mode: offline(),
					prefetch: {
						initialPolicy: {
							consent: { categories: ['necessary', 'marketing'] },
							model: 'opt-in',
						},
					},
				},
			});
			try {
				const button = await screen.findByRole('button', {
					name: new RegExp(label, 'iu'),
				});
				const { kernel } = captured;
				if (!kernel) {
					throw new Error('Provider did not expose its kernel');
				}
				const hiddenChoice = label === 'Reject All';
				await kernel.commands.init();
				expect(kernel.getSnapshot().policyCategories).toEqual([
					'necessary',
					'marketing',
				]);
				kernel.set.consent({
					marketing: hiddenChoice,
					measurement: hiddenChoice,
				});
				await fireEvent.click(button);
				await vi.waitFor(() =>
					expect(kernel.getSnapshot().hasConsented).toBe(true)
				);
				expect(kernel.getSnapshot().consents.marketing).toBe(!hiddenChoice);
				expect(kernel.getSnapshot().consents.measurement).toBe(hiddenChoice);
			} finally {
				result.unmount();
			}
		}
	);
	test.each(['Accept All', 'Reject All'])(
		'%s preserves categories hidden by provider configuration',
		async (label) => {
			const captured: { kernel?: ConsentKernel } = {};
			const result = render(ConformanceFixture, {
				component: 'consent-banner',
				onKernel: (kernel) => {
					captured.kernel = kernel;
				},
				options: {
					consentCategories: ['necessary', 'marketing', 'measurement'],
					mode: offline(),
					prefetch: {
						initialPolicy: { consent: { categories: ['*'] }, model: 'opt-in' },
					},
				},
			});
			const button = await screen.findByRole('button', {
				name: new RegExp(label, 'iu'),
			});
			const { kernel } = captured;
			if (!kernel) {
				throw new Error('Provider did not expose its kernel');
			}
			kernel.set.consent({
				experience: true,
				functionality: false,
				marketing: true,
				measurement: true,
			});
			await fireEvent.click(button);
			await vi.waitFor(() =>
				expect(kernel.getSnapshot().hasConsented).toBe(true)
			);
			expect(kernel.getSnapshot().consents).toEqual({
				experience: true,
				functionality: false,
				marketing: label === 'Accept All',
				measurement: label === 'Accept All',
				necessary: true,
			});
			result.unmount();
		}
	);
});
