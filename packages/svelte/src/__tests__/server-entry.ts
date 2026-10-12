import { custom } from '@c15t/core';
import type { ConsentKernel, ConsentSnapshot } from '@c15t/core';
import type { ComponentProps } from 'svelte';
import { render } from 'svelte/server';

import type { ConsentManagerOptions } from '../lib/types';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';
import PolicyFixture from './fixtures/policy-fixture.svelte';

export const renderFixture = function renderFixture(
	props:
		| ComponentProps<typeof PolicyFixture>
		| ComponentProps<typeof ConformanceFixture>,
	fixture: string
) {
	let snapshot: ConsentSnapshot | undefined;
	const onKernel = (kernel: ConsentKernel) => {
		snapshot = kernel.getServerSnapshot();
	};
	const options: ConsentManagerOptions = { ...props.options, mode: custom({}) };
	const output =
		fixture === 'policy-fixture.svelte'
			? render(PolicyFixture, { props: { ...props, onKernel, options } })
			: render(ConformanceFixture, {
					props: { component: 'consent-banner', ...props, onKernel, options },
				});
	const html = output.body;
	if (!snapshot) {
		throw new Error('Server render did not expose a snapshot');
	}
	return {
		html,
		now: snapshot.evaluatedAt,
		prompt: snapshot.promptRequirement,
	};
};
