import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	attachBannerActions,
	boot,
	getConsent,
	getConsentClient,
	subscribe,
} from '../client';
import type { AstroConsentClient } from '../client';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import type { C15tAstroOptions } from '../types';
import { registerDialogAdapter } from '../ui/adapter';
import type { ConsentDialogHandle } from '../ui/adapter';

const OPTIONS: C15tAstroOptions = {
	consentCategories: ['necessary', 'measurement', 'marketing'],
	mode: offlineMode(),
};

const INLINE_CONFIG = {
	initialPolicy: {
		consent: {
			categories: ['necessary', 'measurement', 'marketing'],
			scopeMode: 'permissive',
		},
		id: 'test',
		model: 'opt-in',
		ui: { mode: 'banner' },
	},
	initialTranslations: { language: 'en', translations: {} },
};

interface Deferred {
	promise: Promise<void>;
	resolve: () => void;
}

type PromiseWithResolvers = PromiseConstructor & {
	withResolvers: <Value>() => {
		promise: Promise<Value>;
		resolve: (value: Value | PromiseLike<Value>) => void;
		reject: (reason?: unknown) => void;
	};
};

/** A promise a test can hold open, then release. */
const gate = function gate(): Deferred {
	const deferred = (Promise as PromiseWithResolvers).withResolvers<undefined>();
	return {
		promise: deferred.promise,
		resolve: () => deferred.resolve(undefined),
	};
};

/** Yields long enough for pending microtasks to settle. */
const tick = function tick(): Promise<void> {
	const deferred = (Promise as PromiseWithResolvers).withResolvers<undefined>();
	setTimeout(() => deferred.resolve(undefined), 0);
	return deferred.promise;
};

let client: AstroConsentClient | null = null;

const renderBanner = function renderBanner(): void {
	document.body.innerHTML = `
		<div data-testid="consent-banner-root">
			<button data-c15t-action="reject" type="button">Reject</button>
			<button data-c15t-action="customize" type="button">Customize</button>
			<button data-c15t-action="accept" type="button">Accept</button>
		</div>
	`;
};

const start = function start(
	options: C15tAstroOptions = OPTIONS
): AstroConsentClient {
	(window as unknown as Record<string, unknown>).__c15tAstroConfig =
		INLINE_CONFIG;
	client = boot(resolveOptions(options));
	return client;
};

beforeEach(() => {
	localStorage.clear();
	document.body.innerHTML = '';
	document.head.innerHTML = '';
	const globals = window as unknown as Record<string, unknown>;
	globals.__c15tAstro = undefined;
	globals.__c15tAstroConfig = undefined;
	globals.__c15tAstroActions = undefined;
});

afterEach(() => {
	client?.dispose();
	client = null;
});

describe('boot', () => {
	it('creates one runtime per page', () => {
		renderBanner();
		const first = start();
		const second = boot(resolveOptions(OPTIONS));
		expect(second).toBe(first);
		expect(getConsentClient()).toBe(first);
	});

	it('boots from the inlined config instead of the network', () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		renderBanner();
		const booted = start();
		expect(booted.getConsent().policy?.id).toBe('test');
		expect(fetchSpy).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});

	it('exposes the snapshot and a subscription', () => {
		renderBanner();
		start();
		expect(getConsent()?.consents.necessary).toBeDefined();

		const listener = vi.fn();
		const unsubscribe = subscribe(listener);
		void getConsentClient()?.acceptAll();
		unsubscribe();
		expect(listener).toHaveBeenCalled();
	});

	it('returns a no-op subscription before boot', () => {
		expect(getConsent()).toBeNull();
		expect(() => subscribe(vi.fn())()).not.toThrow();
	});
});

