/**
 * v3 React adapter tests.
 *
 * Three categories:
 * 1. Selector hooks subscribe correctly and update on relevant mutations.
 * 2. ZERO unrelated re-renders invariant — key v3 gate.
 * 3. Stale-closure bug (c15t/c15t#604) is structurally resolved.
 */
import type { ReactNode } from 'react';
import { Profiler, StrictMode, useRef } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
	ConsentProvider,
	useConsent,
	useConsents,
	useHasConsented,
	useNetworkBlocker,
	useOverrides,
	useSaveConsents,
	useSetConsent,
	useSetOverrides,
} from '../index';

function withProvider(options = {}) {
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<ConsentProvider options={{ persistence: false, ...options }}>
			{children}
		</ConsentProvider>
	);
	return { Wrapper };
}

describe('v3 react: selector hook basics', () => {
	test('useConsent returns current state and updates on mutation', async () => {
		const { Wrapper } = withProvider();

		function MarketingStatus() {
			const allowed = useConsent('marketing');
			return <div data-testid="status">{allowed ? 'on' : 'off'}</div>;
		}

		function ToggleMarketing() {
			const setConsent = useSetConsent();
			return (
				<button
					type="button"
					data-testid="toggle"
					onClick={() => setConsent({ marketing: true })}
				>
					toggle
				</button>
			);
		}

		const { getByTestId } = await render(
			<Wrapper>
				<MarketingStatus />
				<ToggleMarketing />
			</Wrapper>
		);

		await expect.element(getByTestId('status')).toHaveTextContent('off');

		await getByTestId('toggle').click();

		await expect.element(getByTestId('status')).toHaveTextContent('on');
	});

	test('useConsents returns the full map', async () => {
		const { Wrapper } = withProvider();

		function Dump() {
			const consents = useConsents();
			return <pre data-testid="dump">{JSON.stringify(consents)}</pre>;
		}

		function Toggle() {
			const setConsent = useSetConsent();
			return (
				<button
					type="button"
					data-testid="toggle"
					onClick={() => setConsent({ marketing: true, measurement: true })}
				>
					toggle
				</button>
			);
		}

		const { getByTestId } = await render(
			<Wrapper>
				<Dump />
				<Toggle />
			</Wrapper>
		);

		await expect
			.element(getByTestId('dump'))
			.toHaveTextContent('"marketing":false');

		await getByTestId('toggle').click();

		await expect
			.element(getByTestId('dump'))
			.toHaveTextContent('"marketing":true');
	});

	test('useHasConsented flips after save', async () => {
		const { Wrapper } = withProvider();

		function Status() {
			const v = useHasConsented();
			return <div data-testid="has">{String(v)}</div>;
		}

		function SaveAll() {
			const save = useSaveConsents();
			return (
				<button
					type="button"
					data-testid="save"
					onClick={() => void save('all')}
				>
					save
				</button>
			);
		}

		const { getByTestId } = await render(
			<Wrapper>
				<Status />
				<SaveAll />
			</Wrapper>
		);

		await expect.element(getByTestId('has')).toHaveTextContent('false');
		await getByTestId('save').click();
		await expect.element(getByTestId('has')).toHaveTextContent('true');
	});

	test('useOverrides updates on set.overrides', async () => {
		const { Wrapper } = withProvider();

		function CountryLabel() {
			const o = useOverrides();
			return <div data-testid="country">{o.country ?? 'none'}</div>;
		}

		function SetCountry() {
			const setOverrides = useSetOverrides();
			return (
				<button
					type="button"
					data-testid="set-country"
					onClick={() => setOverrides({ country: 'DE' })}
				>
					set country
				</button>
			);
		}

		const { getByTestId } = await render(
			<Wrapper>
				<CountryLabel />
				<SetCountry />
			</Wrapper>
		);

		await expect.element(getByTestId('country')).toHaveTextContent('none');
		await getByTestId('set-country').click();
		await expect.element(getByTestId('country')).toHaveTextContent('DE');
	});
});

