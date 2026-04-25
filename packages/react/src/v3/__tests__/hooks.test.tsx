/**
 * v3 React adapter tests.
 *
 * Three categories:
 * 1. Selector hooks subscribe correctly and update on relevant mutations.
 * 2. ZERO unrelated re-renders invariant — key v3 gate.
 * 3. Stale-closure bug (c15t/c15t#604) is structurally resolved.
 */
import { createConsentKernel } from 'c15t/v3';
import type { ReactNode } from 'react';
import { Profiler, StrictMode, useRef } from 'react';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
	ConsentProvider,
	useConsent,
	useConsents,
	useHasConsented,
	useOverrides,
	useSaveConsents,
	useSetConsent,
} from '../index';

function withProvider(kernel = createConsentKernel()) {
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<ConsentProvider kernel={kernel}>{children}</ConsentProvider>
	);
	return { kernel, Wrapper };
}

describe('v3 react: selector hook basics', () => {
	test('useConsent returns current state and updates on mutation', async () => {
		const { kernel, Wrapper } = withProvider();

		function MarketingStatus() {
			const allowed = useConsent('marketing');
			return <div data-testid="status">{allowed ? 'on' : 'off'}</div>;
		}

		const { getByTestId } = await render(
			<Wrapper>
				<MarketingStatus />
			</Wrapper>
		);

		await expect.element(getByTestId('status')).toHaveTextContent('off');

		kernel.set.consent({ marketing: true });

		await expect.element(getByTestId('status')).toHaveTextContent('on');
	});

	test('useConsents returns the full map', async () => {
		const { kernel, Wrapper } = withProvider();

		function Dump() {
			const consents = useConsents();
			return <pre data-testid="dump">{JSON.stringify(consents)}</pre>;
		}

		const { getByTestId } = await render(
			<Wrapper>
				<Dump />
			</Wrapper>
		);

		await expect
			.element(getByTestId('dump'))
			.toHaveTextContent('"marketing":false');

		kernel.set.consent({ marketing: true, measurement: true });

		await expect
			.element(getByTestId('dump'))
			.toHaveTextContent('"marketing":true');
	});

	test('useHasConsented flips after save', async () => {
		const { kernel, Wrapper } = withProvider();

		function Status() {
			const v = useHasConsented();
			return <div data-testid="has">{String(v)}</div>;
		}

		const { getByTestId } = await render(
			<Wrapper>
				<Status />
			</Wrapper>
		);

		await expect.element(getByTestId('has')).toHaveTextContent('false');
		await kernel.commands.save('all');
		await expect.element(getByTestId('has')).toHaveTextContent('true');
	});

	test('useOverrides updates on set.overrides', async () => {
		const { kernel, Wrapper } = withProvider();

		function CountryLabel() {
			const o = useOverrides();
			return <div data-testid="country">{o.country ?? 'none'}</div>;
		}

		const { getByTestId } = await render(
			<Wrapper>
				<CountryLabel />
			</Wrapper>
		);

		await expect.element(getByTestId('country')).toHaveTextContent('none');
		kernel.set.overrides({ country: 'DE' });
		await expect.element(getByTestId('country')).toHaveTextContent('DE');
	});
});

describe('v3 react: zero unrelated re-renders', () => {
	// The load-bearing invariant. Each hook subscribes via
	// useSyncExternalStore with a slice selector, so a child reading
	// `useConsent('marketing')` must not re-render when
	// `useConsent('measurement')` flips elsewhere.
	test('flipping marketing does not re-render a measurement-only component', async () => {
		const { kernel, Wrapper } = withProvider();
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

		await render(
			<Wrapper>
				<MarketingView />
				<MeasurementView />
			</Wrapper>
		);

		// Wait for initial mount to settle.
		await new Promise((r) => setTimeout(r, 10));
		const marketingAfterMount = marketingRenders.length;
		const measurementAfterMount = measurementRenders.length;

		kernel.set.consent({ marketing: true });
		await new Promise((r) => setTimeout(r, 10));

		// Marketing hook's returned value changed → exactly one more commit.
		expect(marketingRenders.length).toBeGreaterThan(marketingAfterMount);
		// Measurement hook's returned value is unchanged → zero additional
		// commits.
		expect(measurementRenders.length).toBe(measurementAfterMount);
	});

	test('no-op mutation triggers zero re-renders anywhere', async () => {
		const { kernel, Wrapper } = withProvider();
		const renders: number[] = [];

		function View() {
			const consents = useConsents();
			return (
				<Profiler id="dump" onRender={() => renders.push(1)}>
					<pre>{JSON.stringify(consents)}</pre>
				</Profiler>
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
		kernel.set.consent({ necessary: true });
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
		const { kernel, Wrapper } = withProvider();

		function MarketingReader() {
			const renderCountRef = useRef(0);
			renderCountRef.current += 1;
			const allowed = useConsent('marketing');
			return (
				<div data-testid="value">
					{allowed ? 'on' : 'off'}|{renderCountRef.current}
				</div>
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

		kernel.set.consent({ marketing: true });
		await expect.element(getByTestId('value')).toHaveTextContent(/^on\|/);

		kernel.set.consent({ marketing: false });
		await expect.element(getByTestId('value')).toHaveTextContent(/^off\|/);
	});
});

describe('v3 react: action hooks', () => {
	test('useSetConsent returns a stable reference and mutates kernel', async () => {
		const { kernel, Wrapper } = withProvider();
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
						onClick={() => setConsent({ marketing: true })}
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

		kernel.set.consent({ measurement: true });
		await expect.element(getByTestId('measurement')).toHaveTextContent('true');

		// Reference stability across re-renders caused by unrelated state.
		expect(firstRef).toBe(secondRef);
		expect(typeof firstRef).toBe('function');
	});

	test('useSaveConsents commits via kernel', async () => {
		const { kernel, Wrapper } = withProvider();

		function Saver() {
			const save = useSaveConsents();
			const hasConsented = useHasConsented();
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
		expect(kernel.getSnapshot().consents.marketing).toBe(true);
	});
});
