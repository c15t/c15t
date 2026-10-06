/**
 * The Svelte widget lists categories in the draft's order: necessary,
 * functionality, measurement, experience, marketing. Neither the policy nor
 * the configured list sets the order, and `state.consentCategories` reads
 * the same list, so the rows match React's and Vue's.
 */
import { render, waitFor } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import WidgetFixture from '../../__tests__/fixtures/widget-fixture.svelte';
import { policyFixture } from '../../__tests__/policy-fixture';
import { testOffline } from '../../__tests__/test-offline';
import type { ConsentContextValue } from '../../lib/context.svelte';

const ITEM_PREFIX = 'consent-widget-accordion-item-';

const EXPECTED = [
	'necessary',
	'functionality',
	'measurement',
	'experience',
	'marketing',
];

test('the widget lists categories in the draft order, not the policy or configured order', async () => {
	let context: ConsentContextValue | undefined;
	render(WidgetFixture, {
		capture: (captured: ConsentContextValue) => {
			context = captured;
		},
		options: {
			consentCategories: [
				'marketing',
				'experience',
				'necessary',
				'measurement',
				'functionality',
			],
			mode: testOffline(),
			persistence: false,
			prefetch: policyFixture(
				{},
				{
					categories: [
						'marketing',
						'measurement',
						'functionality',
						'experience',
					],
					id: 'category-order',
					model: 'opt-in',
					prompt: 'choice',
				}
			),
		},
	});

	await waitFor(() => {
		const rows = [
			...document.querySelectorAll<HTMLElement>(
				`[data-testid^="${ITEM_PREFIX}"]`
			),
		].map((item) => item.dataset.testid?.slice(ITEM_PREFIX.length));
		expect(rows).toEqual(EXPECTED);
	});
	expect(context?.state.consentCategories).toEqual(EXPECTED);
});
