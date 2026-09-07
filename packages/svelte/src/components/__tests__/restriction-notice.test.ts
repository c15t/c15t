/**
 * The restriction notice explains why a saved grant is not in effect. An
 * unsaved draft toggle must not trigger it.
 */
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, test } from 'vitest';

import WidgetFixture from '../../__tests__/fixtures/widget-fixture.svelte';
import { policyFixture } from '../../__tests__/policy-fixture';
import { offline } from '../../lib/transports/offline';

const CATEGORIES = [
	'necessary',
	'functionality',
	'experience',
	'marketing',
	'measurement',
] as const;

const restriction = (name: string) =>
	document.querySelector(`[data-testid="consent-widget-restriction-${name}"]`);

describe('consent widget restriction notice', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('does not appear when a draft toggle is switched on before saving', async () => {
		render(WidgetFixture, {
			options: {
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(undefined, {
					categories: [...CATEGORIES],
					id: 'draft-toggle',
					model: 'opt-in',
					prompt: 'choice',
				}),
			},
		});

		const experience = await waitFor(() => {
			const element = document.querySelector<HTMLElement>(
				'[data-testid="consent-widget-switch-experience"]'
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});
		await fireEvent.click(experience);
		await waitFor(() => {
			expect(experience.getAttribute('aria-checked')).toBe('true');
		});

		expect(restriction('experience')).toBeNull();
	});

	test('appears for a saved grant that GPC overrides', async () => {
		render(WidgetFixture, {
			options: {
				mode: offline(),
				persistence: false,
				prefetch: {
					...policyFixture(
						{ marketing: true, measurement: true },
						{
							categories: [...CATEGORIES],
							id: 'gpc-restricted',
							model: 'opt-in',
							privacySignals: { gpc: { denyCategories: ['marketing'] } },
							prompt: 'choice',
						}
					),
					initialOverrides: { gpc: true },
				},
			},
		});

		const notice = await waitFor(() => {
			const element = restriction('marketing');
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});
		expect(notice.textContent).toContain('restricted');
		const marketing = document.querySelector(
			'[data-testid="consent-widget-switch-marketing"]'
		);
		expect(marketing?.getAttribute('aria-describedby')).toBe(notice.id);
		expect(restriction('measurement')).toBeNull();
	});
});