describe('v3 react: zero unrelated re-renders', () => {
	// The load-bearing invariant. Each hook subscribes via
	// useSyncExternalStore with a slice selector, so a child reading
	// `useConsent('marketing')` must not re-render when
	// `useConsent('measurement')` flips elsewhere.
	test('flipping marketing does not re-render a measurement-only component', async () => {
		const { Wrapper } = withProvider();
		const marketingRenders: number[] = [];
		const measurementRenders: number[] = [];

		function MarketingView() {
			const allowed = useConsent('marketing');
			return (
				<Profiler id="marketing" onRender={() => marketingRenders.push(1)}>
					<div data-testid="marketing">{String(allowed)}</div>
				</Profiler>
			);
		}

		function MeasurementView() {
			const allowed = useConsent('measurement');
			return (
				<Profiler id="measurement" onRender={() => measurementRenders.push(1)}>
					<div data-testid="measurement">{String(allowed)}</div>
				</Profiler>
			);
		}

		function ToggleMarketing() {
			const setConsent = useSetConsent();
			return (
				<button
					type="button"
					data-testid="toggle"
					onClick={() => setConsent({ marketing: true })}
				>
					toggle
				</button>
			);
		}

		await render(
			<Wrapper>
				<MarketingView />
				<MeasurementView />
				<ToggleMarketing />
			</Wrapper>
		);

		// Wait for initial mount to settle.
		await new Promise((r) => setTimeout(r, 10));
		const marketingAfterMount = marketingRenders.length;
		const measurementAfterMount = measurementRenders.length;

		await document
			.querySelector<HTMLButtonElement>('[data-testid="toggle"]')
			?.click();
		await new Promise((r) => setTimeout(r, 10));

		// Marketing hook's returned value changed → exactly one more commit.
		expect(marketingRenders.length).toBeGreaterThan(marketingAfterMount);
		// Measurement hook's returned value is unchanged → zero additional
		// commits.
		expect(measurementRenders.length).toBe(measurementAfterMount);
	});

	test('no-op mutation triggers zero re-renders anywhere', async () => {
		const { Wrapper } = withProvider();
		const renders: number[] = [];

		function View() {
			const consents = useConsents();
			const setConsent = useSetConsent();
			return (
				<>
					<button
						type="button"
						data-testid="noop"
						onClick={() => setConsent({ necessary: true })}
					>
						noop
					</button>
					<Profiler id="dump" onRender={() => renders.push(1)}>
						<pre>{JSON.stringify(consents)}</pre>
					</Profiler>
				</>
			);
		}

		await render(
			<Wrapper>
				<View />
			</Wrapper>
		);

		await new Promise((r) => setTimeout(r, 10));
		const afterMount = renders.length;

		// necessary is already true; this should be a no-op at the kernel
		// level and should not trigger subscribers.
		await document
			.querySelector<HTMLButtonElement>('[data-testid="noop"]')
			?.click();
		await new Promise((r) => setTimeout(r, 10));

		expect(renders.length).toBe(afterMount);
	});
});

describe('v3 react: stale-closure resolved (issue #604)', () => {
	// In v2, useConsentManager().has('marketing') could return stale
	// values under React Compiler because `has` was a stable reference.
	// In v3 the hook returns a primitive boolean — no method reference
	// to cache. Even if this test ran under React Compiler the result
	// would be correct by construction.
	test('useConsent result is always fresh after mutations', async () => {
		const { Wrapper } = withProvider();

		function MarketingReader() {
			const renderCountRef = useRef(0);
			renderCountRef.current += 1;
			const allowed = useConsent('marketing');
			const setConsent = useSetConsent();
			return (
				<>
					<button
						type="button"
						data-testid="on"
						onClick={() => setConsent({ marketing: true })}
					>
						on
					</button>
					<button
						type="button"
						data-testid="off"
						onClick={() => setConsent({ marketing: false })}
					>
						off
					</button>
					<div data-testid="value">
						{allowed ? 'on' : 'off'}|{renderCountRef.current}
					</div>
				</>
			);
		}

		const { getByTestId } = await render(
			<StrictMode>
				<Wrapper>
					<MarketingReader />
				</Wrapper>
			</StrictMode>
		);

		await expect.element(getByTestId('value')).toHaveTextContent(/^off\|/);

		await getByTestId('on').click();
		await expect.element(getByTestId('value')).toHaveTextContent(/^on\|/);

		await getByTestId('off').click();
		await expect.element(getByTestId('value')).toHaveTextContent(/^off\|/);
	});
});

