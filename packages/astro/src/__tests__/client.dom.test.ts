import type { ConsentSnapshot } from '@c15t/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	attachBannerActions,
	boot,
	getConsent,
	getConsentClient,
	subscribe,
	syncBannerVisibility,
	syncSurfaceVisibility,
} from '../client';
import type { AstroConsentClient } from '../client';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import type { C15tAstroOptions } from '../types';
import { registerDialogAdapter } from '../ui/adapter';
import type { ConsentDialogHandle } from '../ui/adapter';
import { testResolution, testRule } from './policy-fixture';

const OPTIONS: C15tAstroOptions = {
	consentCategories: ['necessary', 'measurement', 'marketing'],
	mode: offlineMode({ policyRules: [testRule] }),
};

const INLINE_CONFIG = {
	initialPolicyResolution: testResolution(),
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
		expect(booted.getConsent().policyRule.id).toBe('test');
		expect(fetchSpy).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});

	it('exposes the snapshot and a subscription', () => {
		renderBanner();
		start();
		expect(getConsent()?.effectivePermissions.necessary).toBeDefined();

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
			expect(booted.getConsent().effectivePermissions.marketing).toBe(true);
		});
	});

	it('rejects everything but necessary from the reject button', async () => {
		renderBanner();
		const booted = start();
		document
			.querySelector<HTMLButtonElement>('[data-c15t-action="reject"]')
			?.click();
		await vi.waitFor(() => {
			expect(booted.getConsent().effectivePermissions.marketing).toBe(false);
			expect(booted.getConsent().effectivePermissions.necessary).toBe(true);
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

	it('hides persistent controls until a policy rule is resolved', () => {
		document.body.innerHTML = `
			<button data-c15t-surface="trigger" data-testid="consent-dialog-trigger" type="button" hidden>Privacy</button>
		`;
		const trigger = document.querySelector<HTMLElement>(
			'[data-testid="consent-dialog-trigger"]'
		);
		const unresolved = {
			policyRule: { prompt: 'choice', rights: ['disclosure', 'preferences'] },
			resolution: { policy: null, reason: 'transport', status: 'failed' },
		} as unknown as ConsentSnapshot;
		const resolved = {
			policyRule: { prompt: 'choice', rights: ['disclosure', 'preferences'] },
			resolution: { status: 'matched' },
		} as unknown as ConsentSnapshot;
		// A `none` rule with no rights owes no UI even though it resolved.
		const noneWithoutRights = {
			policyRule: { prompt: 'none', rights: [] },
			resolution: { status: 'matched' },
		} as unknown as ConsentSnapshot;
		const noneWithPreferences = {
			policyRule: { prompt: 'none', rights: ['preferences'] },
			resolution: { status: 'matched' },
		} as unknown as ConsentSnapshot;

		syncSurfaceVisibility(unresolved);
		expect(trigger?.hidden).toBe(true);

		// A later init that supplies a rule reveals the control in place.
		syncSurfaceVisibility(resolved);
		expect(trigger?.hidden).toBe(false);

		syncSurfaceVisibility(unresolved);
		expect(trigger?.hidden).toBe(true);

		syncSurfaceVisibility(noneWithoutRights);
		expect(trigger?.hidden).toBe(true);

		syncSurfaceVisibility(noneWithPreferences);
		expect(trigger?.hidden).toBe(false);
	});

	it.each(['consent-banner', 'iab-consent-banner'])(
		'locks scroll and traps focus while a blocking %s shows',
		(name) => {
			document.body.innerHTML = `
			<div data-testid="${name}-overlay"></div>
			<div data-testid="${name}-root" data-blocking="true">
				<div data-testid="${name}-card" tabindex="-1">
					<button data-c15t-action="accept" type="button">Accept</button>
				</div>
			</div>
		`;
			const shown = { activeUI: 'banner' } as ConsentSnapshot;
			const hidden = { activeUI: 'none' } as ConsentSnapshot;

			syncBannerVisibility(shown);
			expect(document.body.style.overflow).toBe('hidden');
			// A second sync while shown keeps the same lock.
			syncBannerVisibility(shown);
			expect(document.body.style.overflow).toBe('hidden');

			syncBannerVisibility(hidden);
			expect(document.body.style.overflow).toBe('');
			expect(
				document.querySelector<HTMLElement>(`[data-testid="${name}-overlay"]`)
					?.hidden
			).toBe(true);
		}
	);

	it('leaves scroll alone for a non-blocking banner', () => {
		renderBanner();
		syncBannerVisibility({ activeUI: 'banner' } as ConsentSnapshot);
		expect(document.body.style.overflow).toBe('');
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
		expect(booted.getConsent().effectivePermissions.marketing).toBe(true);
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

describe('opening without an inlined resolution', () => {
	/** Boot with the init still in flight: no server-resolved policy inlined. */
	const startPending = function startPending(
		options: C15tAstroOptions = OPTIONS
	): AstroConsentClient {
		(window as unknown as Record<string, unknown>).__c15tAstroConfig = {
			initialTranslations: INLINE_CONFIG.initialTranslations,
		};
		client = boot(resolveOptions(options));
		return client;
	};

	it('waits for the pending init and then mounts the dialog', async () => {
		const mount = vi.fn(() =>
			Promise.resolve({
				close: vi.fn(),
				destroy: vi.fn(),
			} as ConsentDialogHandle)
		);
		registerDialogAdapter('svelte', () =>
			Promise.resolve({ mount, name: 'svelte' })
		);

		renderBanner();
		const booted = startPending();
		// Asked before the offline init has answered; the policy arrives a
		// moment later and the dialog must still open.
		expect(booted.getConsent().policyPending).toBe(true);
		await booted.openDialog();

		expect(booted.getConsent().resolution.status).toBe('matched');
		expect(mount).toHaveBeenCalledOnce();
		expect(booted.getConsent().activeUI).toBe('dialog');
	});

	it('never mounts the dialog when the init settles without a policy', async () => {
		const mount = vi.fn(() =>
			Promise.resolve({
				close: vi.fn(),
				destroy: vi.fn(),
			} as ConsentDialogHandle)
		);
		registerDialogAdapter('svelte', () =>
			Promise.resolve({ mount, name: 'svelte' })
		);

		renderBanner();
		// An empty rule list resolves `unconfigured`; omitting it would resolve
		// the recommended pack instead.
		const booted = startPending({
			consentCategories: OPTIONS.consentCategories,
			mode: offlineMode({ policyRules: [] }),
		});
		await booted.openDialog();

		expect(booted.getConsent().policyPending).toBe(false);
		expect(booted.getConsent().resolution.status).not.toBe('matched');
		expect(mount).not.toHaveBeenCalled();
		expect(booted.getConsent().activeUI).not.toBe('dialog');
	});

	it('does not mount the dialog under a none rule that owes no rights', async () => {
		const mount = vi.fn(() =>
			Promise.resolve({
				close: vi.fn(),
				destroy: vi.fn(),
			} as ConsentDialogHandle)
		);
		registerDialogAdapter('svelte', () =>
			Promise.resolve({ mount, name: 'svelte' })
		);

		renderBanner();
		const booted = startPending({
			consentCategories: OPTIONS.consentCategories,
			mode: offlineMode({
				policyRules: [
					{
						id: 'none',
						match: { fallback: true, isDefault: true },
						model: 'none',
						prompt: 'none',
					},
				],
			}),
		});
		await booted.openDialog();

		expect(booted.getConsent().resolution.status).toBe('matched');
		expect(booted.getConsent().policyRule.model).toBe('none');
		expect(mount).not.toHaveBeenCalled();
		expect(booted.getConsent().activeUI).not.toBe('dialog');
	});

	it('mounts the dialog under a none rule that grants preferences', async () => {
		const mount = vi.fn(() =>
			Promise.resolve({
				close: vi.fn(),
				destroy: vi.fn(),
			} as ConsentDialogHandle)
		);
		registerDialogAdapter('svelte', () =>
			Promise.resolve({ mount, name: 'svelte' })
		);

		renderBanner();
		const booted = startPending({
			consentCategories: OPTIONS.consentCategories,
			mode: offlineMode({
				policyRules: [
					{
						id: 'none-with-preferences',
						match: { fallback: true, isDefault: true },
						model: 'none',
						prompt: 'none',
						rights: ['preferences'],
					},
				],
			}),
		});
		await booted.openDialog();

		expect(booted.getConsent().policyRule.model).toBe('none');
		expect(mount).toHaveBeenCalledTimes(1);
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

it('forwards cleanup targets to its shared runtime', async () => {
	const booted = start({
		...OPTIONS,
		clearOnRevocation: { measurement: { localStorage: ['analytics:visitor'] } },
	});
	await booted.acceptAll();
	localStorage.setItem('analytics:visitor', 'visitor');
	await booted.rejectAll();
	expect(localStorage.getItem('analytics:visitor')).toBeNull();
});
