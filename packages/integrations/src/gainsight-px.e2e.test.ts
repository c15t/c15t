/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	clearAllScripts,
	deniedConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { gainsightPx } from './vendors/analytics/gainsight-px';
import type { GainsightPxOptions } from './vendors/analytics/gainsight-px';

type PxWindow = Window & typeof globalThis & { aptrinsic: AptrinsicStub };

interface AptrinsicStub {
	(...args: unknown[]): unknown;
	q: IArguments[];
	p: string;
	c: Record<string, unknown>;
}

const getAptrinsic = function getAptrinsic(): AptrinsicStub {
	return (window as PxWindow).aptrinsic;
};

const grantedConsents = { ...deniedConsents, measurement: true };

describe('Gainsight PX production loader contract', () => {
	registerVendorContractCleanup();

	afterEach(() => {
		Reflect.deleteProperty(window, 'aptrinsic');
		Reflect.deleteProperty(window, '__c15tGainsightPxProductKey');
		Reflect.deleteProperty(window, '__c15tGainsightPxSetup');
		Reflect.deleteProperty(globalThis, '__c15tStarted');
	});

	it('creates no PX global, loader or storage until the mapped category is granted', () => {
		const scripts = [gainsightPx({ productKey: 'AP-PRODUCT-KEY-2' })];
		const append = vi.spyOn(document.head, 'appendChild');
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, { ...deniedConsents, functionality: true });
		expect((window as PxWindow).aptrinsic).toBeUndefined();
		expect(append).not.toHaveBeenCalled();
		expect(document.cookie).not.toMatch(/apt\.(?:uid|sid)=/u);
		expect(localStorage.getItem('apt.uid')).toBeNull();
		expect(localStorage.getItem('apt.sid')).toBeNull();
		expect(sessionStorage.length).toBe(0);

		updateScripts(scripts, grantedConsents);
		expect(document.head.querySelector('script')?.src).toBe(
			'https://web-sdk.aptrinsic.com/api/aptrinsic.js?a=AP-PRODUCT-KEY-2'
		);
		expect(typeof getAptrinsic()).toBe('function');
	});

	it('never installs a blank product key through the core loader', () => {
		const scripts = [gainsightPx({ productKey: '  ' })];
		loadScripts(scripts, grantedConsents);
		expect(document.head.querySelector('script')).toBeNull();
		expect((window as PxWindow).aptrinsic).toBeUndefined();
	});

	it.each([false, true])(
		'rejects a pre-created product-key replacement and preserves consent handling, denied=%s',
		async (denied) => {
			const original = gainsightPx({ productKey: 'AP-PRECREATED-ORIGINAL-2' });
			const replacement = {
				...gainsightPx({
					productKey: 'AP-PRECREATED-REPLACEMENT-2',
					user: { id: 'replacement-user' },
				}),
			};
			const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
			const executeSdk = vi.fn((element: HTMLScriptElement) => {
				Reflect.set(window, 'aptrinsic', runtime);
				element.dispatchEvent(new Event('load'));
			});
			installHeadProbe(executeSdk);
			const kernel = createConsentKernel();
			await kernel.commands.save(grantedConsents);
			const loader = createScriptLoader({ kernel, scripts: [original] });
			try {
				await kernel.commands.save(denied ? deniedConsents : grantedConsents);
				runtime.mockClear();
				expect(() => loader.updateScripts([replacement])).toThrow(
					'cannot change productKey after the SDK has started'
				);
				expect(runtime).not.toHaveBeenCalled();
				expect(getAptrinsic()).toBe(runtime);
				await kernel.commands.save(deniedConsents);
				await kernel.commands.save(grantedConsents);
				expect(runtime.mock.calls).toEqual(
					denied
						? [['config', 'enableTag', true]]
						: [
								['config', 'enableTag', false],
								['reset'],
								['config', 'enableTag', true],
							]
				);
				expect(executeSdk).toHaveBeenCalledTimes(1);
			} finally {
				loader.dispose();
				kernel.dispose();
			}
		}
	);

	describe.each([
		{ denied: false, disposed: false },
		{ denied: true, disposed: false },
		{ denied: false, disposed: true },
		{ denied: true, disposed: true },
	])(
		'started PX config, denied=$denied, disposed=$disposed',
		({ denied, disposed }) => {
			it.each([
				{
					config: { usePOST: false },
					initialConfig: { usePOST: true },
					name: 'changed',
				},
				{
					config: undefined,
					initialConfig: { usePOST: true },
					name: 'removed',
				},
				{
					config: { usePOST: true },
					initialConfig: undefined,
					name: 'added',
				},
			])(
				'rejects $name configuration before registering a replacement',
				async ({ config, initialConfig }) => {
					const original = gainsightPx({
						config: initialConfig,
						productKey: 'AP-CONFIG-2',
						user: { id: 'original-user' },
					});
					// Build the replacement before PX starts, including spread customization.
					const replacement = {
						...gainsightPx({
							config,
							productKey: 'AP-CONFIG-2',
							user: { id: 'replacement-user' },
						}),
						anonymizeId: false,
					};
					const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
					const executeSdk = vi.fn((element: HTMLScriptElement) => {
						Reflect.set(window, 'aptrinsic', runtime);
						element.dispatchEvent(new Event('load'));
					});
					installHeadProbe(executeSdk);
					const kernel = createConsentKernel();
					await kernel.commands.save(grantedConsents);
					let loader = createScriptLoader({ kernel, scripts: [original] });
					try {
						await kernel.commands.save(
							denied ? deniedConsents : grantedConsents
						);
						if (disposed) {
							loader.dispose();
						}
						runtime.mockClear();
						expect(() => {
							if (disposed) {
								loader = createScriptLoader({ kernel, scripts: [replacement] });
							} else {
								loader.updateScripts([replacement]);
							}
						}).toThrow('cannot change config after the SDK has started');
						expect(() =>
							gainsightPx({ config, productKey: 'AP-CONFIG-2' })
						).toThrow('cannot change config after the SDK has started');
						expect(runtime).not.toHaveBeenCalled();
						if (disposed) {
							loader = createScriptLoader({ kernel, scripts: [original] });
						}
						runtime.mockClear();
						await kernel.commands.save(deniedConsents);
						await kernel.commands.save(grantedConsents);
						expect(runtime.mock.calls).toEqual([
							...(denied ? [] : [['config', 'enableTag', false], ['reset']]),
							['config', 'enableTag', true],
							['identify', { id: 'original-user' }],
						]);
						expect(executeSdk).toHaveBeenCalledTimes(1);
					} finally {
						loader.dispose();
						kernel.dispose();
					}
				}
			);
		}
	);

	it.each([false, true])(
		'rejects a loaded product-key replacement without changing the SDK, denied=%s',
		(denied) => {
			const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
			const executeSdk = vi.fn((element: HTMLScriptElement) => {
				Reflect.set(window, 'aptrinsic', runtime);
				element.dispatchEvent(new Event('load'));
			});
			installHeadProbe(executeSdk);
			const original = gainsightPx({ productKey: 'AP-ORIGINAL-2' });
			loadScripts([original], grantedConsents);
			const consents = denied ? deniedConsents : grantedConsents;
			updateScripts([original], consents);
			runtime.mockClear();
			expect(() =>
				updateScripts(
					[gainsightPx({ productKey: 'AP-REPLACEMENT-2' })],
					consents
				)
			).toThrow('cannot change productKey after the SDK has started');
			expect(runtime).not.toHaveBeenCalled();
			updateScripts([original], { ...consents, functionality: true });
			expect(runtime).not.toHaveBeenCalled();
			updateScripts([original], deniedConsents);
			updateScripts([original], grantedConsents);
			expect(runtime).toHaveBeenLastCalledWith('config', 'enableTag', true);
			expect(executeSdk).toHaveBeenCalledTimes(1);
		}
	);

	it('keeps the loaded product key after final disposal and permits same-key remounts', () => {
		const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
		const executeSdk = vi.fn((element: HTMLScriptElement) => {
			Reflect.set(window, 'aptrinsic', runtime);
			element.dispatchEvent(new Event('load'));
		});
		installHeadProbe(executeSdk);
		loadScripts(
			[gainsightPx({ productKey: 'AP-REMOUNT-ORIGINAL-2' })],
			grantedConsents
		);
		clearAllScripts();
		runtime.mockClear();
		expect(() =>
			gainsightPx({ productKey: 'AP-REMOUNT-REPLACEMENT-2' })
		).toThrow('Reload the page to switch PX products');
		expect(runtime).not.toHaveBeenCalled();
		const original = gainsightPx({ productKey: 'AP-REMOUNT-ORIGINAL-2' });
		loadScripts([original], deniedConsents);
		expect(runtime.mock.calls).toEqual([
			['config', 'enableTag', false],
			['reset'],
		]);
		updateScripts([original], grantedConsents);
		expect(runtime).toHaveBeenLastCalledWith('config', 'enableTag', true);
		expect(executeSdk).toHaveBeenCalledTimes(1);
	});

	it('rejects a different key after server startup before client hydration', () => {
		const original = gainsightPx({ productKey: 'AP-SERVER-2' });
		const start = original.serverStart?.(
			{ consents: grantedConsents, hasConsent: true, id: original.id },
			original
		);
		expect(start).toBeDefined();
		// oxlint-disable-next-line no-new-func -- Executes the generated server snippet.
		new Function(`${start?.prelude ?? ''};${start?.code}`)();
		expect(getAptrinsic().p).toBe('AP-SERVER-2');
		const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
		Reflect.set(window, 'aptrinsic', runtime);
		expect(() => gainsightPx({ productKey: 'AP-CLIENT-2' })).toThrow(
			'cannot change productKey after the SDK has started'
		);
		expect(runtime).not.toHaveBeenCalled();
		loadScripts([gainsightPx({ productKey: 'AP-SERVER-2' })], deniedConsents);
		expect(runtime.mock.calls).toEqual([
			['config', 'enableTag', false],
			['reset'],
		]);
		expect(document.head.querySelector('script')).toBeNull();
	});

	it('keeps the product key when a denied shared owner disposes after startup', async () => {
		const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
		installHeadProbe((element) => {
			expect(getAptrinsic().p).toBe('AP-SHARED-START-2');
			Reflect.set(window, 'aptrinsic', runtime);
			element.dispatchEvent(new Event('load'));
		});
		const denied = createConsentKernel();
		const granted = createConsentKernel();
		await denied.commands.save(deniedConsents);
		await granted.commands.save(grantedConsents);
		const createScript = () => gainsightPx({ productKey: 'AP-SHARED-START-2' });
		const deniedOwner = createScriptLoader({
			kernel: denied,
			scripts: [createScript()],
		});
		const grantedOwner = createScriptLoader({
			kernel: granted,
			scripts: [createScript()],
		});
		try {
			deniedOwner.dispose();
			expect(runtime).toHaveBeenLastCalledWith('config', 'enableTag', true);
			runtime.mockClear();
			expect(() => gainsightPx({ productKey: 'AP-SHARED-OTHER-2' })).toThrow(
				'cannot change productKey after the SDK has started'
			);
			expect(runtime).not.toHaveBeenCalled();
			expect(createScript()).toBeDefined();
		} finally {
			deniedOwner.dispose();
			grantedOwner.dispose();
			denied.dispose();
			granted.dispose();
		}
	});

	it('prepares the exact vendor queue and config before appending the loader', () => {
		let beforeAppend: unknown;
		installHeadProbe((element) => {
			const url = new URL(element.src);
			if (
				url.hostname !== 'web-sdk.aptrinsic.com' ||
				url.pathname !== '/api/aptrinsic.js'
			) {
				return;
			}
			const stub = getAptrinsic();
			beforeAppend = {
				c: structuredClone(stub.c),
				p: stub.p,
				q: stub.q.map((entry) => Array.from(entry)),
			};
		});
		loadScripts(
			[
				gainsightPx({
					account: { id: 'account-123' },
					config: { localStorageCookie: true },
					productKey: 'AP-PRODUCT-KEY-2',
					user: { id: 'user-123' },
				}),
			],
			grantedConsents
		);
		expect(beforeAppend).toEqual({
			c: { enableTag: true, localStorageCookie: true },
			p: 'AP-PRODUCT-KEY-2',
			q: [
				['config', 'enableTag', true],
				['identify', { id: 'user-123' }, { id: 'account-123' }],
			],
		});
	});

	it.each([false, true])(
		'executes the SDK once and forwards enable and identify on regrant, recreated=%s',
		(recreated) => {
			const user = { id: 'user-123', plan: 'paid' };
			const account = { id: 'account-123' };
			const runtime = vi.fn();
			const executeSdk = vi.fn((element: HTMLScriptElement) => {
				const stub = getAptrinsic();
				if (Object.is(stub, runtime)) {
					return;
				}
				expect(stub.p).toBe('AP-PRODUCT-KEY-2');
				expect(stub.c).toEqual({ enableTag: true, fullDomainCookie: true });
				for (const entry of stub.q) {
					runtime(...Array.from(entry));
				}
				Reflect.set(window, 'aptrinsic', runtime);
				element.dispatchEvent(new Event('load'));
			});
			installHeadProbe(executeSdk);
			const createScript = () =>
				gainsightPx({
					account,
					config: { fullDomainCookie: true },
					productKey: 'AP-PRODUCT-KEY-2',
					user,
				});
			let scripts = [createScript()];
			loadScripts(scripts, grantedConsents);
			const initial = document.head.querySelector('script');
			expect(initial).not.toBeNull();
			updateScripts(scripts, grantedConsents);
			expect(document.head.querySelectorAll('script')).toHaveLength(1);
			if (recreated) {
				for (let render = 0; render < 3; render += 1) {
					updateScripts([createScript()], grantedConsents);
				}
				scripts = [createScript()];
			}
			expect(runtime.mock.calls).toEqual([
				['config', 'enableTag', true],
				['identify', user, account],
			]);

			updateScripts(scripts, deniedConsents);
			expect(runtime.mock.calls).toEqual([
				['config', 'enableTag', true],
				['identify', user, account],
				['config', 'enableTag', false],
				['reset'],
			]);
			updateScripts(scripts, deniedConsents);
			expect(runtime).toHaveBeenCalledTimes(4);
			if (recreated) {
				scripts = [createScript()];
			}

			updateScripts(scripts, grantedConsents);
			expect(executeSdk).toHaveBeenCalledTimes(1);
			expect(document.head.querySelector('script')).toBe(initial);
			expect((window as PxWindow).aptrinsic).toBe(runtime);
			expect(runtime.mock.calls.slice(4)).toEqual([
				['config', 'enableTag', true],
				['identify', user, account],
			]);
			updateScripts(scripts, { ...grantedConsents, functionality: true });
			expect(runtime).toHaveBeenCalledTimes(6);
		}
	);

	it.each([false, true])(
		'keeps the SDK across owner disposal, original owner first=%s',
		async (originalOwner) => {
			const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
			const executeSdk = vi.fn((element: HTMLScriptElement) => {
				Reflect.set(window, 'aptrinsic', runtime);
				element.dispatchEvent(new Event('load'));
			});
			installHeadProbe(executeSdk);
			const createScript = () => gainsightPx({ productKey: 'AP-SHARED-KEY-2' });
			const kernel = createConsentKernel();
			await kernel.commands.save(grantedConsents);
			const first = createScriptLoader({ kernel, scripts: [createScript()] });
			const second = createScriptLoader({ kernel, scripts: [createScript()] });
			try {
				(originalOwner ? first : second).dispose();
				await kernel.commands.save(deniedConsents);
				expect(runtime).toHaveBeenLastCalledWith('reset');
				await kernel.commands.save(grantedConsents);
				expect(runtime).toHaveBeenLastCalledWith('config', 'enableTag', true);
				(originalOwner ? second : first).dispose();
				const third = createScriptLoader({ kernel, scripts: [createScript()] });
				try {
					expect(executeSdk).toHaveBeenCalledTimes(1);
					expect(runtime).toHaveBeenLastCalledWith('config', 'enableTag', true);
				} finally {
					third.dispose();
				}
			} finally {
				first.dispose();
				second.dispose();
				kernel.dispose();
			}
		}
	);

	it('honors a denied shared owner until that owner disposes', async () => {
		const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
		Reflect.set(window, 'aptrinsic', runtime);
		const granted = createConsentKernel();
		const denied = createConsentKernel();
		await granted.commands.save(grantedConsents);
		await denied.commands.save(deniedConsents);
		const createScript = () =>
			gainsightPx({ productKey: 'AP-SHARED-DENIED-2' });
		const first = createScriptLoader({
			kernel: granted,
			scripts: [createScript()],
		});
		const second = createScriptLoader({
			kernel: denied,
			scripts: [createScript()],
		});
		try {
			expect(runtime.mock.calls).toEqual([
				['config', 'enableTag', true],
				['config', 'enableTag', false],
				['reset'],
			]);
			first.updateScripts([createScript()]);
			expect(runtime).toHaveBeenCalledTimes(3);
			second.dispose();
			expect(runtime.mock.calls.slice(3)).toEqual([
				['config', 'enableTag', true],
			]);
			expect(document.head.querySelector('script')).toBeNull();
		} finally {
			first.dispose();
			second.dispose();
			granted.dispose();
			denied.dispose();
		}
	});

	it.each([false, true])(
		'shares equivalent clones retained before startup, original owner first=%s',
		async (originalOwner) => {
			const options = { productKey: 'AP-CLONED-OWNERS-2' };
			const scripts = [0, 1, 2].map(() => ({
				...gainsightPx(options),
				anonymizeId: false,
			}));
			const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
			const executeSdk = vi.fn((element: HTMLScriptElement) => {
				Reflect.set(window, 'aptrinsic', runtime);
				element.dispatchEvent(new Event('load'));
			});
			installHeadProbe(executeSdk);
			const kernel = createConsentKernel();
			await kernel.commands.save(grantedConsents);
			const first = createScriptLoader({
				kernel,
				scripts: scripts.slice(0, 1),
			});
			const second = createScriptLoader({
				kernel,
				scripts: scripts.slice(1, 2),
			});
			try {
				await kernel.commands.save(deniedConsents);
				expect(runtime).toHaveBeenLastCalledWith('reset');
				(originalOwner ? first : second).dispose();
				(originalOwner ? second : first).dispose();
				expect(document.head.querySelector('script')).toBeNull();
				await kernel.commands.save(grantedConsents);
				const third = createScriptLoader({ kernel, scripts: scripts.slice(2) });
				try {
					expect(executeSdk).toHaveBeenCalledTimes(1);
					expect(runtime).toHaveBeenLastCalledWith('config', 'enableTag', true);
				} finally {
					third.dispose();
				}
			} finally {
				first.dispose();
				second.dispose();
				kernel.dispose();
			}
		}
	);

	it('keeps a pending loader across freshly spread equivalent rerenders', async () => {
		const createScript = () => ({
			...gainsightPx({
				config: { usePOST: true },
				productKey: 'AP-SPREAD-RERENDER-2',
				user: { id: 'current-user' },
			}),
			anonymizeId: false,
		});
		const append = vi.spyOn(document.head, 'appendChild');
		const kernel = createConsentKernel();
		await kernel.commands.save(grantedConsents);
		const loader = createScriptLoader({ kernel, scripts: [createScript()] });
		try {
			const element = document.head.querySelector('script');
			const pending = getAptrinsic();
			for (let render = 0; render < 3; render += 1) {
				loader.updateScripts([createScript()]);
			}
			expect(document.head.querySelector('script')).toBe(element);
			expect(append).toHaveBeenCalledOnce();
			expect(getAptrinsic()).toBe(pending);
			const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
			Reflect.set(window, 'aptrinsic', runtime);
			element?.dispatchEvent(new Event('load'));
			await kernel.commands.save(deniedConsents);
			await kernel.commands.save(grantedConsents);
			expect(runtime.mock.calls).toEqual([
				['config', 'enableTag', false],
				['reset'],
				['config', 'enableTag', true],
				['identify', { id: 'current-user' }],
			]);
			expect(append).toHaveBeenCalledOnce();
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('retries a retained clone with a fresh queue when its SDK never started', () => {
		const script = {
			...gainsightPx({
				productKey: 'AP-CLONE-PENDING-2',
				user: { id: 'current' },
			}),
			anonymizeId: false,
		};
		loadScripts([script], grantedConsents);
		const previous = getAptrinsic();
		clearAllScripts();
		loadScripts([script], deniedConsents);
		expect(document.head.querySelector('script')).toBeNull();
		updateScripts([script], grantedConsents);
		expect(getAptrinsic()).not.toBe(previous);
		expect(getAptrinsic().q.map((entry) => Array.from(entry))).toEqual([
			['config', 'enableTag', true],
			['identify', { id: 'current' }],
		]);
		expect(document.head.querySelectorAll('script')).toHaveLength(1);
	});

	describe.each(['revocation', 'disposal'])(
		'pending setup after %s',
		(ending) => {
			const replacements: { name: string; options: GainsightPxOptions }[] = [
				{
					name: 'product',
					options: { productKey: 'AP-REPLACEMENT-2' },
				},
				{
					name: 'configuration',
					options: {
						config: { localStorageCookie: true },
						productKey: 'AP-PENDING-2',
					},
				},
				{
					name: 'identity',
					options: {
						account: { id: 'current-account' },
						productKey: 'AP-PENDING-2',
						user: { id: 'current-user' },
					},
				},
			];
			it.each(replacements)(
				'uses only the current $name setup before requesting the replacement',
				({ options }) => {
					const initial = gainsightPx({
						account: { id: 'previous-account' },
						config: { fullDomainCookie: true },
						productKey: 'AP-PENDING-2',
						user: { id: 'previous-user' },
					});
					loadScripts([initial], grantedConsents);
					if (ending === 'revocation') {
						updateScripts([initial], deniedConsents);
					} else {
						clearAllScripts();
					}
					const replacement = gainsightPx(options);
					loadScripts([replacement], deniedConsents);
					expect(document.head.querySelector('script')).toBeNull();
					const atAppend = vi.fn(() => {
						const stub = getAptrinsic();
						return {
							config: stub.c,
							key: stub.p,
							queue: stub.q.map((entry) => Array.from(entry)),
						};
					});
					installHeadProbe(atAppend);
					updateScripts([replacement], grantedConsents);
					expect(atAppend).toHaveBeenCalledTimes(1);
					expect(atAppend.mock.results[0]?.value).toEqual({
						config: { ...options.config, enableTag: true },
						key: options.productKey,
						queue: [
							['config', 'enableTag', true],
							...(options.user
								? [['identify', options.user, options.account]]
								: []),
						],
					});
					Reflect.set(getAptrinsic(), '__sdkBundleStarted', true);
					expect(() => gainsightPx(options)).not.toThrow();
				}
			);
		}
	);

	it.each([
		{ allow: true, cloned: false, completed: false },
		{ allow: false, cloned: false, completed: false },
		{ allow: true, cloned: true, completed: false },
		{ allow: false, cloned: true, completed: false },
		{ allow: true, cloned: false, completed: true },
		{ allow: false, cloned: false, completed: true },
		{ allow: true, cloned: true, completed: true },
		{ allow: false, cloned: true, completed: true },
	])(
		'preserves server setup during hydration, client consent=$allow, cloned=$cloned, completed=$completed',
		async ({ allow, cloned, completed }) => {
			const original = gainsightPx({
				account: { id: 'server-account', tier: 'paid' },
				config: { fullDomainCookie: true, usePOST: true },
				productKey: 'AP-SERVER-HYDRATION-2',
				user: { id: 'server-user' },
			});
			const script = cloned ? { ...original, anonymizeId: false } : original;
			const client = gainsightPx({
				// oxlint-disable-next-line sort-keys -- Equivalent SSR data may have a different property order.
				account: { tier: 'paid', id: 'server-account' },
				category: 'measurement',
				// oxlint-disable-next-line sort-keys -- Equivalent SSR data may have a different property order.
				config: { usePOST: true, fullDomainCookie: true },
				productKey: 'AP-SERVER-HYDRATION-2',
				user: { id: 'server-user' },
			});
			const start = script.serverStart?.(
				{ consents: grantedConsents, hasConsent: true, id: script.id },
				script
			);
			expect(start).toBeDefined();
			// oxlint-disable-next-line no-new-func -- Executes the generated server snippet.
			new Function(`${start?.prelude ?? ''};${start?.code}`)();
			const pending = getAptrinsic();
			const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
			if (completed) {
				Reflect.set(window, 'aptrinsic', runtime);
			}
			const element = Object.assign(document.createElement('script'), {
				__c15tConsent: true,
				__c15tDone: completed ? 'load' : undefined,
				__c15tScript: script.id,
				src: script.src,
			});
			document.head.appendChild(element);
			Reflect.set(globalThis, '__c15tStarted', { [script.id]: element });
			const kernel = createConsentKernel();
			await kernel.commands.save(allow ? grantedConsents : deniedConsents);
			const loader = createScriptLoader({
				kernel,
				scripts: [cloned ? { ...client, anonymizeId: false } : client],
			});
			try {
				expect(getAptrinsic()).toBe(completed ? runtime : pending);
				expect(pending.p).toBe('AP-SERVER-HYDRATION-2');
				expect(pending.c).toEqual({
					enableTag: true,
					fullDomainCookie: true,
					usePOST: true,
				});
				expect(window).toHaveProperty(
					'__c15tGainsightPxProductKey',
					'AP-SERVER-HYDRATION-2'
				);
				expect(document.head.querySelectorAll('script')).toHaveLength(
					allow || completed ? 1 : 0
				);
				expect(pending.q.map((entry) => Array.from(entry))).toEqual([
					['config', 'enableTag', true],
					[
						'identify',
						{ id: 'server-user' },
						{ id: 'server-account', tier: 'paid' },
					],
					...(allow || completed
						? []
						: [['config', 'enableTag', false], ['reset']]),
				]);
				expect(runtime.mock.calls).toEqual(
					completed && !allow ? [['config', 'enableTag', false], ['reset']] : []
				);
				runtime.mockClear();
				expect(() =>
					loader.updateScripts([
						gainsightPx({
							config: { fullDomainCookie: true, usePOST: true },
							productKey: 'AP-SERVER-HYDRATION-2',
							user: { id: 'updated-user' },
						}),
					])
				).not.toThrow();
				await kernel.commands.save(grantedConsents);
				const calls = completed
					? runtime.mock.calls
					: getAptrinsic().q.map((entry) => Array.from(entry));
				expect(calls.at(-1)).toEqual(['identify', { id: 'updated-user' }]);
				expect(document.head.querySelectorAll('script')).toHaveLength(
					completed ? 0 : 1
				);
			} finally {
				loader.dispose();
				kernel.dispose();
			}
		}
	);

	describe.each([
		{ allow: true, completed: false },
		{ allow: false, completed: false },
		{ allow: true, completed: true },
		{ allow: false, completed: true },
	])(
		'server setup, completed=$completed, client consent=$allow',
		({ allow, completed }) => {
			const initialOptions: GainsightPxOptions = {
				account: { id: 'server-account' },
				config: { fullDomainCookie: true },
				productKey: 'AP-SERVER-HYDRATION-2',
				user: { id: 'server-user' },
			};
			it.each<{ name: string; options: GainsightPxOptions }>([
				{
					name: 'product key',
					options: { ...initialOptions, productKey: 'AP-CLIENT-2' },
				},
				{
					name: 'configuration',
					options: { ...initialOptions, config: { localStorageCookie: true } },
				},
				{
					name: 'user',
					options: { ...initialOptions, user: { id: 'client-user' } },
				},
				{
					name: 'account',
					options: { ...initialOptions, account: { id: 'client-account' } },
				},
				{
					name: 'removed identity',
					options: {
						config: initialOptions.config,
						productKey: initialOptions.productKey,
					},
				},
				{
					name: 'loader URL',
					options: {
						...initialOptions,
						scriptUrl: 'https://proxy.example.com/px.js',
					},
				},
			])(
				'rejects a different $name before adopting the server loader',
				async ({ name, options }) => {
					// Construct the client script before the server queue exists.
					const client = { ...gainsightPx(options), anonymizeId: false };
					const server = gainsightPx(initialOptions);
					const start = server.serverStart?.(
						{ consents: grantedConsents, hasConsent: true, id: server.id },
						server
					);
					expect(start).toBeDefined();
					// oxlint-disable-next-line no-new-func -- Executes the generated server snippet.
					new Function(`${start?.prelude ?? ''};${start?.code}`)();
					const pending = getAptrinsic();
					const queued = pending.q.map((entry) => Array.from(entry));
					// A completed SDK may replace its stub and discard the setup fields.
					const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
					if (completed) {
						Reflect.set(window, 'aptrinsic', runtime);
					}
					const element = Object.assign(document.createElement('script'), {
						__c15tConsent: true,
						__c15tDone: completed ? 'load' : undefined,
						__c15tScript: server.id,
						src: server.src,
					});
					document.head.appendChild(element);
					Reflect.set(globalThis, '__c15tStarted', { [server.id]: element });
					const kernel = createConsentKernel();
					await kernel.commands.save(allow ? grantedConsents : deniedConsents);
					let loader: ReturnType<typeof createScriptLoader> | undefined;
					try {
						expect(() => {
							loader = createScriptLoader({ kernel, scripts: [client] });
						}).toThrow(
							completed && name === 'product key'
								? 'cannot change productKey after the SDK has started'
								: 'server and client options must match'
						);
						expect(getAptrinsic()).toBe(completed ? runtime : pending);
						expect(runtime).not.toHaveBeenCalled();
						expect(pending.q.map((entry) => Array.from(entry))).toEqual(queued);
						expect(element.isConnected).toBe(true);
						expect(document.head.querySelectorAll('script')).toHaveLength(1);
					} finally {
						loader?.dispose();
						kernel.dispose();
					}
				}
			);
		}
	);

	it('refreshes a pending setup in generated server startup code', () => {
		loadScripts(
			[
				gainsightPx({
					config: { fullDomainCookie: true },
					productKey: 'AP-SERVER-PREVIOUS-2',
					user: { id: 'previous-user' },
				}),
			],
			grantedConsents
		);
		clearAllScripts();
		const replacement = gainsightPx({
			productKey: 'AP-SERVER-CURRENT-2',
			user: { id: 'current-user' },
		});
		const start = replacement.serverStart?.(
			{ consents: grantedConsents, hasConsent: true, id: replacement.id },
			replacement
		);
		expect(start).toBeDefined();
		// oxlint-disable-next-line no-new-func -- Executes the generated server snippet.
		new Function(`${start?.prelude ?? ''};${start?.code}`)();
		expect(getAptrinsic().p).toBe('AP-SERVER-CURRENT-2');
		expect(getAptrinsic().c).toEqual({ enableTag: true });
		expect(getAptrinsic().q.map((entry) => Array.from(entry))).toEqual([
			['config', 'enableTag', true],
			['identify', { id: 'current-user' }],
		]);
		Reflect.set(getAptrinsic(), '__sdkBundleStarted', true);
		expect(() =>
			gainsightPx({ productKey: 'AP-SERVER-CURRENT-2' })
		).not.toThrow();
	});

	it('requests a pending SDK again after disposal when only its queue exists', () => {
		const append = vi.spyOn(document.head, 'appendChild');
		const script = gainsightPx({ productKey: 'AP-PENDING-KEY-2' });
		loadScripts([script], grantedConsents);
		const queue = getAptrinsic();
		clearAllScripts();
		loadScripts([script], deniedConsents);
		expect(getAptrinsic()).toBe(queue);
		expect(document.head.querySelector('script')).toBeNull();
		updateScripts([script], grantedConsents);
		expect(append).toHaveBeenCalledTimes(2);
		expect(document.head.querySelector('script')).not.toBeNull();
	});

	it('queues opt-out for an in-flight loader and ignores its detached load event', () => {
		const scripts = [gainsightPx({ productKey: 'AP-PRODUCT-KEY-2' })];
		loadScripts(scripts, grantedConsents);
		const initial = document.head.querySelector('script');
		updateScripts(scripts, deniedConsents);
		const queue = getAptrinsic().q.map((entry) => Array.from(entry));
		expect(queue).toEqual([
			['config', 'enableTag', true],
			['config', 'enableTag', false],
			['reset'],
		]);
		initial?.dispatchEvent(new Event('load'));
		expect(getAptrinsic().q.map((entry) => Array.from(entry))).toEqual(queue);
		expect(document.head.querySelector('script')).toBeNull();
	});

	it.each([false, true])(
		'does not execute a completed SDK again after final disposal, recreated=%s',
		(recreated) => {
			const runtime = Object.assign(vi.fn(), {
				__sdkBundleStarted: true,
				init: false,
				q: [],
			});
			const executeSdk = vi.fn((element: HTMLScriptElement) => {
				Reflect.set(window, 'aptrinsic', runtime);
				element.dispatchEvent(new Event('load'));
			});
			installHeadProbe(executeSdk);
			const createScript = () =>
				gainsightPx({
					productKey: 'AP-PRODUCT-KEY-2',
					user: { id: 'remount-user' },
				});
			let script = createScript();
			loadScripts([script], grantedConsents);
			if (recreated) {
				updateScripts([script], deniedConsents);
			}
			clearAllScripts();
			expect(document.head.querySelector('script')).toBeNull();
			if (recreated) {
				script = createScript();
			}
			runtime.mockClear();

			loadScripts([script], deniedConsents);
			expect(runtime.mock.calls).toEqual([
				['config', 'enableTag', false],
				['reset'],
			]);
			updateScripts([script], { ...deniedConsents, functionality: true });
			expect(runtime).toHaveBeenCalledTimes(2);
			updateScripts([script], grantedConsents);
			expect(executeSdk).toHaveBeenCalledTimes(1);
			expect(runtime.mock.calls.slice(2)).toEqual([
				['config', 'enableTag', true],
				['identify', { id: 'remount-user' }],
			]);
			updateScripts([script], deniedConsents);
			updateScripts([script], grantedConsents);
			expect(executeSdk).toHaveBeenCalledTimes(1);
		}
	);

	it.each([
		{ denied: false, loaded: false },
		{ denied: true, loaded: false },
		{ denied: false, loaded: true },
		{ denied: true, loaded: true },
	])(
		'reuses a retained spread clone after final disposal, denied remount=$denied, load completed=$loaded',
		({ denied, loaded }) => {
			const script = {
				...gainsightPx({
					productKey: 'AP-CLONE-2',
					user: { id: 'clone-user' },
				}),
				anonymizeId: false,
			};
			const runtime = Object.assign(vi.fn(), { __sdkBundleStarted: true });
			const executeSdk = vi.fn((element: HTMLScriptElement) => {
				Reflect.set(window, 'aptrinsic', runtime);
				if (loaded) {
					element.dispatchEvent(new Event('load'));
				}
			});
			installHeadProbe(executeSdk);
			loadScripts([script], grantedConsents);
			clearAllScripts();
			expect(document.head.querySelector('script')).toBeNull();
			runtime.mockClear();
			loadScripts([script], denied ? deniedConsents : grantedConsents);
			expect(runtime.mock.calls).toEqual(
				denied
					? [['config', 'enableTag', false], ['reset']]
					: [
							['config', 'enableTag', true],
							['identify', { id: 'clone-user' }],
						]
			);
			updateScripts([script], grantedConsents);
			expect(executeSdk).toHaveBeenCalledTimes(1);
			expect(document.head.querySelector('script')).toBeNull();
			expect(runtime.mock.calls.slice(denied ? 2 : 0)).toEqual([
				['config', 'enableTag', true],
				['identify', { id: 'clone-user' }],
			]);
		}
	);

	it('uses the overridden category for both installation and revocation', () => {
		const scripts = [
			gainsightPx({ category: 'experience', productKey: 'AP-KEY-2' }),
		];
		loadScripts(scripts, grantedConsents);
		expect((window as PxWindow).aptrinsic).toBeUndefined();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(typeof getAptrinsic()).toBe('function');
		const runtime = vi.fn();
		Reflect.set(window, 'aptrinsic', runtime);
		updateScripts(scripts, grantedConsents);
		expect(runtime).toHaveBeenCalledWith('config', 'enableTag', false);
		expect(document.head.querySelector('script')).toBeNull();
	});
});
