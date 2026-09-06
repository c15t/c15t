import { custom } from '@c15t/core';
import type { ConsentKernel, KernelConfig } from '@c15t/core';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { ConsentCompatState } from '../lib/context.svelte';
import { offline } from '../lib/transports/offline';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';

beforeEach(() => {
	localStorage.clear();
	document.cookie = 'c15t=; Max-Age=0; path=/';
});

describe('displayed consent actions', () => {
	test.each([false, true])(
		'custom save ignores a hidden draft after policy narrowing, saved choice=%s',
		async (hiddenChoice) => {
			let policy: KernelConfig['initialPolicy'] = {
				consent: { categories: ['necessary', 'marketing', 'measurement'] },
				model: 'opt-in',
			};
			const captured: { kernel?: ConsentKernel; manager?: ConsentCompatState } =
				{};
			const result = render(ConformanceFixture, {
				component: 'consent-banner',
				onKernel: (kernel) => {
					captured.kernel = kernel;
				},
				onManager: (manager) => {
					captured.manager = manager;
				},
				options: {
					consentCategories: ['necessary', 'marketing', 'measurement'],
					mode: custom({ init: () => Promise.resolve({ policy }) }),
				},
			});
			try {
				const { kernel, manager } = captured;
				if (!kernel || !manager) {
					throw new Error('Provider context was not captured');
				}
				await kernel.commands.init();
				kernel.set.consent({ measurement: hiddenChoice });
				manager.setSelectedConsent('measurement', !hiddenChoice);
				manager.setSelectedConsent('marketing', true);
				policy = {
					...policy,
					consent: { categories: ['necessary', 'marketing'] },
				};
				await kernel.commands.init();
				expect(manager.consentCategories).toEqual(['necessary', 'marketing']);
				// Save must preserve the latest live choice, not the stale draft.
				kernel.set.consent({ measurement: hiddenChoice });
				expect(kernel.getSnapshot().consents.measurement).toBe(hiddenChoice);
				await manager.saveConsents('custom');
				expect(kernel.getSnapshot().consents.marketing).toBe(true);
				expect(kernel.getSnapshot().consents.measurement).toBe(hiddenChoice);
				expect(manager.selectedConsents).toEqual({});
			} finally {
				result.unmount();
			}
		}
	);
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
	test.each(
		(['*', 'necessary'] as const).flatMap((policy) =>
			['Accept All', 'Reject All'].map((label) => ({ label, policy }))
		)
	)(
		'$label preserves hidden categories under a $policy policy',
		async ({ label, policy }) => {
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
							consent: { categories: [policy] },
							model: 'opt-in',
						},
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
			await kernel.commands.init();
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
