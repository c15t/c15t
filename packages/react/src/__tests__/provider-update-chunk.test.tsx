/**
 * When the provider downloads the runtime's update module. An inline
 * `options={{ ... }}` hands the provider a new object on every render; when
 * it holds the same values, the rerender should load nothing. Its own file,
 * because a module loads once per test file.
 */
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { offline } from '../index';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

const updateModuleRequests = () =>
	performance
		.getEntriesByType('resource')
		.filter(({ name }) => name.includes('/core/src/runtime/provider-update'));

test('a rerender with the same option values loads no update module', async () => {
	// Vite's module graph can fill the browser's default resource buffer.
	performance.setResourceTimingBufferSize(5000);
	performance.clearResourceTimings();
	const mode = offline();
	const prefetch = policyFixture();
	const first = { externalId: 'user_1' };
	const provider = (user: { externalId: string }) => (
		<ConsentProvider options={{ mode, persistence: false, prefetch, user }}>
			<span>child</span>
		</ConsentProvider>
	);
	const screen = await render(provider(first));
	await screen.rerender(provider(first));
	await screen.rerender(provider(first));
	await new Promise((resolve) => {
		setTimeout(resolve, 100);
	});

	expect(updateModuleRequests()).toHaveLength(0);

	// A new value still loads it.
	await screen.rerender(provider({ externalId: 'user_2' }));
	await vi.waitFor(() => expect(updateModuleRequests()).toHaveLength(1));
});
