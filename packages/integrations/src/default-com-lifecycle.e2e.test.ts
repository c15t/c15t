/** @vitest-environment jsdom */
import type { ScriptCallbackInfo } from '@c15t/core';
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
const defaultComPixel = (options: DefaultCom.DefaultComPixelOptions) =>
	helpers.defaultComPixel({ category: 'marketing', ...options });
const defaultComFormsSdk = (options: DefaultCom.DefaultComFormsSdkOptions) =>
	helpers.defaultComFormsSdk({ category: 'marketing', ...options });

const fullConsent = {
	...grantedMarketingConsents,
	measurement: true,
};

const getLoader = (): HTMLScriptElement => {
	const element = document.querySelector('script');
	if (!element) {
		throw new Error('Expected a Default loader.');
	}
	return element;
};

const callbackInfo = (
	overrides: Partial<ScriptCallbackInfo> = {}
): ScriptCallbackInfo => ({
	consents: fullConsent,
	element: getLoader(),
	elementId: 'default-com',
	hasConsent: true,
	id: 'default-com',
	...overrides,
});

describe('Default explicit marketing gate lifecycle', () => {
	registerVendorContractCleanup();
	beforeEach(async () => {
		// Each test represents a fresh page, including its per-page loader claim.
		vi.resetModules();
		helpers = await import('./vendors/analytics/default-com');
	});
	afterEach(() => {
		Reflect.deleteProperty(window, '__defaultPixel__');
		Reflect.deleteProperty(window, 'DefaultPixelSDK');
	});

	it.each([
		{
			create: defaultComPixel,
			id: 'default-com',
			url: 'https://handshake.default.com/index.js',
		},
		{
			create: defaultComFormsSdk,
			id: 'default-com-forms-sdk',
			url: 'https://handshake.default.com/sdk.js',
		},
	])('$id loads only after marketing consent', ({ create, id, url }) => {
		const script = create({ publicKey: 'workspace-key' });
		const scripts = [script];
		expect(script).toMatchObject({
			category: 'marketing',
			id,
			persistAfterConsentRevoked: true,
			vendor: 'default-com',
		});
		loadScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedMeasurementConsents);
		updateScripts(scripts, {
			...grantedMeasurementConsents,
			functionality: true,
		});
		expect(document.querySelector('script')).toBeNull();
		expect('__defaultPixel__' in window).toBe(false);
		expect('DefaultPixelSDK' in window).toBe(false);
		updateScripts(scripts, grantedMarketingConsents);
		expect(getLoader().src).toBe(url);
	});

	it.each([
		{ create: defaultComPixel, id: 'default-com' },
		{ create: defaultComFormsSdk, id: 'default-com-forms-sdk' },
	])(
		'$id falls back for blank script URLs and trims overrides',
		({ create }) => {
			expect(create({ publicKey: 'key', scriptUrl: ' \t ' }).src).toBe(
				create({ publicKey: 'key' }).src
			);
			expect(
				create({
					publicKey: 'key',
					scriptUrl: ' https://proxy.example.com/default.js ',
				}).src
			).toBe('https://proxy.example.com/default.js');
		}
	);

	it('queues the complete Pixel consent tuple before inserting its loader', () => {
		const append = vi.fn();
		installHeadProbe(() => {
			append(window.__defaultPixel__?.q);
			expect(window.__defaultPixel__).toMatchObject({
				autoDisplayScheduler: { loader: true, target: '#calendar' },
				key: 'workspace-key',
				q: [['setConsent', { analytics: false, marketing: true }]],
				schedulerOrigins: ['https://book.default.com'],
			});
		});
		loadScripts(
			[
				defaultComPixel({
					autoDisplayScheduler: { loader: true, target: '#calendar' },
					publicKey: ' workspace-key ',
					schedulerOrigins: ['https://book.default.com'],
				}),
			],
			grantedMarketingConsents
		);
		expect(append).toHaveBeenCalledOnce();
	});

	it('starts returning Pixel visitors with their current grants', () => {
		loadScripts([defaultComPixel({ publicKey: 'workspace-key' })], fullConsent);
		expect(window.__defaultPixel__?.q).toEqual([
			['setConsent', { analytics: true, marketing: true }],
		]);
	});

	it('preserves the live Pixel setter and loader through revoke and regrant', () => {
		const script = defaultComPixel({ publicKey: 'workspace-key' });
		const scripts = [script];
		loadScripts(scripts, fullConsent);
		const element = getLoader();
		const config = window.__defaultPixel__;
		if (!config) {
			throw new Error('Expected the Pixel bootstrap.');
		}
		const setConsent = vi.fn();
		config.q = [];
		config.setConsent = setConsent;
		element.dispatchEvent(new Event('load'));
		updateScripts(scripts, grantedMarketingConsents);
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: false,
			marketing: true,
		});
		updateScripts(scripts, grantedMeasurementConsents);
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: false,
			marketing: false,
		});
		updateScripts(scripts, fullConsent);
		expect(config.setConsent).toBe(setConsent);
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: true,
			marketing: true,
		});
		expect(getLoader()).toBe(element);
		expect(document.querySelectorAll('script')).toHaveLength(1);
		expect(config.q).toEqual([]);
	});

	it.each([
		{ publicKey: 'other-workspace' },
		{ schedulerOrigins: ['https://other.default.com'] },
		{ autoDisplayScheduler: false },
		{ autoDisplayScheduler: { loader: true, target: '#other' } },
		{ autoDisplayScheduler: { loader: false, target: '#calendar' } },
		{ scriptUrl: 'https://proxy.example.com/pixel.js' },
	])('rejects pre-created live Pixel changes: %j', (changed) => {
		const options: DefaultCom.DefaultComPixelOptions = {
			autoDisplayScheduler: { loader: true, target: '#calendar' },
			publicKey: 'workspace-key',
			schedulerOrigins: ['https://book.default.com'],
		};
		const initial = defaultComPixel(options);
		const replacement = defaultComPixel({ ...options, ...changed });
		loadScripts([initial], fullConsent);
		const element = getLoader();
		element.dispatchEvent(new Event('load'));
		const config = window.__defaultPixel__;
		const setConsent = vi.fn();
		if (!config) {
			throw new Error('Expected the Pixel bootstrap.');
		}
		config.setConsent = setConsent;
		expect(() => updateScripts([replacement], fullConsent)).toThrow(
			'Reload the page to change Default Pixel configuration'
		);
		expect(window.__defaultPixel__).toBe(config);
		expect(config.key).toBe('workspace-key');
		expect(config.schedulerOrigins).toEqual(['https://book.default.com']);
		expect(config.autoDisplayScheduler).toEqual({
			loader: true,
			target: '#calendar',
		});
		expect(getLoader()).toBe(element);
		expect(setConsent).not.toHaveBeenCalled();
		updateScripts([initial], grantedMeasurementConsents);
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: false,
			marketing: false,
		});
	});

	it.each([false, true])(
		'rejects changes while Pixel is downloading, alwaysLoad=%s',
		(alwaysLoad) => {
			const options: DefaultCom.DefaultComPixelOptions = {
				loadMode: alwaysLoad ? 'always' : 'after-consent',
				publicKey: 'workspace-key',
			};
			const initial = defaultComPixel(options);
			const replacement = defaultComPixel({
				...options,
				publicKey: 'other-workspace',
			});
			const consents = alwaysLoad ? deniedConsents : fullConsent;
			loadScripts([initial], consents);
			const element = getLoader();
			expect(() => updateScripts([replacement], consents)).toThrow(
				'Reload the page to change Default Pixel configuration'
			);
			expect(getLoader()).toBe(element);
			expect(window.__defaultPixel__?.key).toBe('workspace-key');
		}
	);

	it('rejects newly created Pixel settings after startup and removal', () => {
		const script = defaultComPixel({ publicKey: 'workspace-key' });
		loadScripts([script], fullConsent);
		expect(() => defaultComPixel({ publicKey: 'other-workspace' })).toThrow(
			'Reload the page to change Default Pixel configuration'
		);
		updateScripts([], fullConsent);
		expect(() => defaultComPixel({ publicKey: 'other-workspace' })).toThrow(
			'Reload the page to change Default Pixel configuration'
		);
	});

	it('allows changing Pixel settings before the first permitted load', () => {
		loadScripts(
			[defaultComPixel({ publicKey: 'first-workspace' })],
			deniedConsents
		);
		const replacement = defaultComPixel({ publicKey: 'next-workspace' });
		updateScripts([replacement], fullConsent);
		expect(window.__defaultPixel__?.key).toBe('next-workspace');
	});

	it('retains equivalent Pixel settings while changing consent gates', () => {
		const target = document.createElement('div');
		const options = {
			autoDisplayScheduler: { target },
			publicKey: ' workspace-key ',
			schedulerOrigins: ['https://book.default.com'],
		};
		loadScripts([defaultComPixel(options)], fullConsent);
		const element = getLoader();
		element.dispatchEvent(new Event('load'));
		const setConsent = vi.fn();
		if (!window.__defaultPixel__) {
			throw new Error('Expected the Pixel bootstrap.');
		}
		window.__defaultPixel__.setConsent = setConsent;
		const replacement = defaultComPixel({
			...options,
			autoDisplayScheduler: { loader: false, target },
			category: 'measurement',
			publicKey: 'workspace-key',
			scriptUrl: ' https://handshake.default.com/index.js ',
		});
		updateScripts([replacement], grantedMarketingConsents);
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: false,
			marketing: false,
		});
		updateScripts([replacement], fullConsent);
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: true,
			marketing: true,
		});
		expect(getLoader()).toBe(element);
	});

	it('snapshots caller-owned Pixel settings before registration', () => {
		const options = {
			autoDisplayScheduler: { loader: true, target: '#calendar' },
			publicKey: 'workspace-key',
			schedulerOrigins: ['https://book.default.com'],
		};
		const script = defaultComPixel(options);
		options.schedulerOrigins[0] = 'https://other.default.com';
		options.autoDisplayScheduler.target = '#other';
		loadScripts([script], fullConsent);
		expect(window.__defaultPixel__?.schedulerOrigins).toEqual([
			'https://book.default.com',
		]);
		expect(window.__defaultPixel__?.autoDisplayScheduler).toEqual({
			loader: true,
			target: '#calendar',
		});
	});

	it('queues Pixel withdrawal during an in-flight download', () => {
		const scripts = [defaultComPixel({ publicKey: 'workspace-key' })];
		loadScripts(scripts, fullConsent);
		const element = getLoader();
		updateScripts(scripts, grantedMeasurementConsents);
		expect(window.__defaultPixel__?.q).toEqual([
			['setConsent', { analytics: true, marketing: true }],
			['setConsent', { analytics: false, marketing: false }],
		]);
		const setConsent = vi.fn();
		const config = window.__defaultPixel__;
		if (!config) {
			throw new Error('Expected the Pixel bootstrap.');
		}
		config.setConsent = setConsent;
		element.dispatchEvent(new Event('load'));
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: false,
			marketing: false,
		});
	});

	it('keeps an initially denied Forms SDK owner in the consent aggregate', async () => {
		const setConsent = vi.fn();
		const denied = createConsentKernel();
		const allowed = createConsentKernel();
		await denied.commands.save(deniedConsents);
		await allowed.commands.save(grantedMarketingConsents);
		const first = createScriptLoader({
			kernel: denied,
			scripts: [defaultComFormsSdk({ publicKey: 'workspace-key' })],
		});
		const second = createScriptLoader({
			kernel: allowed,
			scripts: [defaultComFormsSdk({ publicKey: 'workspace-key' })],
		});
		try {
			window.DefaultPixelSDK = createDefaultComFormsSdkMock({ setConsent });
			getLoader().dispatchEvent(new Event('load'));
			expect(setConsent).toHaveBeenLastCalledWith({
				analytics: false,
				marketing: false,
			});
			await denied.commands.save(grantedMarketingConsents);
			expect(setConsent).toHaveBeenLastCalledWith({
				analytics: false,
				marketing: true,
			});
		} finally {
			first.dispose();
			second.dispose();
			denied.dispose();
			allowed.dispose();
		}
	});

	it('keeps a revoked retained Forms SDK owner denied after later consent changes', async () => {
		const setConsent = vi.fn();
		const first = createConsentKernel();
		const second = createConsentKernel();
		await first.commands.save(grantedMarketingConsents);
		await second.commands.save(grantedMarketingConsents);
		const loaders = [first, second].map((kernel) =>
			createScriptLoader({
				kernel,
				scripts: [defaultComFormsSdk({ publicKey: 'workspace-key' })],
			})
		);
		try {
			window.DefaultPixelSDK = createDefaultComFormsSdkMock({ setConsent });
			getLoader().dispatchEvent(new Event('load'));
			await first.commands.save(deniedConsents);
			expect(setConsent).toHaveBeenLastCalledWith({
				analytics: false,
				marketing: false,
			});
			await first.commands.save({ ...deniedConsents, measurement: true });
			expect(setConsent).toHaveBeenLastCalledWith({
				analytics: false,
				marketing: false,
			});
		} finally {
			for (const loader of loaders) {
				loader.dispose();
			}
			first.dispose();
			second.dispose();
		}
	});

	it('snapshots a caller-owned Forms SDK display object before init', () => {
		const init = vi.fn();
		const autoDisplayScheduler = { loader: true, target: '#calendar' };
		const scripts = [
			defaultComFormsSdk({ autoDisplayScheduler, publicKey: 'workspace-key' }),
		];
		loadScripts(scripts, grantedMarketingConsents);
		autoDisplayScheduler.target = '#other';
		window.DefaultPixelSDK = createDefaultComFormsSdkMock({ init });
		getLoader().dispatchEvent(new Event('load'));
		expect(init).toHaveBeenCalledWith(
			expect.objectContaining({
				autoDisplayScheduler: { loader: true, target: '#calendar' },
			})
		);
	});

	it('readopts the loaded Forms SDK after its registration is removed', () => {
		const init = vi.fn();
		const setConsent = vi.fn();
		loadScripts(
			[defaultComFormsSdk({ publicKey: 'workspace-key' })],
			grantedMarketingConsents
		);
		const element = getLoader();
		window.DefaultPixelSDK = createDefaultComFormsSdkMock({ init, setConsent });
		element.dispatchEvent(new Event('load'));
		expect(init).toHaveBeenCalledOnce();
		updateScripts([], grantedMarketingConsents);
		updateScripts(
			[defaultComFormsSdk({ publicKey: 'workspace-key' })],
			grantedMarketingConsents
		);
		expect(document.querySelectorAll('script')).toHaveLength(1);
		expect(getLoader()).toBe(element);
		expect(init).toHaveBeenCalledOnce();
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: false,
			marketing: true,
		});
	});

	it('rejects a changed Forms SDK URL after the SDK is inserted', () => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const init = vi.fn();
		const setConsent = vi.fn();
		loadScripts(
			[defaultComFormsSdk({ publicKey: 'workspace-key' })],
			grantedMarketingConsents
		);
		const element = getLoader();
		window.DefaultPixelSDK = createDefaultComFormsSdkMock({ init, setConsent });
		element.dispatchEvent(new Event('load'));
		updateScripts(
			[
				defaultComFormsSdk({
					publicKey: 'workspace-key',
					scriptUrl: 'https://proxy.example.com/sdk.js',
				}),
			],
			grantedMarketingConsents
		);
		expect(document.querySelectorAll('script')).toHaveLength(1);
		expect(getLoader()).toBe(element);
		expect(init).toHaveBeenCalledOnce();
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: false,
			marketing: false,
		});
		expect(error).toHaveBeenCalledWith(
			'defaultComFormsSdk: Reload the page to change the Forms SDK URL.'
		);
	});

	it('blocks a new loader for a changed Forms SDK URL', () => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		loadScripts(
			[defaultComFormsSdk({ publicKey: 'workspace-key' })],
			grantedMarketingConsents
		);
		// Without a connected element to adopt, core inserts a new loader.
		getLoader().remove();
		updateScripts(
			[
				defaultComFormsSdk({
					publicKey: 'workspace-key',
					scriptUrl: 'https://proxy.example.com/sdk.js',
				}),
			],
			grantedMarketingConsents
		);
		expect(getLoader().getAttribute('src')).toBeNull();
		expect(getLoader().type).toBe('application/x-c15t-default-conflict');
		expect(error).toHaveBeenCalledWith(
			'defaultComFormsSdk: Reload the page to change the Forms SDK URL.'
		);
	});

	it('snapshots caller-owned Forms SDK scheduler origins before init', () => {
		const init = vi.fn();
		const schedulerOrigins = ['https://book.default.com'];
		const scripts = [
			defaultComFormsSdk({ publicKey: 'workspace-key', schedulerOrigins }),
		];
		loadScripts(scripts, grantedMarketingConsents);
		schedulerOrigins[0] = 'https://other.default.com';
		window.DefaultPixelSDK = createDefaultComFormsSdkMock({ init });
		getLoader().dispatchEvent(new Event('load'));
		expect(init).toHaveBeenCalledWith(
			expect.objectContaining({
				schedulerOrigins: ['https://book.default.com'],
			})
		);
	});

	it('applies SDK consent before init without creating Pixel configuration', () => {
		const events: unknown[] = [];
		const scripts = [
			defaultComFormsSdk({
				autoDisplayScheduler: false,
				endpoint: ' https://proxy.example.com/default ',
				publicKey: ' workspace-key ',
				schedulerOrigins: ['https://book.default.com'],
			}),
		];
		loadScripts(scripts, grantedMarketingConsents);
		expect('__defaultPixel__' in window).toBe(false);
		window.DefaultPixelSDK = createDefaultComFormsSdkMock({
			init: (options) => events.push(['init', options]),
			setConsent: (consent) => events.push(['setConsent', consent]),
		});
		getLoader().dispatchEvent(new Event('load'));
		expect(events).toEqual([
			['setConsent', { analytics: false, marketing: true }],
			[
				'init',
				{
					autoDisplayScheduler: false,
					endpoint: 'https://proxy.example.com/default',
					publicKey: 'workspace-key',
					schedulerOrigins: ['https://book.default.com'],
				},
			],
		]);
		expect('__defaultPixel__' in window).toBe(false);
	});

	it('does not initialize an SDK whose download completes while denied', () => {
		const scripts = [defaultComFormsSdk({ publicKey: 'workspace-key' })];
		loadScripts(scripts, fullConsent);
		const element = getLoader();
		updateScripts(scripts, grantedMeasurementConsents);
		const init = vi.fn();
		const setConsent = vi.fn();
		window.DefaultPixelSDK = createDefaultComFormsSdkMock({ init, setConsent });
		element.dispatchEvent(new Event('load'));
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: false,
			marketing: false,
		});
		expect(init).not.toHaveBeenCalled();
		updateScripts(scripts, fullConsent);
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: true,
			marketing: true,
		});
		expect(init).toHaveBeenCalledOnce();
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, fullConsent);
		expect(init).toHaveBeenCalledOnce();
		expect(getLoader()).toBe(element);
		expect(document.querySelectorAll('script')).toHaveLength(1);
	});

	it('does not initialize the same SDK twice when helper options are recreated', () => {
		const init = vi.fn();
		const setConsent = vi.fn();
		loadScripts(
			[defaultComFormsSdk({ publicKey: 'workspace-key' })],
			fullConsent
		);
		window.DefaultPixelSDK = createDefaultComFormsSdkMock({ init, setConsent });
		getLoader().dispatchEvent(new Event('load'));
		updateScripts(
			[defaultComFormsSdk({ publicKey: 'workspace-key' })],
			fullConsent
		);
		expect(init).toHaveBeenCalledOnce();
	});

	it.each([
		{ create: defaultComPixel, id: 'default-com' },
		{ create: defaultComFormsSdk, id: 'default-com-forms-sdk' },
	])('$id forwards vendor denial as two false values', ({ create }) => {
		const script = create({ publicKey: 'workspace-key' });
		loadScripts([script], fullConsent);
		const setConsent = vi.fn();
		if (script.id === 'default-com') {
			const config = window.__defaultPixel__;
			if (!config) {
				throw new Error('Expected the Pixel bootstrap.');
			}
			config.setConsent = setConsent;
		} else {
			window.DefaultPixelSDK = createDefaultComFormsSdkMock({ setConsent });
			getLoader().dispatchEvent(new Event('load'));
		}
		script.onConsentChange?.(
			callbackInfo({
				hasConsent: true,
				id: script.id,
				vendor: { granted: false, id: 'default-com' },
			})
		);
		expect(setConsent).toHaveBeenLastCalledWith({
			analytics: false,
			marketing: false,
		});
	});

	it.each(['pixel-first', 'sdk-first'])(
		'blocks the conflicting loader before insertion for %s',
		(order) => {
			const error = vi
				.spyOn(console, 'error')
				.mockImplementation(() => undefined);
			const pixel = defaultComPixel({ publicKey: 'workspace-key' });
			const sdk = defaultComFormsSdk({ publicKey: 'workspace-key' });
			const scripts = order === 'pixel-first' ? [pixel, sdk] : [sdk, pixel];
			const inserted: { src: string | null; type: string }[] = [];
			const appendChild = document.head.appendChild.bind(document.head);
			vi.spyOn(document.head, 'appendChild').mockImplementation(
				(node: Node) => {
					const elements =
						node instanceof DocumentFragment
							? [...node.querySelectorAll('script')]
							: [node];
					for (const element of elements) {
						if (element instanceof HTMLScriptElement) {
							inserted.push({
								src: element.getAttribute('src'),
								type: element.type,
							});
						}
					}
					return appendChild(node);
				}
			);
			loadScripts(scripts, deniedConsents);
			updateScripts(scripts, grantedMeasurementConsents);
			expect(inserted).toEqual([]);
			expect('__defaultPixel__' in window).toBe(false);
			expect('DefaultPixelSDK' in window).toBe(false);
			updateScripts(scripts, grantedMarketingConsents);
			const expectedUrl =
				order === 'pixel-first'
					? 'https://handshake.default.com/index.js'
					: 'https://handshake.default.com/sdk.js';
			expect(inserted).toEqual([
				{ src: expectedUrl, type: '' },
				{ src: null, type: 'application/x-c15t-default-conflict' },
			]);
			expect(error).toHaveBeenCalledOnce();
			const blocked = document.querySelector<HTMLScriptElement>(
				'script[type="application/x-c15t-default-conflict"]'
			);
			const init = vi.fn();
			const setConsent = vi.fn();
			window.DefaultPixelSDK = createDefaultComFormsSdkMock({
				init,
				setConsent,
			});
			blocked?.dispatchEvent(new Event('load'));
			expect(init).not.toHaveBeenCalled();
			expect(setConsent).not.toHaveBeenCalled();
			expect('__defaultPixel__' in window).toBe(order === 'pixel-first');
			updateScripts(scripts, deniedConsents);
			updateScripts(scripts, fullConsent);
			expect(inserted).toHaveLength(2);
			expect(document.querySelectorAll('script[src]')).toHaveLength(1);
		}
	);

	it('blocks an SDK loader when Pixel configuration already exists', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const config = { key: 'existing-key', q: [['existing']] };
		window.__defaultPixel__ = config;
		loadScripts(
			[defaultComFormsSdk({ publicKey: 'workspace-key' })],
			fullConsent
		);
		expect(getLoader().getAttribute('src')).toBeNull();
		expect(getLoader().type).toBe('application/x-c15t-default-conflict');
		expect(window.__defaultPixel__).toBe(config);
		expect(config).toEqual({ key: 'existing-key', q: [['existing']] });
	});

	it('blocks a Pixel loader when a Forms SDK global already exists', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const sdk = createDefaultComFormsSdkMock();
		window.DefaultPixelSDK = sdk;
		loadScripts([defaultComPixel({ publicKey: 'workspace-key' })], fullConsent);
		expect(getLoader().getAttribute('src')).toBeNull();
		expect(getLoader().type).toBe('application/x-c15t-default-conflict');
		expect('__defaultPixel__' in window).toBe(false);
		expect(window.DefaultPixelSDK).toBe(sdk);
	});

	it.each(['pixel-first', 'sdk-first'])(
		'keeps the page claim when the first helper is removed for %s',
		(order) => {
			vi.spyOn(console, 'error').mockImplementation(() => undefined);
			const first =
				order === 'pixel-first'
					? defaultComPixel({ publicKey: 'workspace-key' })
					: defaultComFormsSdk({ publicKey: 'workspace-key' });
			const second =
				order === 'pixel-first'
					? defaultComFormsSdk({ publicKey: 'workspace-key' })
					: defaultComPixel({ publicKey: 'workspace-key' });
			loadScripts([first], fullConsent);
			updateScripts([], fullConsent);
			updateScripts([second], fullConsent);
			// The removed Forms SDK stays loaded for the page; the Pixel stays blocked.
			expect(
				[...document.querySelectorAll('script[src]')].map((s) => s.src)
			).toEqual(
				order === 'sdk-first' ? ['https://handshake.default.com/sdk.js'] : []
			);
			expect(document.querySelector('script:not([src])')?.type).toBe(
				'application/x-c15t-default-conflict'
			);
		}
	);
});
