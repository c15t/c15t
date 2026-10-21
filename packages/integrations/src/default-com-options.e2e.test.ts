/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultComFormsSdkMock } from './__tests__/default-com-sdk';
import {
	deniedConsents,
	grantedMarketingConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import type * as DefaultCom from './vendors/analytics/default-com';

let helpers: typeof DefaultCom;
const allConsents = {
	...grantedMarketingConsents,
	functionality: true,
	measurement: true,
};

describe('Default loader options', () => {
	registerVendorContractCleanup();
	beforeEach(async () => {
		vi.resetModules();
		helpers = await import('./vendors/analytics/default-com');
	});
	afterEach(() => {
		Reflect.deleteProperty(window, '__defaultPixel__');
		Reflect.deleteProperty(window, 'DefaultPixelSDK');
	});

	it.each([
		{ category: 'measurement', name: 'defaultComPixel' },
		{ category: 'functionality', name: 'defaultComFormsSdk' },
	] as const)(
		'issue 1556: $name defaults to $category without marketing permission',
		({ name, category }) => {
			const script = helpers[name]({ publicKey: 'workspace-key' });
			expect(script.category).toBe(category);
			loadScripts([script], deniedConsents);
			expect(document.querySelector('script')).toBeNull();
			updateScripts([script], { ...deniedConsents, [category]: true });
			const element = document.querySelector('script');
			expect(element).not.toBeNull();
			const init = vi.fn();
			const setConsent = vi.fn();
			const initialConsent = {
				analytics: name === 'defaultComPixel',
				marketing: false,
			};
			expect(window.__defaultPixel__?.q).toEqual(
				name === 'defaultComPixel'
					? [['setConsent', initialConsent]]
					: undefined
			);
			if (name === 'defaultComFormsSdk') {
				window.DefaultPixelSDK = createDefaultComFormsSdkMock({
					init,
					setConsent,
				});
			} else {
				const pixel = window.__defaultPixel__;
				if (!pixel) {
					throw new Error('Expected Pixel configuration.');
				}
				pixel.setConsent = setConsent;
			}
			element?.dispatchEvent(new Event('load'));
			expect(setConsent).toHaveBeenLastCalledWith(initialConsent);
			updateScripts([script], allConsents);
			expect(setConsent).toHaveBeenLastCalledWith({
				analytics: true,
				marketing: true,
			});
			updateScripts([script], deniedConsents);
			expect(setConsent).toHaveBeenLastCalledWith({
				analytics: false,
				marketing: false,
			});
			updateScripts([script], allConsents);
			expect(setConsent).toHaveBeenLastCalledWith({
				analytics: true,
				marketing: true,
			});
			expect(document.querySelector('script')).toBe(element);
			expect(document.querySelectorAll('script')).toHaveLength(1);
			expect(init).toHaveBeenCalledTimes(name === 'defaultComFormsSdk' ? 1 : 0);
		}
	);

	it.each(['defaultComPixel', 'defaultComFormsSdk'] as const)(
		'issue 1556: %s honors a compound category override',
		(name) => {
			const script = helpers[name]({
				category: { and: ['measurement', 'functionality'] },
				publicKey: 'workspace-key',
			});
			loadScripts([script], grantedMeasurementConsents);
			expect(document.querySelector('script')).toBeNull();
			updateScripts([script], {
				...grantedMeasurementConsents,
				functionality: true,
			});
			expect(document.querySelector('script')).not.toBeNull();
		}
	);

	it('issue 1556: explicit always queues denied consent before Pixel insertion', () => {
		const beforeInsert = vi.fn();
		installHeadProbe(() => {
			beforeInsert(window.__defaultPixel__?.q);
		});
		loadScripts(
			[helpers.defaultComPixel({ loadMode: 'always', publicKey: 'key' })],
			deniedConsents
		);
		expect(beforeInsert).toHaveBeenCalledExactlyOnceWith([
			['setConsent', { analytics: false, marketing: false }],
		]);
		expect(document.querySelector('script')?.src).toBe(
			'https://handshake.default.com/index.js'
		);
	});

	it.each([deniedConsents, allConsents])(
		'always forwards the initial choice and vendor changes without replacing the loader: %j',
		async (initialConsents) => {
			const queued = ['existing', { preserved: true }];
			window.__defaultPixel__ = { q: [queued] };
			const kernel = createConsentKernel();
			await kernel.commands.save(initialConsents);
			const loader = createScriptLoader({
				kernel,
				scripts: [
					helpers.defaultComPixel({ loadMode: 'always', publicKey: 'key' }),
				],
			});
			try {
				const pixel = window.__defaultPixel__;
				const element = document.querySelector('script');
				expect(element).not.toBeNull();
				expect(pixel.q).toEqual([
					queued,
					[
						'setConsent',
						{
							analytics: initialConsents.measurement,
							marketing: initialConsents.marketing,
						},
					],
				]);
				const setConsent = vi.fn();
				pixel.setConsent = setConsent;
				element?.dispatchEvent(new Event('load'));
				await kernel.commands.save(allConsents, {
					vendors: { 'default-com': true },
				});
				expect(setConsent).toHaveBeenLastCalledWith({
					analytics: true,
					marketing: true,
				});
				await kernel.commands.save(allConsents, {
					vendors: { 'default-com': false },
				});
				expect(setConsent).toHaveBeenLastCalledWith({
					analytics: false,
					marketing: false,
				});
				await kernel.commands.save(allConsents, {
					vendors: { 'default-com': true },
				});
				expect(setConsent).toHaveBeenLastCalledWith({
					analytics: true,
					marketing: true,
				});
				await kernel.commands.save(deniedConsents);
				expect(setConsent).toHaveBeenLastCalledWith({
					analytics: false,
					marketing: false,
				});
				expect(pixel.setConsent).toBe(setConsent);
				expect(document.querySelector('script')).toBe(element);
				expect(document.querySelectorAll('script')).toHaveLength(1);
			} finally {
				loader.dispose();
				kernel.dispose();
			}
		}
	);

	it('initializes a late Forms SDK only after functionality is regranted', () => {
		const scripts = [helpers.defaultComFormsSdk({ publicKey: 'key' })];
		const functionality = { ...deniedConsents, functionality: true };
		loadScripts(scripts, functionality);
		const element = document.querySelector('script');
		expect(element).not.toBeNull();
		updateScripts(scripts, deniedConsents);
		const init = vi.fn();
		const setConsent = vi.fn();
		window.DefaultPixelSDK = createDefaultComFormsSdkMock({ init, setConsent });
		element?.dispatchEvent(new Event('load'));
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: false,
			marketing: false,
		});
		expect(init).not.toHaveBeenCalled();
		updateScripts(scripts, functionality);
		expect(setConsent.mock.invocationCallOrder[0]).toBeLessThan(
			init.mock.invocationCallOrder[0] ?? 0
		);
		expect(init).toHaveBeenCalledOnce();
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, functionality);
		expect(init).toHaveBeenCalledOnce();
		expect(document.querySelector('script')).toBe(element);
	});

	it.each(['pixel-first', 'sdk-first', 'always-first'] as const)(
		'keeps alternative helper claims across different consent gates: %s',
		(order) => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			const pixel = helpers.defaultComPixel({
				loadMode: order === 'always-first' ? 'always' : 'after-consent',
				publicKey: 'key',
			});
			const sdk = helpers.defaultComFormsSdk({ publicKey: 'key' });
			const scripts = order === 'sdk-first' ? [sdk, pixel] : [pixel, sdk];
			loadScripts(scripts, deniedConsents);
			updateScripts(scripts, {
				...deniedConsents,
				functionality: order === 'sdk-first',
				measurement: order !== 'sdk-first',
			});
			const first = document.querySelector('script[src]');
			expect(first?.getAttribute('src')).toBe(
				order === 'sdk-first'
					? 'https://handshake.default.com/sdk.js'
					: 'https://handshake.default.com/index.js'
			);
			updateScripts(scripts, allConsents);
			expect(error).toHaveBeenCalledOnce();
			expect(document.querySelectorAll('script[src]')).toHaveLength(1);
			expect(
				document.querySelector(
					'script[type="application/x-c15t-default-conflict"]'
				)
			).not.toBeNull();
			updateScripts(scripts, deniedConsents);
			updateScripts(scripts, allConsents);
			expect(document.querySelector('script[src]')).toBe(first);
			expect(error).toHaveBeenCalledOnce();
		}
	);

	it.each(['defaultComPixel', 'defaultComFormsSdk'] as const)(
		'%s skips invalid required keys through the core loader',
		(name) => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			for (const publicKey of ['', ' ', undefined, null, {}, 42]) {
				loadScripts(
					[helpers[name]({ publicKey: publicKey as string })],
					allConsents
				);
				expect(document.querySelector('script')).toBeNull();
				expect(window.__defaultPixel__).toBeUndefined();
				expect(window.DefaultPixelSDK).toBeUndefined();
			}
			expect(error).toHaveBeenCalledTimes(6);
			expect(error).toHaveBeenLastCalledWith(
				`${name}: missing or invalid publicKey. The script will not load.`
			);
		}
	);

	it.each(['defaultComPixel', 'defaultComFormsSdk'] as const)(
		'%s defers setup to browser lifecycle callbacks',
		(name) => {
			const script = helpers[name]({ publicKey: 'workspace-key' });
			expect(script.serverStart).toBeUndefined();
			expect(script.vendor).toBe('default-com');
			expect(script.id).toBe(
				name === 'defaultComPixel' ? 'default-com' : 'default-com-forms-sdk'
			);
		}
	);

	it.each([
		{ endpoint: '  ', expected: {} },
		{
			endpoint: ' https://proxy.example.com/default ',
			expected: { endpoint: 'https://proxy.example.com/default' },
		},
	])(
		'forwards SDK configuration for endpoint $endpoint after consent',
		({ endpoint, expected }) => {
			const schedulerOrigins = ['https://schedule.example.com'];
			const autoDisplayScheduler = { loader: false, target: '#scheduler' };
			loadScripts(
				[
					helpers.defaultComFormsSdk({
						autoDisplayScheduler,
						endpoint,
						publicKey: ' workspace-key ',
						schedulerOrigins,
					}),
				],
				allConsents
			);
			const init = vi.fn();
			window.DefaultPixelSDK = createDefaultComFormsSdkMock({ init });
			document.querySelector('script')?.dispatchEvent(new Event('load'));
			expect(init).toHaveBeenCalledOnce();
			const options: unknown = init.mock.calls[0]?.[0];
			expect(options).toEqual({
				autoDisplayScheduler,
				publicKey: 'workspace-key',
				schedulerOrigins,
				...expected,
			});
		}
	);
	it.each(['defaultComPixel', 'defaultComFormsSdk'] as const)(
		'%s preserves an HTMLElement scheduler target through loading',
		(name) => {
			const target = document.createElement('div');
			const autoDisplayScheduler = { loader: true, target };
			loadScripts(
				[helpers[name]({ autoDisplayScheduler, publicKey: 'workspace-key' })],
				allConsents
			);
			const init = vi.fn<DefaultCom.DefaultComFormsSdkClient['init']>();
			if (name === 'defaultComFormsSdk') {
				window.DefaultPixelSDK = createDefaultComFormsSdkMock({ init });
			}
			document.querySelector('script')?.dispatchEvent(new Event('load'));
			const forwarded =
				name === 'defaultComPixel'
					? window.__defaultPixel__?.autoDisplayScheduler
					: init.mock.calls[0]?.[0].autoDisplayScheduler;
			expect(forwarded).toEqual(autoDisplayScheduler);
			expect(typeof forwarded === 'object' && forwarded.target).toBe(target);
			expect(init).toHaveBeenCalledTimes(name === 'defaultComPixel' ? 0 : 1);
		}
	);

	it.each(['defaultComPixel', 'defaultComFormsSdk'] as const)(
		'%s follows the shared vendor permission through the production kernel',
		async (name) => {
			const kernel = createConsentKernel();
			const loader = createScriptLoader({
				kernel,
				scripts: [helpers[name]({ publicKey: 'workspace-key' })],
			});
			try {
				await kernel.commands.save(allConsents, {
					vendors: { 'default-com': false },
				});
				expect(document.querySelector('script')).toBeNull();
				expect(window.__defaultPixel__).toBeUndefined();
				expect(window.DefaultPixelSDK).toBeUndefined();
				await kernel.commands.save(allConsents, {
					vendors: { 'default-com': true },
				});
				const element = document.querySelector('script');
				expect(element).not.toBeNull();
				expect('__defaultPixel__' in window).toBe(name === 'defaultComPixel');
				const setConsent = vi.fn();
				if (name === 'defaultComPixel') {
					const pixel = window.__defaultPixel__;
					if (!pixel) {
						throw new Error('Expected the permitted Pixel bootstrap.');
					}
					pixel.setConsent = setConsent;
				} else {
					window.DefaultPixelSDK = createDefaultComFormsSdkMock({ setConsent });
				}
				element?.dispatchEvent(new Event('load'));
				await kernel.commands.save(allConsents, {
					vendors: { 'default-com': false },
				});
				expect(setConsent).toHaveBeenLastCalledWith({
					analytics: false,
					marketing: false,
				});
				expect(document.querySelector('script')).toBe(element);
			} finally {
				loader.dispose();
				kernel.dispose();
			}
		}
	);
});
