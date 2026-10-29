/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import type { activeCampaignTracking as ActiveCampaignTracking } from './vendors/email-and-sms/activecampaign';

let activeCampaignTracking: typeof ActiveCampaignTracking;

beforeEach(async () => {
	// Node 25+ replaces jsdom's storage globals with its own Web Storage.
	vi.stubGlobal('localStorage', jsdom.window.localStorage);
	vi.stubGlobal('sessionStorage', jsdom.window.sessionStorage);
	vi.resetModules();
	({ activeCampaignTracking } =
		await import('./vendors/email-and-sms/activecampaign'));
});

afterEach(() => {
	for (const name of [
		'visitorGlobalObjectAlias',
		'visitorGlobalObject',
		'vgo',
	]) {
		Reflect.deleteProperty(window, name);
	}
	vi.unstubAllGlobals();
});

const GLOBALS = ['pgo', 'prismGlobalObjectAlias'];
const granted = { ...deniedConsents, marketing: true };
const unrelated = { ...deniedConsents, measurement: true };
const getLoader = (): HTMLScriptElement => {
	const loader = document.querySelector<HTMLScriptElement>('script[src]');
	if (!loader) {
		throw new Error('Expected ActiveCampaign loader');
	}
	return loader;
};

describe('ActiveCampaign consent loader', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const name of GLOBALS) {
			Reflect.deleteProperty(window, name);
		}
		localStorage.clear();
		sessionStorage.clear();
	});
	it('creates no vendor requests, globals or storage before mapped consent', () => {
		const scripts = [activeCampaignTracking({ accountId: '123456' })];
		const cookies = document.cookie;
		const local = { ...localStorage };
		const session = { ...sessionStorage };
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, unrelated);
		expect(document.querySelector('script[src]')).toBeNull();
		for (const name of GLOBALS) {
			expect(
				(window as unknown as Record<string, unknown>)[name]
			).toBeUndefined();
		}
		expect(document.cookie).toBe(cookies);
		expect({ ...localStorage }).toEqual(local);
		expect({ ...sessionStorage }).toEqual(session);
		updateScripts(scripts, granted);
		const first = getLoader();
		expect(first.src).toBe(
			'https://diffuser-cdn.app-us1.com/diffuser/diffuser.js'
		);
		updateScripts(scripts, granted);
		expect(getLoader()).toBe(first);
		updateScripts(scripts, deniedConsents);
		expect(first.isConnected).toBe(true);
		updateScripts(scripts, granted);
		expect(getLoader()).toBe(first);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
	});
	it('honors an overridden category', () => {
		const scripts = [
			activeCampaignTracking({ accountId: '123456', category: 'experience' }),
		];
		loadScripts(scripts, granted);
		expect(document.querySelector('script[src]')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).toBeDefined();
	});
});

describe('ActiveCampaign tracking lifecycle', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.pgo;
		delete window.prismGlobalObjectAlias;
	});
	it('starts disabled and requires reload before reactivating after withdrawal', async () => {
		const scripts = [
			activeCampaignTracking({
				accountId: '123456',
				email: ' person@example.com ',
			}),
		];
		loadScripts(scripts, granted);
		expect(window.pgo?.q?.map((args) => Array.from(args))).toEqual([
			['setAccount', '123456'],
			['setTrackByDefault', false],
		]);
		expect(window.pgo?.l).toEqual(expect.any(Number));
		const loader = getLoader();
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		expect(pgo.mock.calls).toEqual([
			['setEmail', 'person@example.com'],
			['process', 'allowTracking'],
		]);
		updateScripts(scripts, granted);
		expect(pgo).toHaveBeenCalledTimes(2);
		updateScripts(scripts, deniedConsents);
		await Promise.resolve();
		expect(pgo.mock.calls.at(-1)).toEqual(['process', 'allowTracking']);
		updateScripts(scripts, granted);
		await Promise.resolve();
		expect(getLoader()).toBe(loader);
		expect(pgo.mock.calls.filter(([name]) => name === 'process')).toEqual([
			['process', 'allowTracking'],
		]);
	});
	it('never enables a download completed after withdrawal', () => {
		const scripts = [
			activeCampaignTracking({
				accountId: '123456',
				email: 'person@example.com',
			}),
		];
		loadScripts(scripts, granted);
		const loader = getLoader();
		updateScripts(scripts, deniedConsents);
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		expect(pgo).not.toHaveBeenCalled();
	});
});