describe('banner actions', () => {
	it('accepts everything from the accept button', async () => {
		renderBanner();
		const booted = start();
		document
			.querySelector<HTMLButtonElement>('[data-c15t-action="accept"]')
			?.click();
		await vi.waitFor(() => {
			expect(booted.getConsent().consents.marketing).toBe(true);
		});
	});

	it('rejects everything but necessary from the reject button', async () => {
		renderBanner();
		const booted = start();
		document
			.querySelector<HTMLButtonElement>('[data-c15t-action="reject"]')
			?.click();
		await vi.waitFor(() => {
			expect(booted.getConsent().consents.marketing).toBe(false);
			expect(booted.getConsent().consents.necessary).toBe(true);
		});
	});

	it('installs exactly one delegated listener', () => {
		const spy = vi.spyOn(document, 'addEventListener');
		renderBanner();
		start();
		attachBannerActions();
		attachBannerActions();
		const clickListeners = spy.mock.calls.filter(([type]) => type === 'click');
		expect(clickListeners).toHaveLength(1);
		spy.mockRestore();
	});

	it('hides the banner once consent is saved', async () => {
		renderBanner();
		const booted = start();
		const banner = document.querySelector<HTMLElement>(
			'[data-testid="consent-banner-root"]'
		);
		await booted.acceptAll();
		await vi.waitFor(() => {
			expect(banner?.hidden).toBe(true);
			expect(banner?.getAttribute('data-c15t-visible')).toBe('false');
		});
	});
});

describe('ClientRouter navigation', () => {
	it('re-attaches to swapped markup without resetting consent', async () => {
		renderBanner();
		const booted = start();
		await booted.acceptAll();

		// The router swaps the document but never re-evaluates modules.
		renderBanner();
		document.dispatchEvent(new Event('astro:after-swap'));

		expect(getConsentClient()).toBe(booted);
		expect(booted.getConsent().consents.marketing).toBe(true);
		await vi.waitFor(() => {
			expect(
				document.querySelector<HTMLElement>(
					'[data-testid="consent-banner-root"]'
				)?.hidden
			).toBe(true);
		});
	});

	it('gates scripts added by a navigation', async () => {
		renderBanner();
		const booted = start();
		await booted.acceptAll();

		document.body.insertAdjacentHTML(
			'beforeend',
			[
				'<script type="text/plain" data-c15t-category="measurement">',
				'globalThis.__navGated = true;',
				'</script>',
			].join('')
		);
		document.dispatchEvent(new Event('astro:page-load'));

		expect(
			document.querySelector('script[data-c15t-activated="true"]')
		).not.toBeNull();
	});
});

describe('dialog lifecycle', () => {
	it('destroys a surface that mounted after dispose', async () => {
		// `dispose()` only tears down the handle it can already see, so an
		// open still waiting on its adapter would otherwise leave a surface
		// bound to a disposed runtime.
		const destroy = vi.fn();
		const loading = gate();
		registerDialogAdapter('svelte', async () => {
			await loading.promise;
			return {
				mount: () =>
					Promise.resolve({
						close: vi.fn(),
						destroy,
					} as ConsentDialogHandle),
				name: 'svelte',
			};
		});

		renderBanner();
		const booted = start();
		const opening = booted.openDialog();
		booted.dispose();
		loading.resolve();
		await opening;

		expect(destroy).not.toHaveBeenCalled();
		expect(booted.getConsent().activeUI).not.toBe('dialog');
		client = null;
	});

	it('destroys a surface mounted during dispose', async () => {
		const destroy = vi.fn();
		const mounting = gate();
		registerDialogAdapter('svelte', () =>
			Promise.resolve({
				async mount() {
					await mounting.promise;
					return { close: vi.fn(), destroy } as ConsentDialogHandle;
				},
				name: 'svelte',
			})
		);

		renderBanner();
		const booted = start();
		const opening = booted.openDialog();
		// Let the adapter load settle so the open is inside `mount()`.
		await tick();
		booted.dispose();
		mounting.resolve();
		await opening;

		expect(destroy).toHaveBeenCalledOnce();
		client = null;
	});
});
