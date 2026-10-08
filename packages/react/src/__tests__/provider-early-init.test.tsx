/**
 * A provider with a hosted transport and nothing prefetched sends its
 * `/init` request from the client render that builds its runtime, not
 * from the mount effect, so the request leaves before the first paint.
 * Server renders and hydration send nothing. The response still applies
 * at mount, through the kernel's own init. These tests pin when it is
 * sent, that React's
 * repeated and discarded renders share one request, and that nothing
 * reads it for a runtime that never runs.
 */
import { createConsentKernel } from '@c15t/core';
import type {
	ConsentKernel,
	KernelTransport,
	ProviderTransportContext,
} from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import {
	readJourneyParams,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { StrictMode, Suspense, act, useContext, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
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
	sessionStorage.clear();
	// The page's early journey; each test is a fresh page load.
	delete (window as Window & { __c15tJourney?: unknown }).__c15tJourney;
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
	vi.unstubAllGlobals();
});

/** `/init` requests, by path: a mounted runtime adds its journey as a query. */
const initCalls = () =>
	backendFetch.mock.calls.filter(([url]) =>
		String(url).split('?')[0]?.endsWith('/init')
	);

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

test('the early /init and the save it leads to carry one journey', async () => {
	let kernel: ConsentKernel | null = null;
	const Capture = () => {
		const current = useContext(KernelContext);
		useEffect(() => {
			kernel = current;
		}, [current]);
		return null;
	};
	const options = { mode: mode(), persistence: false as const };
	const view = await render(
		<StrictMode>
			<ConsentProvider options={options}>
				<Capture />
				<PolicyProbe />
			</ConsentProvider>
		</StrictMode>
	);

	// Sent during the render, before the runtime started.
	expect(initCalls()).toHaveLength(1);
	const early = readJourneyParams(String(initCalls()[0]?.[0]));
	expect(early).toEqual({
		id: expect.stringMatching(/^[\da-f-]{36}$/u),
		scope: 'page',
		storedChoice: false,
	});

	requests[0]?.respond('early');
	await expect.element(view.getByTestId('policy')).toHaveTextContent('early');
	// The mounted kernel took the early response instead of asking again.
	expect(initCalls()).toHaveLength(1);

	const saving = (kernel as ConsentKernel | null)?.commands.save('all');
	await vi.waitFor(() => expect(requests).toHaveLength(2));
	requests[1]?.respond('early');
	await saving;
	const save = backendFetch.mock.calls.find(([url]) =>
		String(url).split('?')[0]?.endsWith('/subjects')
	);
	expect(readJourneyParams(String(save?.[0]))).toEqual({
		id: early?.id,
		scope: 'page',
	});
	await view.unmount();
});

test('a tab journey on the early /init continues the id an earlier page kept', async () => {
	const id = '3b241101-e2bb-4255-8caf-4136c566a962';
	sessionStorage.setItem('c15t-journey-v1', id);
	const view = await render(
		<ConsentProvider
			options={{ journey: 'tab', mode: mode(), persistence: false }}
		>
			<PolicyProbe />
		</ConsentProvider>
	);
	expect(readJourneyParams(String(initCalls()[0]?.[0]))).toEqual({
		id,
		scope: 'tab',
		storedChoice: false,
	});
	await view.unmount();
});

test('a server render sends nothing, even where window exists', () => {
	const html = renderToString(
		<ConsentProvider options={{ mode: mode(), persistence: false }}>
			<PolicyProbe />
		</ConsentProvider>
	);

	expect(html).toContain('pending');
	expect(initCalls()).toHaveLength(0);
});