describe('ActiveCampaign helper recreation', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.pgo;
		delete window.prismGlobalObjectAlias;
	});
	it('retains a settled withdrawal when the helper is called again', async () => {
		const create = () =>
			activeCampaignTracking({ accountId: 'recreated-account' });
		const scripts = [create()];
		loadScripts(scripts, granted);
		const pgo = vi.fn();
		window.pgo = pgo;
		getLoader().dispatchEvent(new Event('load'));
		updateScripts([create()], deniedConsents);
		await Promise.resolve();
		updateScripts([create()], granted);
		await Promise.resolve();
		expect(pgo.mock.calls.filter(([name]) => name === 'process')).toEqual([
			['process', 'allowTracking'],
		]);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
	});
	it('updates email after sign-in without replacing the SDK or tracking the page again', async () => {
		loadScripts([activeCampaignTracking({ accountId: '123456' })], granted);
		const loader = getLoader();
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		updateScripts(
			[
				activeCampaignTracking({
					accountId: '123456',
					email: 'person@example.com',
				}),
			],
			granted
		);
		await Promise.resolve();
		expect(getLoader()).toBe(loader);
		expect(pgo.mock.calls).toEqual([
			['process', 'allowTracking'],
			['setEmail', 'person@example.com'],
		]);
	});
	it('keeps activation across remounts and normalized email changes', async () => {
		loadScripts([activeCampaignTracking({ accountId: 123456 })], granted);
		const loader = getLoader();
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		updateScripts([], granted);
		await Promise.resolve();
		updateScripts([activeCampaignTracking({ accountId: 123456 })], granted);
		await Promise.resolve();
		for (const email of [
			' person@example.com ',
			'person@example.com',
			'next@example.com',
			undefined,
			'  ',
		]) {
			updateScripts(
				[
					activeCampaignTracking({
						accountId: ' 123456 ',
						category: 'marketing',
						email,
						scriptUrl: ` ${loader.src} `,
					}),
				],
				granted
			);
			// Each identity change must settle before the next registration update.
			// oxlint-disable-next-line no-await-in-loop
			await Promise.resolve();
			expect(getLoader()).toBe(loader);
		}
		expect(pgo.mock.calls).toEqual([
			['process', 'allowTracking'],
			['setEmail', 'person@example.com'],
			['setEmail', 'next@example.com'],
			['setEmail', ''],
		]);
	});
	it('uses the latest email when an unchanged download completes', async () => {
		loadScripts(
			[
				activeCampaignTracking({
					accountId: '123456',
					email: 'old@example.com',
				}),
			],
			granted
		);
		const loader = getLoader();
		updateScripts(
			[
				activeCampaignTracking({
					accountId: '123456',
					email: 'new@example.com',
				}),
			],
			granted
		);
		await Promise.resolve();
		expect(getLoader()).toBe(loader);
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		loader.dispatchEvent(new Event('load'));
		expect(pgo.mock.calls).toEqual([
			['setEmail', 'new@example.com'],
			['process', 'allowTracking'],
		]);
	});
	it('requires reload after a running helper changes to a denied category', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		loadScripts(
			[
				activeCampaignTracking({
					accountId: '123456',
					email: 'person@example.com',
				}),
			],
			granted
		);
		const loader = getLoader();
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		updateScripts(
			[activeCampaignTracking({ accountId: '123456', category: 'experience' })],
			granted
		);
		await Promise.resolve();
		expect(error).toHaveBeenCalledWith(
			expect.stringContaining('reload the page')
		);
		expect(pgo.mock.calls.filter(([name]) => name === 'setEmail')).toHaveLength(
			1
		);
		updateScripts(
			[activeCampaignTracking({ accountId: '123456', category: 'experience' })],
			{ ...granted, experience: true }
		);
		await Promise.resolve();
		expect(getLoader()).toBe(loader);
		expect(pgo.mock.calls).toEqual([
			['setEmail', 'person@example.com'],
			['process', 'allowTracking'],
		]);
	});
	it.each([
		{ accountId: 'different-account' },
		{ accountId: '123456', scriptUrl: 'https://example.com/other-sdk.js' },
	])('rejects mounted configuration changes: %s', async (options) => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		loadScripts([activeCampaignTracking({ accountId: '123456' })], granted);
		const loader = getLoader();
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		updateScripts([activeCampaignTracking(options)], granted);
		await Promise.resolve();
		expect(getLoader()).toBe(loader);
		expect(pgo.mock.calls).toEqual([['process', 'allowTracking']]);
		expect(error).toHaveBeenCalledWith(
			expect.stringContaining('requires a new page')
		);
		updateScripts(
			[
				activeCampaignTracking({
					accountId: '123456',
					email: 'restored@example.com',
				}),
			],
			granted
		);
		await Promise.resolve();
		expect(pgo.mock.calls).toEqual([
			['process', 'allowTracking'],
			['setEmail', 'restored@example.com'],
		]);
	});
	it('rejects a foreign dispatcher when a loaded SDK is adopted after an ownerless gap', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		loadScripts(
			[
				activeCampaignTracking({
					accountId: '123456',
					email: 'old@example.com',
				}),
			],
			granted
		);
		const loader = getLoader();
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		expect(pgo.mock.calls).toEqual([
			['setEmail', 'old@example.com'],
			['process', 'allowTracking'],
		]);
		updateScripts([], granted);
		await Promise.resolve();
		const foreign = vi.fn();
		window.pgo = foreign;
		updateScripts(
			[
				activeCampaignTracking({
					accountId: '123456',
					email: 'new@example.com',
				}),
			],
			granted
		);
		await Promise.resolve();
		expect(foreign).not.toHaveBeenCalled();
		expect(pgo).toHaveBeenCalledTimes(2);
		expect(error).toHaveBeenCalledWith(
			'activeCampaignTracking: tracker ownership was lost; reload the page'
		);
		expect(window.pgo).toBe(foreign);
		expect(getLoader()).toBe(loader);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
	});
	it('ignores an ownerless late load and reuses it on remount', async () => {
		loadScripts(
			[
				activeCampaignTracking({
					accountId: '123456',
					email: 'old@example.com',
				}),
			],
			granted
		);
		const loader = getLoader();
		updateScripts([], granted);
		await Promise.resolve();
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		expect(pgo).not.toHaveBeenCalled();
		updateScripts(
			[
				activeCampaignTracking({
					accountId: '123456',
					email: 'new@example.com',
				}),
			],
			granted
		);
		await Promise.resolve();
		expect(getLoader()).toBe(loader);
		expect(pgo.mock.calls).toEqual([
			['setEmail', 'new@example.com'],
			['process', 'allowTracking'],
		]);
	});
	it('never retries a failed SDK or enables it on a stale load event', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		loadScripts([activeCampaignTracking({ accountId: '123456' })], granted);
		const loader = getLoader();
		loader.dispatchEvent(new Event('error'));
		const pgo = vi.fn();
		window.pgo = pgo;
		loader.dispatchEvent(new Event('load'));
		updateScripts(
			[
				activeCampaignTracking({
					accountId: '123456',
					email: 'person@example.com',
				}),
			],
			granted
		);
		await Promise.resolve();
		expect(pgo).not.toHaveBeenCalled();
		expect(getLoader()).toBe(loader);
	});
	it('does not adopt an unmanaged tracker', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const pgo = vi.fn();
		window.pgo = pgo;
		loadScripts([activeCampaignTracking({ accountId: '123456' })], granted);
		expect(document.querySelector('script[src]')).toBeNull();
		expect(window.pgo).toBe(pgo);
		expect(pgo).not.toHaveBeenCalled();
	});
	it('does not duplicate a pending unmanaged SDK tag', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const original = document.createElement('script');
		original.src = 'https://diffuser-cdn.app-us1.com/diffuser/diffuser.js';
		document.head.append(original);
		loadScripts([activeCampaignTracking({ accountId: '123456' })], granted);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
		expect(getLoader()).toBe(original);
		expect(window.pgo).toBeUndefined();
	});
	it.each(['visitorGlobalObjectAlias', 'visitorGlobalObject'])(
		'refuses the unmanaged vendor global %s',
		(name) => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const legacyWindow = window as Window & {
				visitorGlobalObjectAlias?: unknown;
				visitorGlobalObject?: unknown;
				vgo?: unknown;
			};
			const value = name === 'visitorGlobalObjectAlias' ? 'vgo' : {};
			const legacy = vi.fn();
			Reflect.set(window, name, value);
			Reflect.set(window, 'vgo', legacy);
			loadScripts([activeCampaignTracking({ accountId: '123456' })], granted);
			expect(document.querySelector('script[src]')).toBeNull();
			expect(
				legacyWindow[name as 'visitorGlobalObjectAlias' | 'visitorGlobalObject']
			).toBe(value);
			expect(legacyWindow.vgo).toBe(legacy);
			expect(window.pgo).toBeUndefined();
			expect(window.prismGlobalObjectAlias).toBeUndefined();
			expect(legacy).not.toHaveBeenCalled();
		}
	);
	it.each([undefined, 'script-nonce'])(
		'preserves provider nonce and per-script precedence: %s',
		(nonce) => {
			const script = {
				...activeCampaignTracking({ accountId: '123456' }),
				attributes: { 'data-tracker': 'activecampaign' },
				nonce,
				target: 'body' as const,
			};
			loadScripts([script], granted, { nonce: 'provider-nonce' });
			const loader = getLoader();
			expect(loader.nonce).toBe(nonce ?? 'provider-nonce');
			expect(loader.parentElement).toBe(document.body);
			expect(loader.getAttribute('data-tracker')).toBe('activecampaign');
		}
	);
	it.each(['load', 'error'] as const)(
		'delivers physical %s callbacks with the real element',
		(completion) => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const script = activeCampaignTracking({ accountId: '123456' });
			const onLoad = vi.fn(script.onLoad);
			const onError = vi.fn(script.onError);
			loadScripts([{ ...script, onError, onLoad }], granted);
			const loader = getLoader();
			expect(onLoad).not.toHaveBeenCalled();
			expect(onError).not.toHaveBeenCalled();
			window.pgo = vi.fn();
			loader.dispatchEvent(new Event(completion));
			const called = completion === 'load' ? onLoad : onError;
			const untouched = completion === 'load' ? onError : onLoad;
			expect(called).toHaveBeenCalledOnce();
			expect(called.mock.calls[0]?.[0].element).toBe(loader);
			expect(untouched).not.toHaveBeenCalled();
			expect(called.mock.calls[0]?.[0].error instanceof Error).toBe(
				completion === 'error'
			);
		}
	);
});

