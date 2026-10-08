/**
 * `prefetch` as a pending `Promise<KernelConfig>`: the provider mounts with
 * a provisional policy, children render immediately, and the first init is
 * answered from the resolved config instead of the network.
 *
 * How the resolved config is applied (a baseline without a policy, a
 * rejected promise, provider overrides, records cleared while it streams)
 * is the runtime's `streamPrefetch` module, tested in core.
 */
import type { ConsentKernel, KernelConfig } from '@c15t/core';
import { useContext, useEffect } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { ConsentProvider, custom, hosted, useSnapshot } from '../index';
import { policyFixture } from './policy-fixture';

const policyConfig = function policyConfig(): KernelConfig {
	return {
		initialBranding: 'c15t',
		initialLocation: { countryCode: 'DE', regionCode: null },
		initialOverrides: { country: 'DE', language: 'en' },
		...policyFixture({}, { categories: ['marketing'], id: 'gdpr' }),
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
	const promise = new Promise<Value>((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});
	return { promise, reject, resolve };
};

const Probe = () => {
	const snapshot = useSnapshot();
	return (
		<div data-testid="state">
			{snapshot.activeUI}|{String(snapshot.policyPending)}|
			{snapshot.policyPending ? 'none' : snapshot.policyRule.id}|
			{String(!!snapshot.explicitChoice)}|
			{snapshot.subject?.subjectId ?? 'none'}|
			{snapshot.overrides.country ?? 'none'}|
			{String(snapshot.effectivePermissions.marketing)}
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

describe('a streamed policy', () => {
	test('saves a streamed policy through an assertion transport without another init', async () => {
		const prefetch = deferred<KernelConfig>();
		const fetch = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ ok: true, subjectId: 'subject' }))
			);
		let kernel: ConsentKernel | null = null;
		const Capture = () => {
			const current = useContext(KernelContext);
			useEffect(() => {
				kernel = current;
			}, [current]);
			return <Probe />;
		};
		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: hosted({
						assertDecisionInputs: true,
						fetch,
						initURL: '/api/consent/init',
						url: '/api/c15t',
					}),
					persistence: false,
					prefetch: prefetch.promise,
				}}
			>
				<Capture />
			</ConsentProvider>
		);
		const config = policyConfig();
		prefetch.resolve(config);
		await expect
			.element(getByTestId('state'))
			.toHaveTextContent('banner|false|gdpr');
		if (!kernel) {
			throw new Error('Expected mounted kernel');
		}
		const result = await (kernel as ConsentKernel).commands.save('none');
		expect(result.ok).toBe(true);
		expect(fetch).toHaveBeenCalledTimes(1);
		// The path; the query carries the consent journey.
		expect(String(fetch.mock.calls[0]?.[0]).split('?')[0]).toBe(
			'/api/c15t/subjects'
		);
		expect(JSON.parse(fetch.mock.calls[0]?.[1].body)).toMatchObject({
			country: 'DE',
			fingerprint:
				config.initialPolicyResolution?.status === 'matched'
					? config.initialPolicyResolution.fingerprints.policy
					: undefined,
			language: 'en',
			policyId: 'gdpr',
		});
	});
});
