import { offline } from '@c15t/core';
import type { EventDispatcher } from '@c15t/core/events';
import { render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

import type { ConsentContextValue } from '../lib/context.svelte';
import Fixture from './fixtures/event-dispatcher-fixture.svelte';
import { TEST_OPT_IN_RULE } from './test-offline';

test('getEventDispatcher follows the provider scripts, live consent and one pageview history', async () => {
	const capture = vi.fn();
	const globals = { posthog: { capture } };
	const dispatchers: EventDispatcher[] = [];
	let context!: ConsentContextValue;
	const view = render(Fixture, {
		captureContext: (value) => {
			context = value;
		},
		captureDispatcher: (events) => {
			dispatchers.push(events);
		},
		dispatcherOptions: () => ({ globals, pageviews: ['posthog'] }),
		options: {
			iframeBlocker: false,
			mode: offline({
				policyRules: [{ ...TEST_OPT_IN_RULE, categories: ['measurement'] }],
			}),
			scripts: [
				{
					callbackOnly: true,
					category: 'measurement',
					id: 'posthog',
					vendor: 'posthog',
				},
			],
		},
	});
	try {
		const [first, second] = dispatchers;
		first?.pageview('/');
		await context.kernel.commands.save({ measurement: true });
		// The other component's dispatcher shares the history, so this is the first send.
		second?.pageview('/pricing');
		first?.pageview('/pricing');
		expect(capture.mock.calls).toEqual([['$pageview']]);

		await context.kernel.commands.save({ measurement: false });
		first?.track('add_to_cart');
		expect(capture).toHaveBeenCalledTimes(1);
	} finally {
		view.unmount();
	}
});
