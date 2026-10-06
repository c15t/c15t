/**
 * The widget lists the draft's categories in the draft's order: necessary,
 * functionality, measurement, experience, marketing. Neither the policy nor
 * the configured list sets the order; every framework renders the same rows
 * in the same order, which the parity suite compares.
 */
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentWidget } from '~/components/preferences';
import { useConsentDraft } from '~/draft';
import { offline } from '~/transports/offline';

const ITEM_PREFIX = 'consent-widget-accordion-item-';

const DraftProbe = () => (
	<output data-testid="draft-order">
		{useConsentDraft().displayedCategories.join(',')}
	</output>
);

test('the widget lists categories in the draft order, not the policy or configured order', async () => {
	render(
		<ConsentProvider
			options={{
				consentCategories: [
					'marketing',
					'experience',
					'necessary',
					'measurement',
					'functionality',
				],
				mode: offline(),
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
					}
				),
			}}
		>
			<ConsentWidget />
			<DraftProbe />
		</ConsentProvider>
	);

	const expected = [
		'necessary',
		'functionality',
		'measurement',
		'experience',
		'marketing',
	];
	await expect
		.poll(() =>
			[
				...document.querySelectorAll<HTMLElement>(
					`[data-testid^="${ITEM_PREFIX}"]`
				),
			].map((item) => item.dataset.testid?.slice(ITEM_PREFIX.length))
		)
		.toEqual(expected);
	expect(
		document.querySelector('[data-testid="draft-order"]')?.textContent
	).toBe(expected.join(','));
});
