/**
 * A provider with a hosted transport and nothing prefetched sends its
 * `/init` request from the render that builds its runtime, not from the
 * mount effect, so on a client-rendered page the request leaves before
 * the first paint. The response still applies at mount, through the
 * kernel's own init. These tests pin when it is sent, that React's
 * repeated and discarded renders share one request, and that nothing
 * reads it for a runtime that never runs.
 */
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { StrictMode, Suspense } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { hosted, useSnapshot } from '../index';
import { UNCOMMITTED_HOLD_MS } from '../module-hooks/network-hold';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

const BACKEND = 'https://consent.example/api/c15t';

/** An `/init` body for a policy whose id tells the responses apart. */
const initBody = (id: string) =>
	JSON.stringify({
		branding: 'c15t',
		location: { countryCode: 'DE', regionCode: null },
		policyResolution: writePolicyResolutionWire(
			policyFixture({}, { id }).initialPolicyResolution
		),
		translations: { language: 'en', translations: {} },
	});

interface InitRequest {
	headers: Record<string, string>;
	respond: (policyId: string) => void;
	fail: () => void;
}

let requests: InitRequest[];
let backendFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
	localStorage.clear();
	requests = [];
	backendFetch = vi.fn(
		(_url: string, init: RequestInit & { headers: Record<string, string> }) =>
			new Promise<Response>((resolve, reject) => {
				requests.push({
					fail: () => reject(new TypeError('Failed to fetch')),
					headers: init.headers,
					respond: (policyId) =>
						resolve(
							new Response(initBody(policyId), {
								headers: { 'x-c15t-policy-contract': '1' },
							})
						),
				});
			})
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

const initCalls = () =>
	backendFetch.mock.calls.filter(([url]) => String(url).endsWith('/init'));

/** Records, while it renders, how many `/init` requests were already out. */
const SeenAtRender = ({ seen }: { seen: number[] }) => {
	seen.push(initCalls().length);
	return null;
};

const PolicyProbe = () => {
	const snapshot = useSnapshot();
	return (
		<output data-testid="policy">
			{snapshot.policyPending ? 'pending' : snapshot.policyRule.id}
		</output>
	);
};

const mode = () => hosted({ fetch: backendFetch, url: BACKEND });

test('sends /init once, before its children render, under StrictMode', async () => {
	const seen: number[] = [];
	const options = { mode: mode(), persistence: false as const };
	const view = await render(
		<StrictMode>
			<ConsentProvider options={options}>
				<SeenAtRender seen={seen} />
				<PolicyProbe />
			</ConsentProvider>
		</StrictMode>
	);

	// The provider renders before its children, so the request was out
	// before any child rendered, let alone mounted.
	expect(seen[0]).toBe(1);
	await expect.element(view.getByTestId('policy')).toHaveTextContent('pending');
	expect(initCalls()).toHaveLength(1);

	// The mounted kernel's init takes that response.
	requests[0]?.respond('early');
	await expect.element(view.getByTestId('policy')).toHaveTextContent('early');
	expect(initCalls()).toHaveLength(1);
	await view.unmount();
});

test('a render that suspends before its first commit and its retry share one request', async () => {
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
	const options = { mode: mode(), persistence: false as const };

	// The boundary sits above the provider: the first render's runtime is
	// thrown away and the retry builds another.
	const view = await render(
		<Suspense fallback={null}>
			<ConsentProvider options={options}>
				<SuspendsOnce />
				<PolicyProbe />
			</ConsentProvider>
		</Suspense>
	);
	// Sent by the render React threw away.
	expect(initCalls()).toHaveLength(1);

	resume();
	await expect.element(view.getByTestId('policy')).toHaveTextContent('pending');
	requests[0]?.respond('shared');
	await expect.element(view.getByTestId('policy')).toHaveTextContent('shared');
	expect(initCalls()).toHaveLength(1);
});

test('a retry with other overrides asks again rather than use the first answer', async () => {
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
	const shared = mode();
	const app = (country: string) => (
		<Suspense fallback={null}>
			<ConsentProvider
				options={{ mode: shared, overrides: { country }, persistence: false }}
			>
				<SuspendsOnce />
				<PolicyProbe />
			</ConsentProvider>
		</Suspense>
	);

	const view = await render(app('DE'));
	expect(initCalls()).toHaveLength(1);
	expect(requests[0]?.headers['x-c15t-country']).toBe('DE');

	await view.rerender(app('FR'));
	resume();
	await vi.waitFor(() => expect(initCalls()).toHaveLength(2));
	expect(requests[1]?.headers['x-c15t-country']).toBe('FR');

	// The answer for DE arrives first and is not applied.
	requests[0]?.respond('for-de');
	await new Promise((resolve) => {
		setTimeout(resolve, 50);
	});
	await expect.element(view.getByTestId('policy')).toHaveTextContent('pending');
	requests[1]?.respond('for-fr');
	await expect.element(view.getByTestId('policy')).toHaveTextContent('for-fr');
});

test('a runtime whose render never commits sends one request and reads nothing from it', async () => {
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
	const onError = vi.fn();
	const Throws = () => {
		throw new Error('render failed before commit');
	};

	await expect(
		render(
			<ConsentProvider
				options={{ callbacks: { onError }, mode: mode(), persistence: false }}
			>
				<Throws />
			</ConsentProvider>
		)
	).rejects.toThrow('render failed before commit');
	expect(initCalls()).toHaveLength(1);

	for (const { run } of timers.filter(
		({ delay }) => delay === UNCOMMITTED_HOLD_MS
	)) {
		run();
	}
	// A failure nobody waits for is not an unhandled rejection, and no
	// retry or error report comes from a runtime that never ran.
	requests[0]?.fail();
	await new Promise((resolve) => {
		nativeSetTimeout(resolve, 50);
	});
	expect(onError).not.toHaveBeenCalled();
	expect(initCalls()).toHaveLength(1);
});

test('unmounting before the response arrives applies it nowhere', async () => {
	const onSurfaceShown = vi.fn();
	const onPermissionsChanged = vi.fn();
	const seen: number[] = [];
	const view = await render(
		<ConsentProvider
			options={{
				callbacks: { onPermissionsChanged, onSurfaceShown },
				mode: mode(),
				persistence: false,
			}}
		>
			<SeenAtRender seen={seen} />
		</ConsentProvider>
	);
	expect(seen[0]).toBe(1);
	await view.unmount();
	await vi.waitFor(() =>
		expect((window as { c15t?: unknown }).c15t).toBeUndefined()
	);
	onPermissionsChanged.mockClear();

	requests[0]?.respond('too-late');
	await new Promise((resolve) => {
		setTimeout(resolve, 50);
	});
	expect(onSurfaceShown).not.toHaveBeenCalled();
	expect(onPermissionsChanged).not.toHaveBeenCalled();
	expect(initCalls()).toHaveLength(1);
});

test.each([
	[
		'a resolved prefetch',
		{ prefetch: policyFixture({}, { id: 'prefetched' }) },
	],
	[
		'an experiment',
		{
			experiment: {
				arms: {
					bar: { prompt: { variant: 'bar' as const } },
					floating: { prompt: { variant: 'floating' as const } },
				},
				id: 'banner-shape',
			},
		},
	],
	['enabled: false', { enabled: false }],
])('%s sends nothing during render', async (_name, extra) => {
	const seen: number[] = [];
	const view = await render(
		<ConsentProvider options={{ mode: mode(), persistence: false, ...extra }}>
			<SeenAtRender seen={seen} />
		</ConsentProvider>
	);
	expect(seen[0]).toBe(0);
	await view.unmount();
});