describe('ActiveCampaign registration ownership', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.pgo;
		delete window.prismGlobalObjectAlias;
	});
	it('starts after a denied shared owner grants, without a premature load', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const denied = createConsentKernel();
		const allowed = createConsentKernel();
		await denied.commands.save(deniedConsents);
		await allowed.commands.save(granted);
		const first = createScriptLoader({
			kernel: denied,
			scripts: [activeCampaignTracking({ accountId: '123456' })],
		});
		const second = createScriptLoader({
			kernel: allowed,
			scripts: [activeCampaignTracking({ accountId: '123456' })],
		});
		try {
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(document.querySelector('script[src]')).toBeNull();
			await denied.commands.save(granted);
			expect(document.querySelector('script')?.getAttribute('src')).toBe(
				'https://diffuser-cdn.app-us1.com/diffuser/diffuser.js'
			);
			expect(error).not.toHaveBeenCalled();
		} finally {
			first.dispose();
			second.dispose();
			denied.dispose();
			allowed.dispose();
		}
	});
	it('requires reload after another lifecycle callback interrupts its initial mount', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const kernel = createConsentKernel();
		await kernel.commands.save(granted);
		const loader = createScriptLoader({ kernel, scripts: [] });
		const script = activeCampaignTracking({ accountId: '123456' });
		let abandoned: HTMLScriptElement | undefined;
		try {
			loader.updateScripts([
				{
					...script,
					onBeforeLoad(info) {
						abandoned = info.element;
						script.onBeforeLoad?.(info);
					},
				},
				{
					callbackOnly: true,
					category: 'necessary',
					id: 'interrupt-initial-mount',
					onBeforeLoad() {
						loader.updateScripts([
							activeCampaignTracking({ accountId: '123456' }),
						]);
					},
				},
			]);
			await Promise.resolve();
			expect(abandoned?.isConnected).toBe(false);
			expect(document.querySelector('script[src]')).toBeNull();
			expect(error).toHaveBeenCalledWith(
				expect.stringContaining('reload the page')
			);
			const pgo = vi.fn();
			window.pgo = pgo;
			abandoned?.dispatchEvent(new Event('load'));
			expect(pgo).not.toHaveBeenCalled();
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});
	it('starts the remaining granted owner after an initial denied owner is disposed', async () => {
		const first = createConsentKernel();
		const second = createConsentKernel();
		await first.commands.save(deniedConsents);
		await second.commands.save(granted);
		const create = () => activeCampaignTracking({ accountId: '123456' });
		const firstLoader = createScriptLoader({
			kernel: first,
			scripts: [create()],
		});
		const secondLoader = createScriptLoader({
			kernel: second,
			scripts: [create()],
		});
		try {
			expect(document.querySelector('script[src]')).toBeNull();
			firstLoader.dispose();
			await Promise.resolve();
			const loader = getLoader();
			const pgo = vi.fn();
			window.pgo = pgo;
			loader.dispatchEvent(new Event('load'));
			expect(pgo.mock.calls).toEqual([['process', 'allowTracking']]);
		} finally {
			firstLoader.dispose();
			secondLoader.dispose();
			first.dispose();
			second.dispose();
		}
	});
	it('requires all registrations to consent and retains a settled denial', async () => {
		const first = createConsentKernel();
		const second = createConsentKernel();
		await first.commands.save(deniedConsents);
		await second.commands.save(deniedConsents);
		const create = () => activeCampaignTracking({ accountId: '123456' });
		const firstLoader = createScriptLoader({
			kernel: first,
			scripts: [create()],
		});
		const secondLoader = createScriptLoader({
			kernel: second,
			scripts: [create()],
		});
		try {
			await first.commands.save(granted);
			expect(document.querySelector('script[src]')).toBeNull();
			await second.commands.save(granted);
			const loader = getLoader();
			const pgo = vi.fn();
			window.pgo = pgo;
			loader.dispatchEvent(new Event('load'));
			expect(pgo.mock.calls).toEqual([['process', 'allowTracking']]);
			await second.commands.save(deniedConsents);
			await Promise.resolve();
			expect(pgo.mock.calls.at(-1)).toEqual(['process', 'allowTracking']);
			secondLoader.dispose();
			await Promise.resolve();
			expect(getLoader()).toBe(loader);
			expect(pgo.mock.calls.at(-1)).toEqual(['process', 'allowTracking']);
			firstLoader.dispose();
			await Promise.resolve();
			expect(pgo.mock.calls.at(-1)).toEqual(['process', 'allowTracking']);
			expect(loader.isConnected).toBe(true);
			expect(pgo).toHaveBeenCalledOnce();
		} finally {
			firstLoader.dispose();
			secondLoader.dispose();
			first.dispose();
			second.dispose();
		}
	});
	it('blocks conflicting contact identities until the conflicting owner leaves', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const first = createConsentKernel();
		const second = createConsentKernel();
		await first.commands.save(granted);
		await second.commands.save(granted);
		const firstLoader = createScriptLoader({
			kernel: first,
			scripts: [
				activeCampaignTracking({
					accountId: '123456',
					email: 'first@example.com',
				}),
			],
		});
		const loader = getLoader();
		const secondLoader = createScriptLoader({
			kernel: second,
			scripts: [
				activeCampaignTracking({
					accountId: '123456',
					email: 'second@example.com',
				}),
			],
		});
		try {
			const pgo = vi.fn();
			window.pgo = pgo;
			loader.dispatchEvent(new Event('load'));
			expect(pgo).not.toHaveBeenCalled();
			secondLoader.dispose();
			await Promise.resolve();
			expect(pgo.mock.calls).toEqual([
				['setEmail', 'first@example.com'],
				['process', 'allowTracking'],
			]);
			expect(getLoader()).toBe(loader);
		} finally {
			firstLoader.dispose();
			secondLoader.dispose();
			first.dispose();
			second.dispose();
		}
	});
});
