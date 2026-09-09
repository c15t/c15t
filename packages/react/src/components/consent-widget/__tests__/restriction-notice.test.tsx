/**
 * The restriction notice explains why a *saved* grant is not in effect.
 * It must not appear for an unsaved draft toggle, which under opt-in is
 * always "on in the draft, off in effect" until the visitor saves.
 */
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentWidget } from '~/components/consent-widget';
import { offline } from '~/transports/offline';

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
	test('does not appear when a draft toggle is switched on before saving', async () => {
		render(
			<ConsentProvider
				options={{
					consentCategories: [...CATEGORIES],
					mode: offline(),
					prefetch: policyFixture(undefined, {
						categories: [...CATEGORIES],
						id: 'draft-toggle',
						model: 'opt-in',
						prompt: 'choice',
					}),
				}}
			>
				<ConsentWidget />
			</ConsentProvider>
		);

		const experience = await vi.waitFor(() => {
			const element = document.querySelector<HTMLElement>(
				'[data-testid="consent-widget-switch-experience"]'
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});
		await userEvent.click(experience);
		await vi.waitFor(() => {
			expect(experience.getAttribute('aria-checked')).toBe('true');
		});

		expect(restriction('experience')).toBeNull();
		expect(experience.getAttribute('aria-describedby')).toBeNull();
	});

	test('appears below the row for a saved grant that GPC overrides', async () => {
		render(
			<ConsentProvider
				options={{
					consentCategories: [...CATEGORIES],
					mode: offline(),
					overrides: { gpc: true },
					prefetch: policyFixture(
						{ marketing: true, measurement: true },
						{
							categories: [...CATEGORIES],
							id: 'gpc-restricted',
							model: 'opt-in',
							privacySignals: { gpc: { denyCategories: ['marketing'] } },
							prompt: 'choice',
						}
					),
				}}
			>
				<ConsentWidget />
			</ConsentProvider>
		);

		const notice = await vi.waitFor(() => {
			const element = restriction('marketing');
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});
		expect(notice.textContent).toContain('restricted');

		// The notice is a sibling of the trigger row, not a child of it.
		const row = document.querySelector(
			'[data-testid="consent-widget-accordion-trigger-marketing"]'
		);
		expect(row?.contains(notice)).toBe(false);

		const marketing = document.querySelector(
			'[data-testid="consent-widget-switch-marketing"]'
		);
		expect(marketing?.getAttribute('aria-describedby')).toBe(notice.id);

		// A saved grant that nothing restricts gets no notice.
		expect(restriction('measurement')).toBeNull();
	});
});
