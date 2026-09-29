import type { ConsentSnapshot } from '@c15t/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDialogStylesForTest } from '../browser/dialog-styles';
import { whenIABReady } from '../browser/iab';
import {
	attachBannerActions,
	boot,
	getConsent,
	getConsentClient,
	registerDialogStyles,
	subscribe,
	syncBannerVisibility,
	syncSurfaceVisibility,
} from '../client';
import type { AstroConsentClient } from '../client';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import type { C15tAstroOptions, C15tIABOptions } from '../types';
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
	resetDialogStylesForTest();
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

	it('runs the host-resolved experiment arm from the first snapshot', () => {
		renderBanner();
		const booted = start({
			...OPTIONS,
			experiment: {
				id: 'banner-shape',
				variant: 'bar',
				variants: { bar: { prompt: { variant: 'bar' } }, control: {} },
			},
		});
		expect(booted.getConsent().experiment).toEqual({
			acknowledgedDiagnostics: false,
			assignedBy: 'host',
			id: 'banner-shape',
			variant: 'bar',
		});
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

describe('IAB options', () => {
	it('forwards publisher restrictions to the CMP', async () => {
		const publisherRestrictions = [
			{ purposeId: 2, restrictionType: 0 as const, vendorIds: [755] },
		];
		const gvl = {
			features: {},
			purposes: { 2: { description: '', id: 2, illustrations: [], name: '' } },
			specialFeatures: {},
			specialPurposes: {},
			stacks: {},
			tcfPolicyVersion: 5,
			vendorListVersion: 1,
			vendors: {
				755: {
					features: [],
					flexiblePurposes: [],
					id: 755,
					legIntPurposes: [],
					name: 'Vendor',
					purposes: [2],
					specialFeatures: [],
					specialPurposes: [],
					urls: [],
					usesCookies: false,
					usesNonCookieAccess: false,
				},
			},
		} as unknown as NonNullable<C15tIABOptions['gvl']>;
		const booted = start({
			...OPTIONS,
			iab: { cmpId: 28, gvl, publisherRestrictions },
		});
		await whenIABReady();
		expect(booted.getConsent().iab?.publisherRestrictions).toEqual(
			publisherRestrictions
		);
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

describe('warming the dialog on intent', () => {
	const registerCountingAdapter = function registerCountingAdapter(
		preload: () => Promise<void> = () => Promise.resolve()
	) {
		const counts = { loads: 0, preloads: 0 };
		registerDialogAdapter('svelte', () => {
			counts.loads += 1;
			return Promise.resolve({
				mount: () =>
					Promise.resolve({
						close: vi.fn(),
						destroy: vi.fn(),
					} as ConsentDialogHandle),
				name: 'svelte',
				preload: () => {
					counts.preloads += 1;
					return preload();
				},
			});
		});
		return counts;
	};

	const button = (action: string) =>
		document.querySelector<HTMLButtonElement>(`[data-c15t-action="${action}"]`);

	it('does not download the dialog on load', async () => {
		const counts = registerCountingAdapter();
		renderBanner();
		start();
		await tick();
		expect(counts).toEqual({ loads: 0, preloads: 0 });
	});

	it('downloads it when the pointer reaches Customize', async () => {
		const counts = registerCountingAdapter();
		renderBanner();
		start();
		button('customize')?.dispatchEvent(
			new Event('pointerover', { bubbles: true })
		);
		await vi.waitFor(() => {
			expect(counts.preloads).toBe(1);
		});
		// More hovers reuse the first download.
		button('customize')?.dispatchEvent(
			new Event('pointerover', { bubbles: true })
		);
		await tick();
		expect(counts).toEqual({ loads: 1, preloads: 1 });
	});

	it('downloads it when Customize gets focus', async () => {
		const counts = registerCountingAdapter();
		renderBanner();
		start();
		button('customize')?.focus();
		await vi.waitFor(() => {
			expect(counts.preloads).toBe(1);
		});
	});

	it('ignores other buttons and the IAB dialog', async () => {
		const counts = registerCountingAdapter();
		renderBanner();
		document.body.insertAdjacentHTML(
			'beforeend',
			'<button data-c15t-action="customize" data-c15t-dialog="iab" id="iab">Partners</button>'
		);
		start();
		for (const target of [
			button('accept'),
			button('reject'),
			document.querySelector('#iab'),
		]) {
			target?.dispatchEvent(new Event('pointerover', { bubbles: true }));
		}
		await tick();
		expect(counts).toEqual({ loads: 0, preloads: 0 });
	});

	it('retries after a failed download', async () => {
		let fail = true;
		const counts = registerCountingAdapter(() =>
			fail ? Promise.reject(new Error('offline')) : Promise.resolve()
		);
		renderBanner();
		start();
		button('customize')?.dispatchEvent(
			new Event('pointerover', { bubbles: true })
		);
		await vi.waitFor(() => {
			expect(counts.preloads).toBe(1);
		});
		await tick();
		fail = false;
		button('customize')?.dispatchEvent(
			new Event('pointerover', { bubbles: true })
		);
		await vi.waitFor(() => {
			expect(counts.preloads).toBe(2);
		});
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

it('opens the external CMP and never records its decisions as c15t choices', async () => {
	const openPreferences = vi.fn();
	const onPermissionsChanged = vi.fn();
	const trigger = document.createElement('button');
	trigger.dataset.c15tSurface = 'trigger';
	document.body.append(trigger);
	client = boot(resolveOptions(OPTIONS), {
		callbacks: { onPermissionsChanged },
		consentSource: {
			getPermissions: () => ({ measurement: true }),
			openPreferences,
			subscribe: () => () => {},
		},
	});
	expect(trigger.hidden).toBe(false);
	await client.openDialog();
	expect(openPreferences).toHaveBeenCalledOnce();
	expect(client.getConsent().explicitChoice).toBeNull();
	expect(client.getConsent().activeUI).toBe('none');
	expect(client.getConsent().effectivePermissions.measurement).toBe(true);
	expect(onPermissionsChanged).toHaveBeenCalled();
	await expect(client.acceptAll()).rejects.toThrow('external CMP');
});

describe('networkBlocker', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		// The consent cookie outlives the localStorage reset between tests.
		for (const cookie of document.cookie.split(';')) {
			const name = cookie.split('=')[0]?.trim();
			if (name) {
				document.cookie = `${name}=; max-age=0; path=/`;
			}
		}
	});

	const TRACKER = 'https://tracker.example/collect';
	const rules = [
		{ category: 'measurement' as const, domain: 'tracker.example' },
	];

	it('blocks matching requests until the visitor consents', async () => {
		const network = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response('ok'));
		renderBanner();
		const booted = start({
			...OPTIONS,
			networkBlocker: { logBlockedRequests: false, rules },
		});

		expect((await window.fetch(TRACKER)).status).toBe(451);
		expect(network).not.toHaveBeenCalled();

		await booted.acceptAll();
		expect((await window.fetch(TRACKER)).status).toBe(200);
		expect(network).toHaveBeenCalledWith(TRACKER, undefined);
	});

	it('takes onRequestBlocked from the client entrypoint', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));
		const onRequestBlocked = vi.fn();
		renderBanner();
		(window as unknown as Record<string, unknown>).__c15tAstroConfig =
			INLINE_CONFIG;
		client = boot(
			resolveOptions({ ...OPTIONS, networkBlocker: { rules: [] } }),
			{
				networkBlocker: { logBlockedRequests: false, onRequestBlocked, rules },
			}
		);

		expect((await window.fetch(TRACKER)).status).toBe(451);
		expect(onRequestBlocked).toHaveBeenCalledWith(
			expect.objectContaining({ url: TRACKER })
		);
	});
});

describe('dialog stylesheets and ClientRouter swaps', () => {
	const DIALOG_CSS = '/_astro/dialog.css';

	/** Registers a Svelte adapter that records where each surface mounted. */
	const registerRecordingAdapter = function registerRecordingAdapter() {
		const targets: HTMLElement[] = [];
		const destroy = vi.fn();
		registerDialogAdapter('svelte', () =>
			Promise.resolve({
				mount: ({ target }) => {
					targets.push(target);
					return Promise.resolve({
						close: vi.fn(),
						destroy,
					} as ConsentDialogHandle);
				},
				name: 'svelte',
			})
		);
		return { destroy, targets };
	};

	const dialogLink = () =>
		document.head.querySelector<HTMLLinkElement>(
			`link[rel="stylesheet"][href="${DIALOG_CSS}"]`
		);

	/** Opens the dialog, answering the stylesheet download. */
	const openWithStyles = async function openWithStyles(
		booted: AstroConsentClient
	): Promise<void> {
		const opening = booted.openDialog();
		await vi.waitFor(() => {
			expect(dialogLink()).not.toBeNull();
		});
		dialogLink()?.dispatchEvent(new Event('load'));
		await opening;
	};

	/** What the ClientRouter does: parse the next page, swap body and head. */
	const swapPage = function swapPage(): Document {
		const incoming = document.implementation.createHTMLDocument();
		const beforeSwap = Object.assign(new Event('astro:before-swap'), {
			newDocument: incoming,
		});
		document.dispatchEvent(beforeSwap);
		document.body.replaceWith(incoming.body.cloneNode(true));
		renderBanner();
		document.dispatchEvent(new Event('astro:after-swap'));
		return incoming;
	};

	it('mounts the dialog only once its stylesheet has loaded', async () => {
		registerDialogStyles([DIALOG_CSS]);
		const { targets } = registerRecordingAdapter();
		renderBanner();
		const booted = start();

		const opening = booted.openDialog();
		await vi.waitFor(() => {
			expect(dialogLink()).not.toBeNull();
		});
		await tick();
		expect(targets).toHaveLength(0);

		dialogLink()?.dispatchEvent(new Event('load'));
		await opening;
		expect(targets).toHaveLength(1);
		expect(booted.getConsent().activeUI).toBe('dialog');
	});

	it('opens unstyled rather than not at all when the stylesheet fails', async () => {
		registerDialogStyles([DIALOG_CSS]);
		const { targets } = registerRecordingAdapter();
		renderBanner();
		const booted = start();

		const opening = booted.openDialog();
		await vi.waitFor(() => {
			expect(dialogLink()).not.toBeNull();
		});
		dialogLink()?.dispatchEvent(new Event('error'));
		await opening;

		expect(targets).toHaveLength(1);
		// Forgotten, so the next open downloads it again.
		expect(dialogLink()).toBeNull();
	});

	it('hands the stylesheet to the incoming page so the swap keeps it', async () => {
		registerDialogStyles([DIALOG_CSS]);
		registerRecordingAdapter();
		renderBanner();
		const booted = start();
		await openWithStyles(booted);

		const incoming = document.implementation.createHTMLDocument();
		document.dispatchEvent(
			Object.assign(new Event('astro:before-swap'), { newDocument: incoming })
		);

		const copies = incoming.head.querySelectorAll(
			`link[rel="stylesheet"][href="${DIALOG_CSS}"]`
		);
		expect(copies).toHaveLength(1);
	});

	it('does not copy a stylesheet the incoming page already links', async () => {
		registerDialogStyles([DIALOG_CSS]);
		registerRecordingAdapter();
		renderBanner();
		const booted = start();
		await openWithStyles(booted);

		const incoming = document.implementation.createHTMLDocument();
		incoming.head.innerHTML = `<link rel="stylesheet" href="${DIALOG_CSS}">`;
		document.dispatchEvent(
			Object.assign(new Event('astro:before-swap'), { newDocument: incoming })
		);

		expect(
			incoming.head.querySelectorAll(`link[href="${DIALOG_CSS}"]`)
		).toHaveLength(1);
	});

	it('remounts an open dialog on the page a swap brings in', async () => {
		const { destroy, targets } = registerRecordingAdapter();
		renderBanner();
		const booted = start();
		await booted.openDialog();
		const [first] = targets;

		swapPage();

		await vi.waitFor(() => {
			expect(targets).toHaveLength(2);
		});
		expect(first?.isConnected).toBe(false);
		expect(targets[1]?.isConnected).toBe(true);
		expect(destroy).toHaveBeenCalledOnce();
		expect(booted.getConsent().activeUI).toBe('dialog');
	});

	it('reopens a closed dialog on the page, not the one a swap removed', async () => {
		const { targets } = registerRecordingAdapter();
		renderBanner();
		const booted = start();
		await booted.openDialog();
		booted.closeDialog();

		swapPage();
		await tick();
		// Closed dialogs stay closed across the swap.
		expect(targets).toHaveLength(1);

		await booted.openDialog();
		expect(targets).toHaveLength(2);
		expect(targets[1]?.isConnected).toBe(true);
		expect(booted.getConsent().activeUI).toBe('dialog');
	});
});
