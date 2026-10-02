import { custom } from '@c15t/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import type { ConsentContextValue } from '../lib/context.svelte';
import PolicyFixture from './fixtures/policy-state-fixture.svelte';
import WidgetFixture from './fixtures/widget-fixture.svelte';
import { policyFixture } from './policy-fixture';

const captureContext = () => {
	let context: ConsentContextValue;
	return {
		capture(value: ConsentContextValue) {
			context = value;
		},
		get current() {
			return context;
		},
	};
};

describe('Svelte exemption preferences', () => {
	test('discloses statistics on the first-layer banner', () => {
		const context = captureContext();
		const view = render(PolicyFixture, {
			capture: context.capture,
			options: {
				consentCategories: ['necessary', 'measurement', 'marketing'],
				disableAnimation: true,
				mode: custom({}),
				persistence: false,
				prefetch: policyFixture(
					{},
					{
						categories: ['measurement', 'marketing'],
						exemptions: {
							measurement: { kind: 'uk-statistics', revision: 'review-1' },
						},
						id: 'svelte-uk-banner',
						match: { countries: ['GB'] },
						model: 'opt-in',
						prompt: 'choice',
						scopeMode: 'strict',
					}
				),
			},
		});
		try {
			expect(
				screen.getByTestId('consent-banner-exemption-notice').textContent
			).toContain(
				'We use service statistics to improve this service without asking for consent.'
			);
		} finally {
			view.unmount();
		}
	});

	test('separates a statistics objection from advertising consent', async () => {
		const context = captureContext();
		const view = render(WidgetFixture, {
			capture: context.capture,
			options: {
				consentCategories: ['necessary', 'measurement', 'marketing'],
				disableAnimation: true,
				mode: custom({}),
				persistence: false,
				prefetch: policyFixture(
					{},
					{
						categories: ['measurement', 'marketing'],
						exemptions: {
							measurement: { kind: 'uk-statistics', revision: 'review-1' },
						},
						id: 'svelte-uk-mixed',
						match: { countries: ['GB'] },
						model: 'opt-in',
						prompt: 'choice',
						scopeMode: 'strict',
					}
				),
			},
		});
		try {
			const measurement = screen.getByTestId(
				'consent-widget-switch-measurement'
			);
			const marketing = screen.getByTestId('consent-widget-switch-marketing');
			expect(measurement.getAttribute('aria-checked')).toBe('true');
			expect(marketing.getAttribute('aria-checked')).toBe('false');
			expect(
				screen.getByTestId('consent-widget-processing-measurement').textContent
			).toContain('You can turn this off at any time.');
			expect(
				screen.getByTestId('consent-widget-processing-marketing').textContent
			).toContain('Requires your consent.');
			await fireEvent.click(measurement);
			await fireEvent.click(marketing);
			expect(context.current.snapshot.effectivePermissions.measurement).toBe(
				true
			);
			expect(context.current.snapshot.effectivePermissions.marketing).toBe(
				false
			);
			await fireEvent.click(
				screen.getByTestId('consent-widget-footer-save-button')
			);
			await waitFor(() =>
				expect(
					context.current.snapshot.exemptionPreferences?.categories.measurement
						?.value
				).toBe(false)
			);
			expect(
				context.current.snapshot.explicitChoice?.categories.marketing?.value
			).toBe(true);
			expect(
				context.current.snapshot.explicitChoice?.categories.measurement
			).toBeUndefined();
			await fireEvent.click(
				screen.getByTestId('consent-widget-footer-accept-all-button')
			);
			expect(
				context.current.snapshot.exemptionPreferences?.categories.measurement
					?.value
			).toBe(false);
		} finally {
			view.unmount();
		}
	});
});
