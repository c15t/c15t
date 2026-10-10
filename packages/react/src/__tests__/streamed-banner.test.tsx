/**
 * A `prefetch` promise the server streams: the banner follows the shell in
 * a later chunk of the same response, before hydration, and only when the
 * resolved policy shows one. Each test streams a real server render into
 * an iframe, then hydrates it, and records the banner after every task
 * that changed the page.
 */
import type { KernelConfig } from '@c15t/core';
import type { PolicyRule } from '@c15t/schema/types';
import { StrictMode, act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { ConsentBanner, ConsentProvider, custom } from '../index';
import type { ConsentProviderOptions } from '../index';
import { policyFixture } from './policy-fixture';
import {
	BANNER,
	deferred,
	fulfilledThenable,
	streamPage,
} from './streamed-ssr-harness';
import type { StreamedPage } from './streamed-ssr-harness';

const policyConfig = function policyConfig(
	rule: Partial<PolicyRule> = {},
	values: Parameters<typeof policyFixture>[0] = {}
): KernelConfig {
	return {
		initialBranding: 'c15t',
		initialLocation: { countryCode: 'DE', regionCode: null },
		initialOverrides: { country: 'DE', language: 'en' },
		...policyFixture(values, {
			categories: ['marketing'],
			id: 'gdpr',
			...rule,
		}),
	};
};

/** What the server knows without a backend answer: no policy yet. */
const baselineConfig = (): KernelConfig => ({
	initialLocation: { countryCode: 'DE', regionCode: null },
	initialOverrides: { country: 'DE', language: 'en' },
});

const transportInit = vi.fn(() => Promise.resolve({}));
const transportSave = vi.fn(() => Promise.resolve({ ok: true as const }));

type Prefetch = KernelConfig | Promise<KernelConfig>;

const NO_OPTIONS: Partial<ConsentProviderOptions> = {};

const Page = ({
	prefetch,
	options = NO_OPTIONS,
}: {
	prefetch: Prefetch;
	options?: Partial<ConsentProviderOptions>;
}) => (
	<html lang="en">
		<head />
		<body>
			<ConsentProvider
				options={{
					mode: custom({ init: transportInit, save: transportSave }),
					persistence: false,
					prefetch,
					...options,
				}}
			>
				<main>content</main>
				<ConsentBanner />
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

/** The timeline from a mark on. */
const after = (timeline: string[], label: string) =>
	timeline.slice(timeline.indexOf(`@${label}`));

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
 * hydrates with the client's copy already settled, as when the chunk
 * arrives before the app's JavaScript runs.
 */
const streamThenHydrate = async function streamThenHydrate(
	config: KernelConfig,
	options: Partial<ConsentProviderOptions> = {}
) {
	const server = deferred<KernelConfig>();
	page = await streamPage(
		<Page
			prefetch={server.promise}
			options={options}
		/>
	);
	const shell = page.hasBanner();
	page.mark('shell');
	server.resolve(config);
	await page.finish();
	const streamed = page.hasBanner();
	page.mark('streamed');
	const hydrated = await page.hydrate(
		<Page
			prefetch={fulfilledThenable(config)}
			options={options}
		/>
	);
	page.mark('hydrated');
	await tick(100);
	page.mark('settled');
	return { hydrated, page, shell, streamed };
};

test('a policy that shows the banner streams it before hydration, unchanged through hydration', async () => {
	const { hydrated, shell, streamed } = await streamThenHydrate(policyConfig());

	expect(shell).toBe(false);
	expect(streamed).toBe(true);
	expect(hydrated.recoverableErrors).toEqual([]);
	expect(page?.serverErrors).toEqual([]);
	// One banner state from the chunk on: no blink, no re-render of its
	// markup.
	expect(states(page?.timeline ?? [])).toHaveLength(2);
	// The streamed config answered init: nothing went to the network.
	expect(transportInit).not.toHaveBeenCalled();
	await hydrated.unmount();
});

test('a policy without a prompt streams no banner', async () => {
	const { hydrated, streamed } = await streamThenHydrate(
		policyConfig({ id: 'us', model: 'opt-out', prompt: 'none' })
	);

	expect(streamed).toBe(false);
	expect(states(page?.timeline ?? [])).toEqual(['none']);
	expect(hydrated.recoverableErrors).toEqual([]);
	await hydrated.unmount();
});

test('a model of none streams no banner', async () => {
	const { hydrated, streamed } = await streamThenHydrate(
		policyConfig({ id: 'none', model: 'none', prompt: 'none' })
	);

	expect(streamed).toBe(false);
	expect(states(page?.timeline ?? [])).toEqual(['none']);
	expect(hydrated.recoverableErrors).toEqual([]);
	await hydrated.unmount();
});

test('a returning visitor whose cookie holds a choice gets no banner', async () => {
	const { hydrated, streamed } = await streamThenHydrate(
		policyConfig({}, { marketing: true })
	);

	expect(streamed).toBe(false);
	expect(states(page?.timeline ?? [])).toEqual(['none']);
	expect(hydrated.recoverableErrors).toEqual([]);
	await hydrated.unmount();
});

test('a config without a policy streams no banner, and the client asks the backend', async () => {
	const { hydrated, streamed } = await streamThenHydrate(baselineConfig());

	expect(streamed).toBe(false);
	expect(hydrated.recoverableErrors).toEqual([]);
	expect(transportInit).toHaveBeenCalledTimes(1);
	await hydrated.unmount();
});

test('a rejected prefetch streams no banner and breaks nothing', async () => {
	const server = deferred<KernelConfig>();
	page = await streamPage(<Page prefetch={server.promise} />);
	server.reject(new Error('backend down'));
	await page.finish();
	expect(page.hasBanner()).toBe(false);
	expect(page.serverErrors).toEqual([]);
	expect(page.doc.querySelector('main')?.textContent).toBe('content');

	const client = Promise.reject(new Error('backend down'));
	client.catch(() => undefined);
	const hydrated = await page.hydrate(<Page prefetch={client} />);
	await tick(100);
	expect(hydrated.recoverableErrors).toEqual([]);
	// The runtime falls back to its own init.
	expect(transportInit).toHaveBeenCalledTimes(1);
	await hydrated.unmount();
});

test('a configured experiment keeps the banner for the browser', async () => {
	const { hydrated, streamed } = await streamThenHydrate(policyConfig(), {
		experiment: {
			arms: {
				bar: { prompt: { variant: 'bar' } },
				floating: { prompt: { variant: 'floating' } },
			},
			id: 'banner-shape',
		},
	});

	expect(streamed).toBe(false);
	expect(hydrated.recoverableErrors).toEqual([]);
	await hydrated.unmount();
});

test('a disabled provider streams no banner', async () => {
	const { hydrated, streamed } = await streamThenHydrate(policyConfig(), {
		enabled: false,
	});

	expect(streamed).toBe(false);
	expect(states(page?.timeline ?? [])).toEqual(['none']);
	expect(hydrated.recoverableErrors).toEqual([]);
	await hydrated.unmount();
});

test('streamBanner: false leaves the banner to the browser', async () => {
	const { hydrated, streamed } = await streamThenHydrate(policyConfig(), {
		streamBanner: false,
	});

	expect(streamed).toBe(false);
	expect(hydrated.recoverableErrors).toEqual([]);
	// The streamed config still answers init, after hydration.
	expect(page?.hasBanner()).toBe(true);
	expect(transportInit).not.toHaveBeenCalled();
	await hydrated.unmount();
});

test('a policy known before the shell flushes renders the banner in the shell', async () => {
	const config = policyConfig();
	page = await streamPage(<Page prefetch={fulfilledThenable(config)} />);
	await page.finish();
	expect(page.hasBanner()).toBe(true);
	page.mark('streamed');
	const hydrated = await page.hydrate(
		<Page prefetch={fulfilledThenable(config)} />
	);
	await tick(100);
	expect(hydrated.recoverableErrors).toEqual([]);
	// A chunk can end mid-banner, so compare from the end of the stream.
	expect(states(after(page.timeline, 'streamed'))).toHaveLength(1);
	await hydrated.unmount();
});

test('JavaScript that hydrates before the chunk arrives waits for it, then keeps the banner', async () => {
	const config = policyConfig();
	const server = deferred<KernelConfig>();
	const client = deferred<KernelConfig>();
	page = await streamPage(<Page prefetch={server.promise} />);
	const hydrated = await page.hydrate(<Page prefetch={client.promise} />);
	page.mark('hydrated-shell');
	expect(page.hasBanner()).toBe(false);

	server.resolve(config);
	await page.finish();
	page.mark('chunk');
	expect(page.hasBanner()).toBe(true);
	await act(() => {
		client.resolve(config);
	});
	page.mark('client-data');
	await tick(100);

	expect(hydrated.recoverableErrors).toEqual([]);
	expect(states(page.timeline).filter((entry) => entry !== 'none')).toEqual([
		states(page.timeline).at(-1),
	]);
	expect(page.hasBanner()).toBe(true);
	expect(transportInit).not.toHaveBeenCalled();
	await hydrated.unmount();
});

test('client data that lands before the chunk does not render the banner ahead of it', async () => {
	const config = policyConfig();
	const server = deferred<KernelConfig>();
	const client = deferred<KernelConfig>();
	page = await streamPage(<Page prefetch={server.promise} />);
	const hydrated = await page.hydrate(<Page prefetch={client.promise} />);

	await act(() => {
		client.resolve(config);
	});
	await tick(50);
	const beforeChunk = page.hasBanner();

	server.resolve(config);
	await page.finish();
	await tick(100);

	expect(hydrated.recoverableErrors).toEqual([]);
	expect(page.hasBanner()).toBe(true);
	expect(beforeChunk).toBe(false);
	await hydrated.unmount();
});

test('accepting right after hydration records the choice against the streamed policy', async () => {
	const { hydrated } = await streamThenHydrate(policyConfig());

	const accept = page?.doc.querySelector<HTMLButtonElement>(
		'[data-testid="consent-banner-accept-button"]'
	);
	expect(accept).toBeTruthy();
	await act(() => {
		accept?.click();
	});
	await tick(100);

	expect(page?.doc.querySelector(BANNER)).toBeNull();
	expect(transportSave).toHaveBeenCalledTimes(1);
	expect(JSON.stringify(transportSave.mock.calls[0])).toContain('gdpr');
	await hydrated.unmount();
});

test('a click before the client has the data waits for it and records against the streamed policy', async () => {
	const config = policyConfig();
	const server = deferred<KernelConfig>();
	const client = deferred<KernelConfig>();
	page = await streamPage(<Page prefetch={server.promise} />);
	server.resolve(config);
	await page.finish();
	// The root hydrates; the banner's boundary waits for the client's data.
	const hydrated = await page.hydrate(<Page prefetch={client.promise} />);
	page.doc
		.querySelector<HTMLButtonElement>(
			'[data-testid="consent-banner-accept-button"]'
		)
		?.click();
	await tick(50);
	// The banner's inline script holds the tap and hides the banner. Nothing
	// is saved against the provisional policy.
	expect(transportSave).not.toHaveBeenCalled();
	const banner = page.doc.querySelector<HTMLElement>(BANNER);
	expect(banner).not.toBeNull();
	expect(banner && page.doc.defaultView?.getComputedStyle(banner).display).toBe(
		'none'
	);

	await act(() => {
		client.resolve(config);
	});
	await tick(100);

	expect(hydrated.recoverableErrors).toEqual([]);
	expect(transportSave).toHaveBeenCalledTimes(1);
	expect(JSON.stringify(transportSave.mock.calls[0])).toContain('gdpr');
	expect(page.doc.querySelector(BANNER)).toBeNull();
	await hydrated.unmount();
});

test('a click in the same task hydration starts records against the streamed policy', async () => {
	const config = policyConfig();
	const server = deferred<KernelConfig>();
	page = await streamPage(<Page prefetch={server.promise} />);
	server.resolve(config);
	await page.finish();

	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = false;
	const hydrated = page.hydrateNow(
		<Page prefetch={fulfilledThenable(config)} />
	);
	// React hydrates the banner for the click and runs its handler before
	// the runtime has started: the kernel adopted the streamed config as
	// the banner committed.
	page.doc
		.querySelector<HTMLButtonElement>(
			'[data-testid="consent-banner-accept-button"]'
		)
		?.click();
	try {
		await new Promise((resolve) => {
			setTimeout(resolve, 200);
		});
		expect(hydrated.recoverableErrors).toEqual([]);
		expect(transportSave).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(transportSave.mock.calls[0])).toContain('gdpr');
		expect(page.doc.querySelector(BANNER)).toBeNull();
	} finally {
		(
			globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
		).IS_REACT_ACT_ENVIRONMENT = true;
		await hydrated.unmount();
	}
});

const clearCookies = () => {
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

test('a choice only in localStorage: the streamed banner leaves once the browser reads it', async () => {
	clearCookies();
	// First visit: accept, which stores the choice.
	const first = await streamThenHydrate(policyConfig(), { persistence: true });
	await act(() => {
		page?.doc
			.querySelector<HTMLButtonElement>(
				'[data-testid="consent-banner-accept-button"]'
			)
			?.click();
	});
	await vi.waitFor(() => expect(page?.hasBanner()).toBe(false));
	await vi.waitFor(() =>
		expect(Object.keys(localStorage).length).toBeGreaterThan(0)
	);
	await first.hydrated.unmount();
	page?.dispose();
	expect(Object.keys(localStorage).length).toBeGreaterThan(0);

	// The cookie is gone, so the server sees no choice; localStorage has it.
	clearCookies();
	const second = await streamThenHydrate(policyConfig(), { persistence: true });
	await vi.waitFor(() => expect(page?.hasBanner()).toBe(false));

	// The server could not know, so the banner streams and shows until the
	// runtime reads storage after hydration. A synchronous prefetch does
	// the same.
	expect(second.streamed).toBe(true);
	expect(second.hydrated.recoverableErrors).toEqual([]);
	const seen = states(after(page?.timeline ?? [], 'streamed'));
	expect(seen.at(0)).toMatch(/^banner:/u);
	expect(seen.at(-1)).toBe('none');
	expect(seen).toHaveLength(2);
	await second.hydrated.unmount();
});

test('StrictMode hydration keeps the streamed banner without a blink', async () => {
	const config = policyConfig();
	const server = deferred<KernelConfig>();
	page = await streamPage(
		<StrictMode>
			<Page prefetch={server.promise} />
		</StrictMode>
	);
	server.resolve(config);
	await page.finish();
	page.mark('streamed');
	const hydrated = await page.hydrate(
		<StrictMode>
			<Page prefetch={fulfilledThenable(config)} />
		</StrictMode>
	);
	await tick(150);

	expect(hydrated.recoverableErrors).toEqual([]);
	expect(states(after(page.timeline, 'streamed'))).toHaveLength(1);
	expect(transportInit).not.toHaveBeenCalled();
	await hydrated.unmount();
});
