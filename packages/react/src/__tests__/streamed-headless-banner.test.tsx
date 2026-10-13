/**
 * A banner built with the headless hooks streams like the stock one when it
 * sits inside `StreamedConsentSurface`: it follows the shell in a later
 * chunk of the same response, before hydration, and only when the resolved
 * policy shows one.
 */
import type { KernelConfig } from '@c15t/core';
import type { PolicyRule } from '@c15t/schema/types';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { StreamedConsentSurface, useHeadlessConsentUI } from '../headless';
import { ConsentProvider, custom } from '../index';
import { policyFixture } from './policy-fixture';
import {
	deferred,
	fulfilledThenable,
	streamPage,
} from './streamed-ssr-harness';
import type { StreamedPage } from './streamed-ssr-harness';

const policyConfig = function policyConfig(
	rule: Partial<PolicyRule> = {}
): KernelConfig {
	return {
		initialBranding: 'c15t',
		initialLocation: { countryCode: 'DE', regionCode: null },
		initialOverrides: { country: 'DE', language: 'en' },
		...policyFixture(
			{},
			{
				categories: ['marketing'],
				id: 'gdpr',
				...rule,
			}
		),
	};
};

const transportInit = vi.fn(() => Promise.resolve({}));
const transportSave = vi.fn(() => Promise.resolve({ ok: true as const }));

/** A headless banner with the markup the harness looks for. */
const HeadlessBanner = () => {
	const { banner } = useHeadlessConsentUI();
	if (!banner.isVisible) {
		return null;
	}
	return <section data-testid="consent-banner-root">We use cookies</section>;
};

const Page = ({
	prefetch,
	wrapped = true,
}: {
	prefetch: KernelConfig | PromiseLike<KernelConfig>;
	wrapped?: boolean;
}) => (
	<html lang="en">
		<head />
		<body>
			<ConsentProvider
				options={{
					mode: custom({ init: transportInit, save: transportSave }),
					persistence: false,
					prefetch: prefetch as KernelConfig | Promise<KernelConfig>,
				}}
			>
				<main>content</main>
				{wrapped ? (
					<StreamedConsentSurface>
						<HeadlessBanner />
					</StreamedConsentSurface>
				) : (
					<HeadlessBanner />
				)}
			</ConsentProvider>
		</body>
	</html>
);

const tick = (ms = 50) =>
	act(
		() =>
			new Promise<void>((resolve) => {
				setTimeout(resolve, ms);
			})
	);

/** The banner's states in a timeline, marks and repeats left out. */
const states = (timeline: string[]) =>
	timeline
		.filter((entry) => !entry.startsWith('@'))
		.filter((entry, index, all) => entry !== all[index - 1]);

let page: StreamedPage | undefined;

beforeEach(() => {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
	localStorage.clear();
	transportInit.mockClear();
	transportSave.mockClear();
});

afterEach(() => {
	page?.dispose();
	page = undefined;
});

/**
 * Streams the shell, resolves the server's prefetch, writes the rest, and
 * hydrates with the client's copy already settled.
 */
const streamThenHydrate = async function streamThenHydrate(
	config: KernelConfig,
	wrapped = true
) {
	const server = deferred<KernelConfig>();
	page = await streamPage(
		<Page
			prefetch={server.promise}
			wrapped={wrapped}
		/>
	);
	const shell = page.hasBanner();
	server.resolve(config);
	await page.finish();
	const streamed = page.hasBanner();
	page.mark('streamed');
	const hydrated = await page.hydrate(
		<Page
			prefetch={fulfilledThenable(config)}
			wrapped={wrapped}
		/>
	);
	await tick(100);
	return { hydrated, page, shell, streamed };
};

test('a headless banner in the surface streams before hydration and hydrates in place', async () => {
	const { hydrated, shell, streamed } = await streamThenHydrate(policyConfig());

	expect(shell).toBe(false);
	expect(streamed).toBe(true);
	expect(hydrated.recoverableErrors).toEqual([]);
	expect(page?.serverErrors).toEqual([]);
	// One banner state from the chunk on: no blink through hydration.
	expect(states(page?.timeline ?? [])).toHaveLength(2);
	await hydrated.unmount();
});

test('a headless banner outside the surface waits for the browser', async () => {
	const { hydrated, streamed } = await streamThenHydrate(policyConfig(), false);

	expect(streamed).toBe(false);
	expect(hydrated.recoverableErrors).toEqual([]);
	expect(page?.hasBanner()).toBe(true);
	await hydrated.unmount();
});

test('a policy without a prompt streams no headless banner', async () => {
	const { hydrated, streamed } = await streamThenHydrate(
		policyConfig({ id: 'us', model: 'opt-out', prompt: 'none' })
	);

	expect(streamed).toBe(false);
	expect(states(page?.timeline ?? [])).toEqual(['none']);
	expect(hydrated.recoverableErrors).toEqual([]);
	await hydrated.unmount();
});

test('without a pending prefetch the surface adds no boundary', () => {
	const html = renderToString(<Page prefetch={policyConfig()} />);

	// React marks a Suspense boundary with `<!--$-->` comments.
	expect(html).not.toContain('<!--$');
	expect(html).toContain('<main>content</main>');
});
