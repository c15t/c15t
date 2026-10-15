import { offline } from '@c15t/core';
import type { Script } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import { resolvePolicyRules } from '@c15t/schema/types';
import { mount } from '@vue/test-utils';
import { expect, test, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import { c15tVue } from '../index';
import type { EventDispatcher } from '../runtime/composables';
import { useEventDispatcher } from '../runtime/composables';

const posthog: Script = {
	callbackOnly: true,
	category: 'measurement',
	id: 'posthog',
	vendor: 'posthog',
};

test('useEventDispatcher follows the runtime scripts, live consent and one pageview history', async () => {
	const runtime = createConsentRuntime({
		mode: offline(),
		prefetch: {
			initialPolicyResolution: resolvePolicyRules({
				countryCode: null,
				regionCode: null,
				rules: [
					{
						categories: ['measurement'],
						id: 'events',
						match: { fallback: true },
						model: 'opt-in',
						prompt: 'choice',
					},
				],
			}),
		},
		scripts: [posthog],
	});
	const capture = vi.fn();
	const globals = { posthog: { capture } };
	const dispatchers: EventDispatcher[] = [];
	const Probe = defineComponent({
		setup() {
			dispatchers.push(
				useEventDispatcher(() => ({ globals, pageviews: ['posthog'] }))
			);
			return () => h('div');
		},
	});
	const wrapper = mount(
		defineComponent({ setup: () => () => [h(Probe), h(Probe)] }),
		{ global: { plugins: [[c15tVue, { runtime }]] } }
	);
	const [first, second] = dispatchers;

	first?.pageview('/');
	await runtime.kernel.commands.save({ measurement: true });
	// Another component's dispatcher shares the history, so this is the first send.
	second?.pageview('/pricing');
	first?.pageview('/pricing');
	expect(capture.mock.calls).toEqual([['$pageview']]);

	await runtime.kernel.commands.save({ measurement: false });
	first?.track('add_to_cart');
	expect(capture).toHaveBeenCalledTimes(1);
	wrapper.unmount();
});
