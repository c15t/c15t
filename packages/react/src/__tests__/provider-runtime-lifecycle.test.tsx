/**
 * The provider builds one consent runtime per mounted instance during its
 * first render. A runtime with network rules holds matching requests from
 * construction, so a render React throws away must not leave its runtime
 * (and that hold) behind, and a replayed StrictMode mount must not start a
 * second one.
 */
import type { InitContext, InitResponse } from '@c15t/core';
import type { NetworkBlockerRule } from '@c15t/core/modules/network-blocker';
import { releaseNetworkRequests } from '@c15t/core/modules/network-hold';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { StrictMode, Suspense } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { custom } from '../index';
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
	// A failed test can leave a hold behind; don't let it leak.
	releaseNetworkRequests()();
	window.fetch = nativeFetch;
	vi.restoreAllMocks();
});

const trackerCalls = () =>
	network.mock.calls.filter(([input]) => String(input).startsWith(TRACKER));

/** A transport whose `/init` grants measurement (opt-out), counting calls. */
const countingMode = () => {
	const fixture = policyFixture({}, { model: 'opt-out' });
	const init = vi.fn((_context: InitContext): Promise<InitResponse> =>
		Promise.resolve({
			policyResolution: writePolicyResolutionWire(
				fixture.initialPolicyResolution
			),
		})
	);
	return { init, mode: custom({ init }) };
};

test('StrictMode starts one runtime: one /init, one hold, nothing left holding', async () => {
	const { init, mode } = countingMode();
	const view = await render(
		<StrictMode>
			<ConsentProvider
				options={{
					mode,
					networkBlocker: { logBlockedRequests: false, rules },
					persistence: false,
					prefetch: policyFixture({ measurement: true }),
				}}
			>
				{null}
			</ConsentProvider>
		</StrictMode>
	);

	// The resolved prefetch is adopted, so the replayed mount must not
	// fall back to a network init either.
	await new Promise((resolve) => {
		setTimeout(resolve, 50);
	});
	expect(init).not.toHaveBeenCalled();

	// The blocker took over the only hold: an allowed request goes out now
	// instead of waiting on a hold a discarded runtime kept.
	await vi.waitFor(async () => {
		const response = await window.fetch(`${TRACKER}?when=late`);
		expect(response.status).toBe(200);
	});
	expect(trackerCalls().length).toBeGreaterThan(0);

	expect((window as { c15t?: unknown }).c15t).toBeDefined();
	await view.unmount();
	// A real unmount disposes the runtime, after StrictMode's replay did not.
	await vi.waitFor(() =>
		expect((window as { c15t?: unknown }).c15t).toBeUndefined()
	);
});

test('StrictMode sends a single /init without a prefetch', async () => {
	const { init, mode } = countingMode();
	const view = await render(
		<StrictMode>
			<ConsentProvider options={{ mode, persistence: false }}>
				{null}
			</ConsentProvider>
		</StrictMode>
	);
	await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));
	await new Promise((resolve) => {
		setTimeout(resolve, 50);
	});
	expect(init).toHaveBeenCalledTimes(1);
	await view.unmount();
});

test('a render that suspends before its first commit leaves no runtime holding', async () => {
	let resume: () => void = () => undefined;
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
	const { init, mode } = countingMode();
	const options = {
		mode,
		networkBlocker: { logBlockedRequests: false, rules },
		persistence: false as const,
	};

	// The boundary sits above the provider, so the first render's provider,
	// runtime and hold are thrown away; the retry builds another.
	await render(
		<Suspense fallback={null}>
			<ConsentProvider options={options}>
				<SuspendsOnce />
			</ConsentProvider>
		</Suspense>
	);
	resume();
	const late = window.fetch(`${TRACKER}?when=late`);

	// Once the retry commits, /init grants measurement and the blocker
	// loads; the allowed request must not wait for the first render's hold
	// to expire.
	await vi.waitFor(() => expect(trackerCalls()).toHaveLength(1), {
		timeout: 3000,
	});
	expect((await late).status).toBe(200);
	expect(init).toHaveBeenCalledTimes(1);
});

test('a runtime whose render never commits disposes itself and fails its hold closed', async () => {
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
	const Throws = () => {
		throw new Error('render failed before commit');
	};
	const { init, mode } = countingMode();

	await expect(
		render(
			<ConsentProvider
				options={{
					mode,
					networkBlocker: { logBlockedRequests: false, rules },
					persistence: false,
				}}
			>
				<Throws />
			</ConsentProvider>
		)
	).rejects.toThrow('render failed before commit');

	let sent = false;
	const held = window.fetch(TRACKER).then((response) => {
		sent = true;
		return response.status;
	});
	await new Promise((resolve) => {
		nativeSetTimeout(resolve, 50);
	});
	expect(sent).toBe(false);

	const expiries = timers.filter(({ delay }) => delay === UNCOMMITTED_HOLD_MS);
	expect(expiries.length).toBeGreaterThan(0);
	for (const { run } of expiries) {
		run();
	}

	// Never started: no /init, and what it held fails as blocked.
	expect(await held).toBe(451);
	expect(trackerCalls()).toHaveLength(0);
	expect(window.fetch).toBe(network);
	expect(init).not.toHaveBeenCalled();
});
