import { custom } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { hydrate, tick, unmount } from 'svelte';
import {
	afterAll,
	afterEach,
	beforeAll,
	expect,
	onTestFinished,
	test,
	vi,
} from 'vitest';

import ConformanceFixture from './fixtures/conformance-fixture.svelte';
import { policyFixture } from './policy-fixture';
import { closeSsrWorker, renderSsr, warmSsrWorker } from './server-render';

beforeAll(() => warmSsrWorker(), 60_000);
afterAll(() => closeSsrWorker());
afterEach(() => {
	vi.restoreAllMocks();
});

test.each([false, true])(
	'keeps the SSR completion marker through portal hydration and saves once with noStyle %s',
	async (noStyle) => {
		const options = {
			consentCategories: ['marketing'],
			disableAnimation: true,
			persistence: false,
			prefetch: policyFixture(
				{},
				{ categories: ['marketing'], id: 'streamed-banner' }
			),
		};
		const props = {
			bannerProps: { noStyle },
			component: 'consent-banner' as const,
			options,
		};
		const rendered = await renderSsr(props, 'conformance-fixture.svelte');
		const target = document.createElement('div');
		target.innerHTML = rendered.html;
		document.body.append(target);
		onTestFinished(() => target.remove());
		const completion = (scope: ParentNode) => {
			const root = scope.querySelector<HTMLElement>(
				'[data-testid="consent-banner-root"]'
			);
			const marker = root?.querySelector<HTMLElement>('[data-c15t-stream-end]');
			expect(root?.getAttribute('data-c15t-streamed')).toBe('');
			expect(root?.querySelectorAll('[data-c15t-stream-end]')).toHaveLength(1);
			expect(marker?.tagName).toBe('SPAN');
			expect(marker?.hidden).toBe(true);
			expect(marker?.parentElement).toBe(root);
			expect(root?.lastElementChild).toBe(marker);
			expect(Boolean(root?.className)).toBe(!noStyle);
			return {
				card: root?.querySelector('[data-testid="consent-banner-card"]'),
				marker,
				root,
			};
		};
		const server = completion(target);
		expect(server.card).not.toBeNull();
		const portal = server.root?.parentElement;
		expect(portal?.parentElement).toBe(target);
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
		const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const save = vi.fn(() => Promise.resolve({ ok: true as const }));
		let kernel: ConsentKernel | undefined;
		const app = hydrate(ConformanceFixture, {
			props: {
				...props,
				onKernel: (value) => {
					kernel = value;
				},
				options: { ...options, mode: custom({ save }) },
			},
			target,
		});
		onTestFinished(() => unmount(app));
		await tick();
		await vi.waitFor(() => expect(kernel).toBeDefined());
		expect(portal?.parentElement).toBe(document.body);
		expect(target.contains(server.root ?? null)).toBe(false);
		const client = completion(document);
		expect(client.root).toBe(server.root);
		expect(client.card).toBe(server.card);
		expect(client.marker).toBe(server.marker);
		expect(errors).not.toHaveBeenCalled();
		expect(warnings).not.toHaveBeenCalled();

		const accept = client.root?.querySelector<HTMLButtonElement>(
			'[data-testid="consent-banner-accept-button"]'
		);
		expect(accept).not.toBeNull();
		accept?.click();
		await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
		await vi.waitFor(() =>
			expect(
				kernel?.getSnapshot().explicitChoice?.categories.marketing?.value
			).toBe(true)
		);
		expect(JSON.stringify(save.mock.calls[0])).toContain('streamed-banner');
		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).toBeNull()
		);
	}
);
