/**
 * A provider with a hosted transport and nothing prefetched sends its
 * `/init` request from the render that builds its runtime, not from the
 * mount effect, so on a client-rendered page the request leaves before
 * the first paint. The response still applies at mount, through the
 * kernel's own init. These tests pin when it is sent, that React's
 * repeated and discarded renders share one request, and that nothing
 * reads it for a runtime that never runs.
 */
import type {
	ConsentKernel,
	KernelTransport,
	ProviderTransportContext,
} from '@c15t/core';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { StrictMode, Suspense, useContext, useEffect } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
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

test('a hosted() mode created inline shares one request across StrictMode and a suspended render', async () => {
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
	// Every render of the app builds a new `hosted()` factory, as in the
	// provider's documented example.
	const App = () => (
		<ConsentProvider
			options={{
				mode: hosted({ fetch: backendFetch, url: BACKEND }),
				persistence: false,
			}}
		>
			<SuspendsOnce />
			<PolicyProbe />
		</ConsentProvider>
	);

	const view = await render(
		<StrictMode>
			<Suspense fallback={null}>
				<App />
			</Suspense>
		</StrictMode>
	);
	expect(initCalls()).toHaveLength(1);

	resume();
	await expect.element(view.getByTestId('policy')).toHaveTextContent('pending');
	expect(initCalls()).toHaveLength(1);
	requests[0]?.respond('shared');
	await expect.element(view.getByTestId('policy')).toHaveTextContent('shared');
	expect(initCalls()).toHaveLength(1);
	await view.unmount();
});

test('sibling providers given one mode object each get a transport and an /init', async () => {
	const kernels = new Map<string, ConsentKernel>();
	const Capture = ({ name }: { name: string }) => {
		const kernel = useContext(KernelContext);
		useEffect(() => {
			if (kernel) {
				kernels.set(name, kernel);
			}
		}, [kernel, name]);
		return null;
	};
	// Tags each save with the transport that sends it.
	const savedBy: KernelTransport[] = [];
	const base = hosted({ fetch: backendFetch, url: BACKEND });
	const shared = Object.assign(
		(context: ProviderTransportContext) => {
			const transport = base(context);
			const save = transport.save as NonNullable<KernelTransport['save']>;
			transport.save = (payload) => {
				savedBy.push(transport);
				return save(payload);
			};
			return transport;
		},
		{ kind: base.kind, options: base.options }
	);
	const view = await render(
		<StrictMode>
			{['DE', 'FR'].map((country) => (
				<ConsentProvider
					key={country}
					options={{ mode: shared, overrides: { country }, persistence: false }}
				>
					<Capture name={country} />
				</ConsentProvider>
			))}
		</StrictMode>
	);

	await vi.waitFor(() => expect(initCalls()).toHaveLength(2));
	expect(requests.map(({ headers }) => headers['x-c15t-country'])).toEqual([
		'DE',
		'FR',
	]);
	requests[0]?.respond('for-de');
	requests[1]?.respond('for-fr');
	await vi.waitFor(() => {
		expect(kernels.get('DE')?.getSnapshot().policyRule.id).toBe('for-de');
		expect(kernels.get('FR')?.getSnapshot().policyRule.id).toBe('for-fr');
	});

	kernels.get('DE')?.commands.save('none');
	kernels.get('FR')?.commands.save('none');
	await vi.waitFor(() => expect(savedBy).toHaveLength(2));
	expect(savedBy[0]).not.toBe(savedBy[1]);
	expect(initCalls()).toHaveLength(2);
	await view.unmount();
});

test('providers whose hosted() modes differ never share a request', async () => {
	const otherFetch = vi.fn(() =>
		Promise.resolve(new Response(initBody('other')))
	);
	const view = await render(
		<>
			<ConsentProvider
				options={{
					mode: hosted({ fetch: backendFetch, url: BACKEND }),
					persistence: false,
				}}
			/>
			<ConsentProvider
				options={{
					mode: hosted({ fetch: backendFetch, url: `${BACKEND}/other` }),
					persistence: false,
				}}
			/>
			<ConsentProvider
				options={{
					mode: hosted({
						fetch: backendFetch,
						headers: { 'accept-language': 'fr' },
						url: BACKEND,
					}),
					persistence: false,
				}}
			/>
			<ConsentProvider
				options={{
					mode: hosted({ fetch: otherFetch, url: BACKEND }),
					persistence: false,
				}}
			/>
		</>
	);

	expect(initCalls().map(([url]) => String(url))).toEqual([
		`${BACKEND}/init`,
		`${BACKEND}/other/init`,
		`${BACKEND}/init`,
	]);
	expect(requests[2]?.headers['accept-language']).toBe('fr');
	expect(otherFetch).toHaveBeenCalledTimes(1);
	await view.unmount();
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
