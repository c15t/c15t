/**
 * A provider that unmounts before its network blocker loads.
 *
 * The provider holds matching requests from its first render, and the
 * blocker takes them over once its chunk loads. When the provider goes
 * away first, nothing ever checked consent for what it held, so those
 * requests must fail the way the blocker fails a blocked one: never sent,
 * and never left pending.
 *
 * The blocker chunk is held back until the end of the test, so the unmount
 * lands before it loads.
 */
import type { NetworkBlockerRule } from '@c15t/core/modules/network-blocker';
import {
	holdNetworkRequests,
	releaseNetworkRequests,
} from '@c15t/core/modules/network-hold';
import { useEffect } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { offline } from '../index';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

const chunk = vi.hoisted(() => {
	let open = () => {
		/* replaced below */
	};
	const gate = new Promise<void>((resolve) => {
		open = resolve;
	});
	return { gate, open: () => open() };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is what happens before this module loads. The factory holds the chunk back until the file is done, then returns the real module.
vi.mock('@c15t/core/modules/network-blocker', async (importOriginal) => {
	await chunk.gate;
	return await importOriginal();
});

const TRACKER = 'https://tracker.example/collect';
const rules: NetworkBlockerRule[] = [
	{ category: 'measurement', domain: 'tracker.example' },
];

let nativeFetch: typeof window.fetch;
let network: ReturnType<typeof vi.fn>;

beforeEach(() => {
	nativeFetch = window.fetch;
	network = vi.fn(() => Promise.resolve(new Response('ok')));
	window.fetch = network as unknown as typeof window.fetch;
});

afterEach(() => {
	releaseNetworkRequests()();
	window.fetch = nativeFetch;
});

const Beacon = ({ requests }: { requests: Promise<Response>[] }) => {
	useEffect(() => {
		requests.push(window.fetch(TRACKER));
	}, [requests]);
	return null;
};

const flush = () =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, 20);
	});

test('unmounting before the blocker loads fails held requests closed', async () => {
	// Another caller holds its own rules and must keep holding.
	holdNetworkRequests([{ category: 'marketing', domain: 'ads.example' }]);
	let adsSettled = false;
	const ads = window.fetch('https://ads.example/pixel').finally(() => {
		adsSettled = true;
	});
	const requests: Promise<Response>[] = [];
	const view = await render(
		<ConsentProvider
			options={{
				mode: offline(),
				networkBlocker: { logBlockedRequests: false, rules },
				persistence: false,
				// Stored consent allows it: still unchecked, so still blocked.
				prefetch: policyFixture({ measurement: true }),
			}}
		>
			<Beacon requests={requests} />
		</ConsentProvider>
	);
	await vi.waitFor(() => expect(requests).toHaveLength(1));
	await flush();
	expect(network).not.toHaveBeenCalled();

	await view.unmount();

	const response = await requests[0];
	expect(response?.status).toBe(451);
	expect(response?.statusText).toBe('Request blocked by consent');
	await flush();
	expect(network).not.toHaveBeenCalled();
	expect(adsSettled).toBe(false);

	// End the other caller's hold so its request settles before cleanup.
	releaseNetworkRequests()();
	await ads;

	// Let the chunk finish loading before the browser closes. The provider
	// is gone, so it installs nothing and the answer above stands.
	chunk.open();
	await import('@c15t/core/modules/network-blocker');
	expect((await requests[0])?.status).toBe(451);
});