describe('v3 react: network blocker lifecycle', () => {
	function installFetchStub() {
		const originalFetch = window.fetch;
		const fetchStub = vi.fn(async () => new Response('ok', { status: 200 }));
		window.fetch = fetchStub as unknown as typeof window.fetch;
		return {
			fetchStub,
			originalFetch,
			restore() {
				window.fetch = originalFetch;
			},
		};
	}

	test('abandoned render does not patch fetch', async () => {
		const fetch = installFetchStub();

		function ThrowsAfterHook() {
			useNetworkBlocker({
				rules: [{ domain: 'example.com', category: 'marketing' }],
				logBlockedRequests: false,
			});
			throw new Error('render failed before commit');
		}

		try {
			await expect(
				render(
					<ConsentProvider options={{ persistence: false }}>
						<ThrowsAfterHook />
					</ConsentProvider>
				)
			).rejects.toThrow('render failed before commit');

			expect(window.fetch).toBe(fetch.fetchStub);
		} finally {
			fetch.restore();
		}
	});

	test('StrictMode provider restores fetch after unmount', async () => {
		const fetch = installFetchStub();

		try {
			const view = await render(
				<StrictMode>
					<ConsentProvider
						options={{
							persistence: false,
							networkBlocker: {
								rules: [{ domain: 'example.com', category: 'marketing' }],
								logBlockedRequests: false,
							},
						}}
					>
						<div>mounted</div>
					</ConsentProvider>
				</StrictMode>
			);

			expect(window.fetch).not.toBe(fetch.fetchStub);
			view.unmount();
			expect((await window.fetch('https://example.com/x')).status).toBe(200);
			expect(fetch.fetchStub).toHaveBeenCalledOnce();
		} finally {
			fetch.restore();
		}
	});

	test('rules update after mount affects intercepted requests', async () => {
		const fetch = installFetchStub();

		try {
			const { rerender } = await render(
				<ConsentProvider
					options={{
						persistence: false,
						networkBlocker: {
							rules: [{ domain: 'first.example.com', category: 'marketing' }],
							logBlockedRequests: false,
						},
					}}
				>
					<div>mounted</div>
				</ConsentProvider>
			);

			expect((await window.fetch('https://first.example.com/x')).status).toBe(
				451
			);
			expect((await window.fetch('https://second.example.com/x')).status).toBe(
				200
			);

			await rerender(
				<ConsentProvider
					options={{
						persistence: false,
						networkBlocker: {
							rules: [{ domain: 'second.example.com', category: 'marketing' }],
							logBlockedRequests: false,
						},
					}}
				>
					<div>mounted</div>
				</ConsentProvider>
			);

			expect((await window.fetch('https://first.example.com/x')).status).toBe(
				200
			);
			expect((await window.fetch('https://second.example.com/x')).status).toBe(
				451
			);
		} finally {
			fetch.restore();
		}
	});

	test('enabled false disables blocking after commit', async () => {
		const fetch = installFetchStub();

		try {
			await render(
				<ConsentProvider
					options={{
						persistence: false,
						networkBlocker: {
							rules: [{ domain: 'example.com', category: 'marketing' }],
							enabled: false,
							logBlockedRequests: false,
						},
					}}
				>
					<div>mounted</div>
				</ConsentProvider>
			);

			expect((await window.fetch('https://example.com/x')).status).toBe(200);
			expect(fetch.fetchStub).toHaveBeenCalledOnce();
		} finally {
			fetch.restore();
		}
	});
});

describe('v3 react: action hooks', () => {
	test('useSetConsent returns a stable reference and mutates kernel', async () => {
		const { Wrapper } = withProvider();
		let firstRef: unknown;
		let secondRef: unknown;
		let renders = 0;

		function Actor() {
			const setConsent = useSetConsent();
			const measurement = useConsent('measurement');
			renders += 1;
			if (renders === 1) firstRef = setConsent;
			if (renders === 2) secondRef = setConsent;
			return (
				<div>
					<button
						type="button"
						data-testid="toggle"
						onClick={() => setConsent({ measurement: true })}
					>
						toggle
					</button>
					<span data-testid="measurement">{String(measurement)}</span>
				</div>
			);
		}

		const { getByTestId } = await render(
			<Wrapper>
				<Actor />
			</Wrapper>
		);

		await getByTestId('toggle').click();
		await expect.element(getByTestId('measurement')).toHaveTextContent('true');

		// Reference stability across re-renders caused by unrelated state.
		expect(firstRef).toBe(secondRef);
		expect(typeof firstRef).toBe('function');
	});

	test('useSaveConsents commits via kernel', async () => {
		const { Wrapper } = withProvider();

		function Saver() {
			const save = useSaveConsents();
			const hasConsented = useHasConsented();
			const marketing = useConsent('marketing');
			return (
				<div>
					<button
						type="button"
						data-testid="save"
						onClick={() => {
							void save('all');
						}}
					>
						save
					</button>
					<span data-testid="has">{String(hasConsented)}</span>
					<span data-testid="marketing">{String(marketing)}</span>
				</div>
			);
		}

		const { getByTestId } = await render(
			<Wrapper>
				<Saver />
			</Wrapper>
		);

		await expect.element(getByTestId('has')).toHaveTextContent('false');
		await getByTestId('save').click();
		await expect.element(getByTestId('has')).toHaveTextContent('true');
		await expect.element(getByTestId('marketing')).toHaveTextContent('true');
	});
});
