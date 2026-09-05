/**
 * `prefetch` as a pending `Promise<KernelConfig>`: the provider mounts with
 * a provisional policy, children render immediately, and the first init is
 * answered from the resolved config instead of the network.
 */
import type { InitContext, InitOutput, KernelConfig } from '@c15t/core';
import { mapInitOutputToInitResponse } from '@c15t/core';
import { useContext, useEffect } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { ConsentProvider, custom, hosted, useSnapshot } from '../index';
import { createDeferredPromise } from './deferred-promise';

const BANNER_POLICY = {
	id: 'gdpr',
	model: 'opt-in',
	ui: { mode: 'banner' },
} as const;

const hostedInitOutput = function hostedInitOutput(): InitOutput {
	return {
		branding: 'c15t',
		gvl: null,
		jurisdiction: 'GDPR',
		location: { countryCode: 'DE', regionCode: null },
		policy: BANNER_POLICY,
		translations: { language: 'en', translations: {} },
	} as InitOutput;
};

const policyConfig = function policyConfig(): KernelConfig {
	return {
		initialBranding: 'c15t',
		initialLocation: { countryCode: 'DE', regionCode: null },
		initialOverrides: { country: 'DE', language: 'en' },
		initialPolicy: BANNER_POLICY as never,
		initialTranslations: { language: 'en', translations: {} },
	};
};

interface Deferred<Value> {
	promise: Promise<Value>;
	resolve: (value: Value) => void;
	reject: (reason?: unknown) => void;
}

const deferred = function deferred<Value>(): Deferred<Value> {
	let resolve!: Deferred<Value>['resolve'];
	let reject!: Deferred<Value>['reject'];
	const promise = createDeferredPromise<Value>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, reject, resolve };
};

const Probe = () => {
	const snapshot = useSnapshot();
	return (
		<div data-testid="state">
			{snapshot.activeUI}|{String(snapshot.policyProvisional)}|
			{snapshot.policy?.id ?? 'none'}|{String(snapshot.hasConsented)}|
			{snapshot.subjectId ?? 'none'}|{snapshot.overrides.country ?? 'none'}|
			{String(snapshot.consents.marketing)}
		</div>
	);
};

interface InitCounts {
	completed: number;
}

const InitCounter = ({ counts }: { counts: InitCounts }) => {
	const kernel = useContext(KernelContext);
	useEffect(() => {
		if (!kernel) {
			return;
		}
		// The eager init starts before any effect can subscribe, so count
		// completions: those land only after the prefetch promise settles.
		return kernel.events.on('command:init:completed', () => {
			counts.completed += 1;
		});
	}, [counts, kernel]);
	return null;
};

beforeEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe('ConsentProvider prefetch promise', () => {
	test('renders children while pending, then applies the policy without a network init', async () => {
		const fetchSpy = vi.fn();
		const prefetch = deferred<KernelConfig>();
		const counts: InitCounts = { completed: 0 };

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: hosted({ fetch: fetchSpy, url: '/api/c15t' }),
					persistence: false,
					prefetch: prefetch.promise,
				}}
			>
				<InitCounter counts={counts} />
				<div data-testid="child">ready</div>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('child')).toHaveTextContent('ready');
		await expect
			.element(getByTestId('state'))
			.toHaveTextContent('none|true|none|false|none|none|false');
		expect(counts.completed).toBe(0);

		prefetch.resolve(policyConfig());

		await expect
			.element(getByTestId('state'))
			.toHaveTextContent('banner|false|gdpr|false|none|DE|false');
		await vi.waitFor(() => expect(counts.completed).toBe(1));
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(counts.completed).toBe(1);
	});

	test('honours persisted consent from a resolved policy config', async () => {
		const init = vi.fn();
		const prefetch = deferred<KernelConfig>();

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: custom({ init, save: vi.fn() }),
					persistence: false,
					prefetch: prefetch.promise,
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		prefetch.resolve({
			...policyConfig(),
			initialConsents: { marketing: true },
			initialHasConsented: true,
			initialSubjectId: 'sub_server',
		});

		await expect
			.element(getByTestId('state'))
			.toHaveTextContent('none|false|gdpr|true|sub_server|DE|true');
		expect(init).not.toHaveBeenCalled();
	});

	test('cookies-only config applies consents and still runs the transport init', async () => {
		const init = vi.fn((_ctx: InitContext) =>
			Promise.resolve(mapInitOutputToInitResponse(hostedInitOutput(), {}))
		);
		const prefetch = deferred<KernelConfig>();
		const counts: InitCounts = { completed: 0 };

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: custom({ init, save: vi.fn() }),
					persistence: false,
					prefetch: prefetch.promise,
				}}
			>
				<InitCounter counts={counts} />
				<Probe />
			</ConsentProvider>
		);

		await expect
			.element(getByTestId('state'))
			.toHaveTextContent('none|true|none|false|none|none|false');
		expect(init).not.toHaveBeenCalled();

		prefetch.resolve({
			initialConsents: { marketing: true },
			initialHasConsented: true,
			initialOverrides: { country: 'FR' },
			initialSubjectId: 'sub_cookie',
		});

		// Policy comes from the transport; consent state from the cookie
		// config, so a returning visitor sees no banner.
		await expect
			.element(getByTestId('state'))
			.toHaveTextContent('none|false|gdpr|true|sub_cookie|DE|true');
		await vi.waitFor(() => expect(counts.completed).toBe(1));
		expect(init).toHaveBeenCalledTimes(1);
		expect(init.mock.calls[0]?.[0].overrides).toMatchObject({
			country: 'FR',
		});
	});

	test('rejected promise falls through to the transport init', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const init = vi.fn(() =>
			Promise.resolve(mapInitOutputToInitResponse(hostedInitOutput(), {}))
		);
		const prefetch = deferred<KernelConfig>();

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: custom({ init, save: vi.fn() }),
					persistence: false,
					prefetch: prefetch.promise,
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		prefetch.reject(new Error('stream failed'));

		await expect
			.element(getByTestId('state'))
			.toHaveTextContent('banner|false|gdpr|false|none|DE|false');
		expect(init).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('`prefetch` promise rejected'),
			expect.any(Error)
		);
	});

	test('provider overrides win over the resolved config', async () => {
		const prefetch = deferred<KernelConfig>();

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: custom({ init: vi.fn(), save: vi.fn() }),
					overrides: { country: 'US' },
					persistence: false,
					prefetch: prefetch.promise,
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		prefetch.resolve(policyConfig());

		await expect
			.element(getByTestId('state'))
			.toHaveTextContent('banner|false|gdpr|false|none|US|false');
	});

	test('synchronous prefetch still renders the banner at once', async () => {
		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: custom({
						init: vi.fn(() => Promise.resolve({})),
						save: vi.fn(),
					}),
					persistence: false,
					prefetch: policyConfig(),
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect
			.element(getByTestId('state'))
			.toHaveTextContent('banner|false|gdpr|false|none|DE|false');
	});
});