test('hydration sends nothing during render and asks at mount', async () => {
	const seen: number[] = [];
	const app = (
		<ConsentProvider options={{ mode: mode(), persistence: false }}>
			<SeenAtRender seen={seen} />
			<PolicyProbe />
		</ConsentProvider>
	);
	const host = document.createElement('div');
	host.innerHTML = renderToString(app);
	document.body.append(host);
	seen.length = 0;
	const onRecoverableError = vi.fn();
	let root: ReturnType<typeof hydrateRoot> | undefined;
	try {
		await act(() => {
			root = hydrateRoot(host, app, { onRecoverableError });
		});

		expect(seen[0]).toBe(0);
		expect(onRecoverableError).not.toHaveBeenCalled();
		expect(initCalls()).toHaveLength(1);
		await act(() => requests[0]?.respond('at-mount'));
		await vi.waitFor(() => expect(host.textContent).toBe('at-mount'));
		expect(initCalls()).toHaveLength(1);
	} finally {
		await act(() => root?.unmount());
		host.remove();
	}
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

test('a retry after the shared hosted() options changed sends its own request', async () => {
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
	const shared = {
		fetch: backendFetch,
		headers: { 'accept-language': 'de' },
		url: BACKEND,
	};
	const App = () => (
		<ConsentProvider options={{ mode: hosted(shared), persistence: false }}>
			<SuspendsOnce />
			<PolicyProbe />
		</ConsentProvider>
	);

	const view = await render(
		<Suspense fallback={null}>
			<App />
		</Suspense>
	);
	expect(initCalls()).toHaveLength(1);

	// The same object, edited before React retries.
	shared.url = 'https://other.example/api/c15t';
	shared.headers['accept-language'] = 'fr';
	resume();
	await expect.element(view.getByTestId('policy')).toHaveTextContent('pending');
	await vi.waitFor(() => expect(initCalls()).toHaveLength(2));
	expect(String(initCalls()[0]?.[0])).toContain('consent.example');
	expect(requests[0]?.headers['accept-language']).toBe('de');
	expect(String(initCalls()[1]?.[0])).toContain('other.example');
	expect(requests[1]?.headers['accept-language']).toBe('fr');

	requests[0]?.respond('stale');
	requests[1]?.respond('fresh');
	await expect.element(view.getByTestId('policy')).toHaveTextContent('fresh');
	await view.unmount();
});

test('a retry after the global fetch changed sends its own request through the new one', async () => {
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
	let kernel: ConsentKernel | null = null;
	const Capture = () => {
		const current = useContext(KernelContext);
		useEffect(() => {
			kernel = current;
		}, [current]);
		return null;
	};
	// Each request, tagged with the global fetch that sent it.
	const calls: string[] = [];
	const globalFetch = (tag: string) =>
		((url: string, init: RequestInit) => {
			// The path: the query carries the page's consent journey.
			calls.push(`${tag} ${String(url).slice(BACKEND.length).split('?')[0]}`);
			return backendFetch(url, init);
		}) as typeof fetch;
	vi.stubGlobal('fetch', globalFetch('old'));
	// No `fetch`: the transport takes the global one when it is built.
	const App = () => (
		<ConsentProvider
			options={{ mode: hosted({ url: BACKEND }), persistence: false }}
		>
			<SuspendsOnce />
			<Capture />
		</ConsentProvider>
	);

	const view = await render(
		<Suspense fallback={null}>
			<App />
		</Suspense>
	);
	expect(calls).toEqual(['old /init']);

	// An instrumentation wrapper installed before React retries.
	vi.stubGlobal('fetch', globalFetch('new'));
	resume();
	await vi.waitFor(() => expect(kernel).not.toBeNull());
	for (const request of requests) {
		request.respond('policy');
	}
	await vi.waitFor(() =>
		expect(kernel?.getSnapshot().policyPending).toBe(false)
	);
	kernel?.commands.save('none');
	// Every request after the thrown-away render's goes through the new one.
	await vi.waitFor(() =>
		expect(calls.filter((call) => !call.endsWith('/init'))).not.toEqual([])
	);
	expect(calls.slice(1).filter((call) => !call.startsWith('new '))).toEqual([]);
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
		{ kind: base.kind }
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

test('sibling providers given one hosted() mode each get their own /init', async () => {
	const seen: number[] = [];
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
	const shared = mode();
	const view = await render(
		<StrictMode>
			{['DE', 'FR'].map((country) => (
				<ConsentProvider
					key={country}
					options={{ mode: shared, overrides: { country }, persistence: false }}
				>
					<SeenAtRender seen={seen} />
					<Capture name={country} />
				</ConsentProvider>
			))}
		</StrictMode>
	);

	// The first was out before its children rendered. The second asks for
	// another country, so it sends its own rather than taking the first's.
	expect(seen[0]).toBe(1);
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
	await view.unmount();
});

test('a wrapper around hosted() keeps its own transport when another wrapper with equal options sent early', async () => {
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
	// Two wrappers, each around its own hosted() with the same options, that
	// copy the factory's properties as a wrapper would. Each tags the saves
	// its transport sends.
	const savedBy: string[] = [];
	const wrap = (tag: string) => {
		const base = mode();
		return Object.assign((context: ProviderTransportContext) => {
			const transport = base(context);
			const save = transport.save as NonNullable<KernelTransport['save']>;
			transport.save = (payload) => {
				savedBy.push(tag);
				return save(payload);
			};
			return transport;
		}, base);
	};
	const view = await render(
		<>
			<Suspense fallback={null}>
				<ConsentProvider options={{ mode: wrap('A'), persistence: false }}>
					<SuspendsOnce />
					<Capture name="A" />
				</ConsentProvider>
			</Suspense>
			<ConsentProvider options={{ mode: wrap('B'), persistence: false }}>
				<Capture name="B" />
			</ConsentProvider>
		</>
	);

	// A's render suspended; B committed first.
	await vi.waitFor(() => expect(kernels.get('B')).toBeDefined());
	await vi.waitFor(() => expect(requests.length).toBeGreaterThan(0));
	for (const request of requests) {
		request.respond('policy');
	}
	await vi.waitFor(() =>
		expect(kernels.get('B')?.getSnapshot().policyPending).toBe(false)
	);
	kernels.get('B')?.commands.save('none');
	await vi.waitFor(() => expect(savedBy).toHaveLength(1));
	expect(savedBy).toEqual(['B']);

	resume();
	await vi.waitFor(() => expect(kernels.get('A')).toBeDefined());
	await view.unmount();
});

test('a provider asking for another context leaves an early request to the provider that sent it', async () => {
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
	const view = await render(
		<>
			<Suspense fallback={null}>
				<ConsentProvider
					options={{
						mode: mode(),
						overrides: { country: 'DE' },
						persistence: false,
					}}
				>
					<SuspendsOnce />
					<Capture name="DE" />
				</ConsentProvider>
			</Suspense>
			<ConsentProvider
				options={{
					mode: mode(),
					overrides: { country: 'FR' },
					persistence: false,
				}}
			>
				<Capture name="FR" />
			</ConsentProvider>
		</>
	);

	// DE's render sent its request and suspended; FR committed first.
	await vi.waitFor(() => expect(kernels.get('FR')).toBeDefined());
	await vi.waitFor(() => expect(initCalls()).toHaveLength(2));
	expect(requests.map(({ headers }) => headers['x-c15t-country'])).toEqual([
		'DE',
		'FR',
	]);

	resume();
	await vi.waitFor(() => expect(kernels.get('DE')).toBeDefined());
	requests[0]?.respond('for-de');
	requests[1]?.respond('for-fr');
	await vi.waitFor(() => {
		expect(kernels.get('DE')?.getSnapshot().policyRule.id).toBe('for-de');
		expect(kernels.get('FR')?.getSnapshot().policyRule.id).toBe('for-fr');
	});
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

	expect(initCalls().map(([url]) => String(url).split('?')[0])).toEqual([
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

test('a retry that turns the journey on asks again, and its save matches that request', async () => {
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
	let kernel: ConsentKernel | null = null;
	const Capture = () => {
		const current = useContext(KernelContext);
		useEffect(() => {
			kernel = current;
		}, [current]);
		return null;
	};
	const shared = mode();
	const app = (journey: false | 'page') => (
		<Suspense fallback={null}>
			<ConsentProvider options={{ journey, mode: shared, persistence: false }}>
				<SuspendsOnce />
				<Capture />
				<PolicyProbe />
			</ConsentProvider>
		</Suspense>
	);

	const view = await render(app(false));
	expect(initCalls()).toHaveLength(1);
	expect(readJourneyParams(String(initCalls()[0]?.[0]))).toBeNull();

	await view.rerender(app('page'));
	resume();
	await vi.waitFor(() => expect(initCalls()).toHaveLength(2));
	const asked = readJourneyParams(String(initCalls()[1]?.[0]));
	expect(asked?.scope).toBe('page');
	requests[0]?.respond('without');
	requests[1]?.respond('with');
	await expect.element(view.getByTestId('policy')).toHaveTextContent('with');

	const saving = (kernel as ConsentKernel | null)?.commands.save('all');
	await vi.waitFor(() => expect(requests).toHaveLength(3));
	requests[2]?.respond('with');
	await saving;
	const save = backendFetch.mock.calls.find(([url]) =>
		String(url).split('?')[0]?.endsWith('/subjects')
	);
	expect(readJourneyParams(String(save?.[0]))?.id).toBe(asked?.id);
});

test('skipHydration: the early /init says no choice is stored, as the runtime will', async () => {
	// A visitor who chose on an earlier page.
	const earlier = createConsentKernel({
		...policyFixture({}, { id: 'earlier' }),
		consentCategories: ['measurement'],
	});
	const persistence = createPersistence({ kernel: earlier });
	await earlier.commands.save('all');
	await vi.waitFor(() => expect(document.cookie).toMatch(/(?:^|; )c15t=/u));

	const loads = async (options: { skipHydration?: boolean }) => {
		delete (window as Window & { __c15tJourney?: unknown }).__c15tJourney;
		const before = initCalls().length;
		const view = await render(
			<ConsentProvider options={{ mode: mode(), persistence: options }}>
				<PolicyProbe />
			</ConsentProvider>
		);
		const sent = readJourneyParams(String(initCalls()[before]?.[0]));
		await view.unmount();
		return sent?.storedChoice;
	};
	try {
		// The runtime would hydrate the stored choice…
		expect(await loads({})).toBe(true);
		// …but not with skipHydration, so the early request says none is stored.
		expect(await loads({ skipHydration: true })).toBe(false);
	} finally {
		persistence.clear();
		persistence.dispose();
		earlier.dispose();
	}
});

test('a dismissed notice: the early /init says an answer is stored', async () => {
	const earlier = createConsentKernel(
		policyFixture({}, { id: 'notice', model: 'opt-out', prompt: 'notice' })
	);
	const persistence = createPersistence({ kernel: earlier });
	await earlier.commands.dismissNotice();
	await vi.waitFor(() => expect(document.cookie).toContain('c15t-notice='));
	try {
		const view = await render(
			<ConsentProvider options={{ mode: mode() }}>
				<PolicyProbe />
			</ConsentProvider>
		);
		expect(readJourneyParams(String(initCalls()[0]?.[0]))?.storedChoice).toBe(
			true
		);
		await view.unmount();
	} finally {
		persistence.clear();
		persistence.dispose();
		earlier.dispose();
	}
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
