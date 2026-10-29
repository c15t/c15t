import type { Script } from '@c15t/core';
import { useEffect } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
	ConsentProvider,
	offline,
	useConsent,
	useEventDispatcher,
	useSaveConsents,
} from '../index';
import { policyFixture } from './policy-fixture';

const posthog: Script = {
	callbackOnly: true,
	category: 'measurement',
	id: 'posthog',
	vendor: 'posthog',
};

test('useEventDispatcher keeps one dispatcher and pageview history through consent changes and the enabled toggle', async () => {
	const capture = vi.fn();
	const globals = { posthog: { capture } };
	const dispatchers = new Set<unknown>();

	const Page = ({ path }: { path: string }) => {
		// Re-renders on every consent change, as a consent-aware page does.
		useConsent('measurement');
		const save = useSaveConsents();
		const events = useEventDispatcher({ globals, pageviews: ['posthog'] });
		dispatchers.add(events);
		useEffect(() => events.pageview(path), [events, path]);
		return (
			<>
				<button
					type="button"
					onClick={() => save({ measurement: true })}
				>
					accept
				</button>
				<button
					type="button"
					onClick={() => {
						save({ measurement: false });
						events.track('add_to_cart');
					}}
				>
					revoke and track
				</button>
				<button
					type="button"
					onClick={() => events.track('add_to_cart')}
				>
					track
				</button>
			</>
		);
	};
	const App = ({ enabled, path }: { enabled: boolean; path: string }) => (
		<ConsentProvider
			options={{
				consentCategories: ['measurement'],
				enabled,
				mode: offline({ acknowledgeNoRecords: true }),
				persistence: false,
				prefetch: policyFixture(),
				scripts: [posthog],
			}}
		>
			<Page path={path} />
		</ConsentProvider>
	);

	const screen = await render(
		<App
			enabled
			path="/"
		/>
	);
	await screen.getByRole('button', { name: 'accept' }).click();
	await screen.rerender(
		<App
			enabled
			path="/pricing"
		/>
	);
	await vi.waitFor(() => expect(capture).toHaveBeenCalledWith('$pageview'));

	// Consent is read when the event is sent, not when the page rendered.
	await screen.getByRole('button', { name: 'revoke and track' }).click();
	expect(capture).toHaveBeenCalledTimes(1);

	// Turning c15t off swaps the kernel, and the dispatcher follows it.
	await screen.rerender(
		<App
			enabled={false}
			path="/pricing"
		/>
	);
	await screen.getByRole('button', { exact: true, name: 'track' }).click();
	await vi.waitFor(() =>
		expect(capture).toHaveBeenLastCalledWith('add_to_cart', {})
	);
	expect(capture).toHaveBeenCalledTimes(2);
	expect(dispatchers.size).toBe(1);
});
