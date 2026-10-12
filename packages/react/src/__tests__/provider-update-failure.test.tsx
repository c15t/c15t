/**
 * A rerender whose options changed hands them to the runtime's `update()`,
 * which rejects when its update module fails to load. The provider must
 * not leave that rejection unhandled: the next update loads it again.
 */
import type * as ProviderRuntimeModule from '@c15t/core/runtime/provider';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { offline } from '../index';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is what the provider does with a rejected update(); the real runtime rejects only when a chunk fails to load, which a test cannot cause without mocking.
vi.mock('@c15t/core/runtime/provider', async (importOriginal) => {
	const actual = await importOriginal<typeof ProviderRuntimeModule>();
	return {
		...actual,
		createConsentProviderRuntime: (
			...args: Parameters<typeof actual.createConsentProviderRuntime>
		) =>
			Object.assign(actual.createConsentProviderRuntime(...args), {
				update: () => Promise.reject(new Error('chunk failed')),
			}),
	};
});

test('an update that rejects is not an unhandled rejection', async () => {
	const rejections: unknown[] = [];
	const onRejection = (event: PromiseRejectionEvent) => {
		rejections.push(event.reason);
		// Reported here, not as a stray error in the run.
		event.preventDefault();
	};
	window.addEventListener('unhandledrejection', onRejection);
	try {
		const mode = offline();
		const prefetch = policyFixture();
		const provider = (externalId: string) => (
			<ConsentProvider
				options={{ mode, persistence: false, prefetch, user: { externalId } }}
			>
				<span>child</span>
			</ConsentProvider>
		);
		const screen = await render(provider('user_1'));
		await screen.rerender(provider('user_2'));
		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});

		expect(rejections).toEqual([]);
	} finally {
		window.removeEventListener('unhandledrejection', onRejection);
	}
});
