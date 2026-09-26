import type { NetworkBlockerRule } from '@c15t/core/modules/network-blocker';
import { releaseNetworkRequests } from '@c15t/core/modules/network-hold';
import { StrictMode, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { offline, useNetworkBlocker } from '../index';
import { UNCOMMITTED_HOLD_MS } from '../module-hooks/network-hold';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

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
	// A test that fails mid-way can leave a hold behind; don't let it leak
	// into the next one.
	releaseNetworkRequests()();
	window.fetch = nativeFetch;
	vi.restoreAllMocks();
});

/** Sends a tracker request from its mount effect and records the status. */
const Beacon = ({
	label,
	statuses,
}: {
	label: string;
	statuses: Promise<number>[];
}) => {
	useEffect(() => {
		statuses.push(
			window.fetch(`${TRACKER}?when=${label}`).then(({ status }) => status)
		);
	}, [label, statuses]);
	return null;
};

const HookBlocker = ({ children }: { children: ReactNode }) => {
	useNetworkBlocker({ logBlockedRequests: false, rules });
	return children;
};

const trackerCalls = () =>
	network.mock.calls.filter(([input]) => String(input).startsWith(TRACKER));

/**
 * The hook's own children and a sibling rendered before it both send a
 * tracker request from their mount effects. Both effects run before the
 * hook's own effect, so a blocker installed from that effect sees neither.
 */
const renderWithBeacons = (
	measurement: boolean | undefined,
	wrap: (node: ReactNode) => ReactNode = (node) => node
) => {
	const statuses: Promise<number>[] = [];
	const prefetch =
		measurement === undefined
			? policyFixture()
			: policyFixture({ measurement });
	const view = render(
		wrap(
			<ConsentProvider
				options={{ mode: offline(), persistence: false, prefetch }}
			>
				<Beacon
					label="sibling"
					statuses={statuses}
				/>
				<HookBlocker>
					<Beacon
						label="child"
						statuses={statuses}
					/>
				</HookBlocker>
			</ConsentProvider>
		)
	);
	return { statuses, view };
};

test('holds requests from effects that run before the hook mounts', async () => {
	const { statuses } = renderWithBeacons(undefined);
	await vi.waitFor(() => expect(statuses).toHaveLength(2));

	expect(trackerCalls()).toHaveLength(0);
	expect(await Promise.all(statuses)).toEqual([451, 451]);
	expect(trackerCalls()).toHaveLength(0);
});

test('holds them in StrictMode too', async () => {
	const { statuses } = renderWithBeacons(false, (node) => (
		<StrictMode>{node}</StrictMode>
	));
	await vi.waitFor(() => expect(statuses.length).toBeGreaterThanOrEqual(2));

	for (const status of await Promise.all(statuses)) {
		expect(status).toBe(451);
	}
	expect(trackerCalls()).toHaveLength(0);
});

test('sends held requests once stored consent allows them', async () => {
	const { statuses } = renderWithBeacons(true);
	await vi.waitFor(() => expect(statuses).toHaveLength(2));

	expect(await Promise.all(statuses)).toEqual([200, 200]);
	expect(trackerCalls().map(([input]) => input)).toEqual([
		`${TRACKER}?when=sibling`,
		`${TRACKER}?when=child`,
	]);
});

test('allowed requests are not delayed after the blocker loads in StrictMode', async () => {
	const { statuses } = renderWithBeacons(true, (node) => (
		<StrictMode>{node}</StrictMode>
	));
	await vi.waitFor(() => expect(statuses.length).toBeGreaterThanOrEqual(2));
	await Promise.all(statuses);

	const late = await window.fetch(`${TRACKER}?when=late`);
	expect(late.status).toBe(200);
});

test('a retry after suspending does not leave the first render holding', async () => {
	let resume: () => void = () => {};
	let suspended: Promise<void> | null = new Promise<void>((resolve) => {
		resume = () => {
			suspended = null;
			resolve();
		};
	});
	const SuspendsOnce = () => {
		if (suspended) {
			throw suspended;
		}
		return null;
	};

	await render(
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: policyFixture({ measurement: true }),
			}}
		>
			<Suspense fallback={null}>
				<HookBlocker>
					<SuspendsOnce />
				</HookBlocker>
			</Suspense>
		</ConsentProvider>
	);
	resume();
	const late = window.fetch(`${TRACKER}?when=late`);

	// The first render was thrown away and started a hold nothing claims.
	// Once the retry commits and its blocker loads, the allowed request must
	// not wait for that hold to expire.
	await vi.waitFor(() => expect(trackerCalls()).toHaveLength(1), {
		timeout: 3000,
	});
	expect((await late).status).toBe(200);
});

test('a render React discards ends its hold on its own', async () => {
	const timers: { delay: number | undefined; run: () => void }[] = [];
	const nativeSetTimeout = window.setTimeout;
	vi.spyOn(window, 'setTimeout').mockImplementation(((
		callback: () => void,
		delay?: number,
		...rest: unknown[]
	) => {
		timers.push({ delay, run: callback });
		return nativeSetTimeout(callback, delay, ...rest);
	}) as typeof window.setTimeout);

	const ThrowsAfterHook = () => {
		useNetworkBlocker({ logBlockedRequests: false, rules });
		throw new Error('render failed before commit');
	};

	await expect(
		render(
			<ConsentProvider options={{ mode: offline(), persistence: false }}>
				<ThrowsAfterHook />
			</ConsentProvider>
		)
	).rejects.toThrow('render failed before commit');

	// The render held matching requests; nothing committed to take them over.
	let sent = false;
	const held = window.fetch(TRACKER).then((response) => {
		sent = true;
		return response.status;
	});
	await new Promise((resolve) => {
		nativeSetTimeout(resolve, 50);
	});
	expect(sent).toBe(false);
	expect(trackerCalls()).toHaveLength(0);

	const expiries = timers.filter(({ delay }) => delay === UNCOMMITTED_HOLD_MS);
	expect(expiries.length).toBeGreaterThan(0);
	for (const { run } of expiries) {
		run();
	}

	// The rules never took effect, so the request goes out as it would have
	// without the hook, and `fetch` is the page's own again.
	expect(await held).toBe(200);
	expect(trackerCalls()).toHaveLength(1);
	expect(window.fetch).toBe(network);
});
