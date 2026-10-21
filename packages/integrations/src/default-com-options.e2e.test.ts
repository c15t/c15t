/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultComFormsSdkMock } from './__tests__/default-com-sdk';
import {
	grantedMarketingConsents,
	loadScripts,
	registerVendorContractCleanup,
} from './e2e-test-utils';
import type * as DefaultCom from './vendors/analytics/default-com';

let helpers: typeof DefaultCom;

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

	it.each(['defaultComPixel', 'defaultComFormsSdk'] as const)(
		'%s skips invalid required keys through the core loader',
		(name) => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			for (const publicKey of ['', ' ', undefined, null, {}, 42]) {
				loadScripts(
					[helpers[name]({ publicKey: publicKey as string })],
					grantedMarketingConsents
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
				grantedMarketingConsents
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
				grantedMarketingConsents
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
			expect(forwarded).toBe(autoDisplayScheduler);
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
				await kernel.commands.save(grantedMarketingConsents, {
					vendors: { 'default-com': false },
				});
				expect(document.querySelector('script')).toBeNull();
				expect(window.__defaultPixel__).toBeUndefined();
				expect(window.DefaultPixelSDK).toBeUndefined();
				await kernel.commands.save(grantedMarketingConsents, {
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
				await kernel.commands.save(grantedMarketingConsents, {
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
