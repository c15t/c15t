/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import {
	afterEach,
	assert,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';

import {
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import {
	CUSTOMER_IO_METHODS,
	customerIo,
} from './vendors/email-and-sms/customer-io';

const GLOBALS = ['cioanalytics'];
type CustomerIoTestQueue = [string, ...unknown[]][] & {
	[Method in (typeof CUSTOMER_IO_METHODS)[number]]: (
		...args: unknown[]
	) => CustomerIoTestQueue;
} & { _cdn?: string; _loadOptions?: unknown; _writeKey?: string };
const cio = () =>
	window.cioanalytics as unknown as CustomerIoTestQueue | undefined;
const granted = { ...deniedConsents, marketing: true };
const unrelated = { ...deniedConsents, measurement: true };
const getLoader = (): HTMLScriptElement => {
	const loader = document.querySelector<HTMLScriptElement>('script[src]');
	if (!loader) {
		throw new Error('Expected Customer.io loader');
	}
	return loader;
};

describe('Customer.io consent loader', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const name of GLOBALS) {
			Reflect.deleteProperty(window, name);
		}
		localStorage.clear();
		sessionStorage.clear();
	});
	it('creates no vendor requests, globals or storage before mapped consent', () => {
		const scripts = [
			customerIo({
				cdnUrl: 'https://analytics.example.com/',
				writeKey: 'test-key',
			}),
		];
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
			'https://analytics.example.com/v1/analytics-js/snippet/test-key/analytics.min.js'
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
			customerIo({ category: 'experience', writeKey: 'test-key' }),
		];
		loadScripts(scripts, granted);
		expect(document.querySelector('script[src]')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).toBeDefined();
	});
	it.each([
		{ cdnUrl: undefined, expected: 'https://cdp.customer.io', region: 'us' },
		{ cdnUrl: '', expected: 'https://cdp-eu.customer.io', region: 'eu' },
		{ cdnUrl: '   ', expected: 'https://cdp.customer.io', region: 'us' },
		{
			cdnUrl: ' https://ANALYTICS.example.com:443/// ',
			expected: 'https://analytics.example.com',
			region: 'eu',
		},
	] as const)('uses CDN origin $expected for the loader and SDK', (options) => {
		loadScripts([customerIo({ ...options, writeKey: 'proxy-key' })], granted);
		expect(cio()?._cdn).toBe(options.expected);
		expect(getLoader().src).toBe(
			`${options.expected}/v1/analytics-js/snippet/proxy-key/analytics.min.js`
		);
	});
	it('keeps the CDN origin and collection options when overriding the initial loader', () => {
		const loadOptions = {
			integrations: {
				'Customer.io Data Pipelines': {
					apiHost: 'collect.example.com/v1',
					protocol: 'https',
				},
			},
		};
		loadScripts(
			[
				customerIo({
					cdnUrl: 'https://assets.example.com/',
					loadOptions,
					scriptUrl: ' https://assets.example.com/custom-loader.js ',
					writeKey: 'proxy-key',
				}),
			],
			granted
		);
		expect(getLoader().src).toBe('https://assets.example.com/custom-loader.js');
		expect(cio()?._cdn).toBe('https://assets.example.com');
		expect(cio()?._loadOptions).toEqual({
			...loadOptions,
			initialPageview: false,
		});
	});
});

describe('Customer.io loading and identity', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		Reflect.deleteProperty(window, 'cioanalytics');
		Reflect.deleteProperty(window, 'analytics');
	});
	it('chains calls on the same queue while the SDK download is pending', () => {
		const scripts = [customerIo({ writeKey: 'chain-key' })];
		loadScripts(scripts, deniedConsents);
		expect(cio()).toBeUndefined();
		updateScripts(scripts, unrelated);
		expect(cio()).toBeUndefined();
		updateScripts(scripts, granted);

		const queue = cio();
		assert(queue && Array.isArray(queue));
		expect(queue).not.toHaveProperty('user');
		const traits = { email: 'person@example.com' };
		const properties = { plan: 'pro' };
		const result = queue
			.identify('customer-123', traits)
			.track('Signed up', properties);

		expect(result).toBe(queue);
		expect([...queue]).toEqual([
			['identify', 'customer-123', traits],
			['track', 'Signed up', properties],
		]);
		for (const method of CUSTOMER_IO_METHODS) {
			const stub = queue[method] as (...args: unknown[]) => CustomerIoTestQueue;
			expect(stub('argument')).toBe(queue);
			expect(queue.at(-1)).toEqual([method, 'argument']);
		}
	});
	it('preserves loaded runtime methods when consent installs the bootstrap', () => {
		const runtime = {
			identify: vi.fn(),
			page: vi.fn(),
			reset: vi.fn(),
			track: vi.fn(),
		};
		Reflect.set(window, 'cioanalytics', runtime);
		loadScripts([customerIo({ writeKey: 'existing-runtime-key' })], granted);

		expect(cio()).toBe(runtime);
		expect(cio()?.identify).toBe(runtime.identify);
		expect(cio()?.track).toBe(runtime.track);
		expect(runtime).not.toHaveProperty('_writeKey');
		expect(runtime).not.toHaveProperty('_cdn');
		expect(runtime).not.toHaveProperty('_loadOptions');
	});
	it('seeds the array, namespace attribute, region and loader options', () => {
		const sentinel = { unrelated: true };
		Reflect.set(window, 'analytics', sentinel);
		const scripts = [
			customerIo({
				loadOptions: { integrations: { All: false } },
				region: 'eu',
				writeKey: 'key/with spaces',
			}),
		];
		loadScripts(scripts, granted);
		expect(Array.isArray(cio())).toBe(true);
		expect(cio()?._writeKey).toBe('key/with spaces');
		expect(cio()?._cdn).toBe('https://cdp-eu.customer.io');
		expect(cio()?._loadOptions).toEqual({
			initialPageview: false,
			integrations: { All: false },
		});
		expect(getLoader().src).toBe(
			'https://cdp-eu.customer.io/v1/analytics-js/snippet/key%2Fwith%20spaces/analytics.min.js'
		);
		expect(
			getLoader().getAttribute('data-global-customerio-analytics-key')
		).toBe('cioanalytics');
		expect((window as Window & { analytics?: unknown }).analytics).toBe(
			sentinel
		);
	});
	it('starts a destination that needs page before it can become ready', () => {
		const scripts = [customerIo({ writeKey: 'page-initializes-destination' })];
		loadScripts(scripts, granted);
		let initialized = false;
		const waiting: (() => void)[] = [];
		const runtime = {
			page: vi.fn(() => {
				initialized = true;
				for (const onReady of waiting.splice(0)) {
					onReady();
				}
			}),
			ready(onReady: () => void) {
				if (initialized) {
					onReady();
				} else {
					waiting.push(onReady);
				}
			},
		};
		Reflect.set(window, 'cioanalytics', runtime);
		getLoader().dispatchEvent(new Event('load'));
		expect(initialized).toBe(true);
		expect(runtime.page).toHaveBeenCalledTimes(1);
	});
	it.each([undefined, false, true])(
		'owns each page with initialPageview %s even when a destination never becomes ready',
		(initialPageview) => {
			const loadOptions = Object.freeze({
				initialPageview,
				integrations: { All: false },
			});
			const create = () => customerIo({ loadOptions, writeKey: 'ready-key' });
			const scripts = [create()];
			loadScripts(scripts, granted);
			const loader = getLoader();
			expect(cio()?._loadOptions).toEqual({
				initialPageview: false,
				integrations: { All: false },
			});
			expect(loadOptions).toEqual({
				initialPageview,
				integrations: { All: false },
			});
			const runtime = {
				page: vi.fn(),
				ready: vi.fn<(callback: () => void) => void>(),
				reset: vi.fn(),
			};
			Reflect.set(window, 'cioanalytics', runtime);
			loader.dispatchEvent(new Event('load'));
			expect(runtime.page).toHaveBeenCalledTimes(1);
			loader.dispatchEvent(new Event('load'));
			expect(runtime.page).toHaveBeenCalledTimes(1);
			updateScripts([create()], deniedConsents);
			expect(runtime.reset).toHaveBeenCalledTimes(1);
			expect(runtime.page).toHaveBeenCalledTimes(1);
			updateScripts([create()], granted);
			expect(getLoader()).toBe(loader);
			expect(runtime.page).toHaveBeenCalledTimes(2);
			updateScripts([create()], granted);
			expect(runtime.page).toHaveBeenCalledTimes(2);
			expect(runtime.ready).not.toHaveBeenCalled();
			expect(cio()).toBe(runtime);
		}
	);
	it.each([undefined, false, true])(
		'does not queue a page after withdrawal with initialPageview %s',
		(initialPageview) => {
			const scripts = [
				customerIo({
					loadOptions: { initialPageview },
					writeKey: 'inflight-key',
				}),
			];
			loadScripts(scripts, granted);
			const loader = getLoader();
			updateScripts(scripts, deniedConsents);
			const runtime = { page: vi.fn(), ready: vi.fn(), reset: vi.fn() };
			Reflect.set(window, 'cioanalytics', runtime);
			loader.dispatchEvent(new Event('load'));
			expect(runtime.page).not.toHaveBeenCalled();
			expect(runtime.ready).not.toHaveBeenCalled();
			updateScripts(scripts, granted);
			expect(getLoader()).toBe(loader);
			expect(runtime.page).toHaveBeenCalledTimes(1);
		}
	);
	it.each([undefined, false, true])(
		'cancels a disposed load with initialPageview %s',
		(initialPageview) => {
			loadScripts(
				[
					customerIo({
						loadOptions: { initialPageview },
						writeKey: 'disposed-key',
					}),
				],
				granted
			);
			const loader = getLoader();
			updateScripts([], granted);
			const runtime = { page: vi.fn(), ready: vi.fn() };
			Reflect.set(window, 'cioanalytics', runtime);
			loader.dispatchEvent(new Event('load'));
			expect(loader.isConnected).toBe(false);
			expect(runtime.page).not.toHaveBeenCalled();
		}
	);
	it('shares one page across owners and waits for every owner to regrant', () => {
		const firstKernel = createConsentKernel();
		const secondKernel = createConsentKernel();
		void firstKernel.commands.save(granted);
		void secondKernel.commands.save(granted);
		const first = createScriptLoader({
			kernel: firstKernel,
			scripts: [customerIo({ writeKey: 'shared-key' })],
		});
		const second = createScriptLoader({
			kernel: secondKernel,
			scripts: [customerIo({ writeKey: 'shared-key' })],
		});
		try {
			const loader = getLoader();
			const runtime = { page: vi.fn(), ready: vi.fn(), reset: vi.fn() };
			Reflect.set(window, 'cioanalytics', runtime);
			loader.dispatchEvent(new Event('load'));
			expect(runtime.page).toHaveBeenCalledTimes(1);
			void firstKernel.commands.save(deniedConsents);
			void secondKernel.commands.save(deniedConsents);
			expect(runtime.reset).toHaveBeenCalledTimes(1);
			void firstKernel.commands.save(granted);
			expect(runtime.page).toHaveBeenCalledTimes(1);
			void secondKernel.commands.save(granted);
			expect(runtime.page).toHaveBeenCalledTimes(2);
			first.dispose();
			expect(loader.isConnected).toBe(true);
			expect(runtime.page).toHaveBeenCalledTimes(2);
			expect(document.querySelectorAll('script[src]')).toHaveLength(1);
		} finally {
			first.dispose();
			second.dispose();
			firstKernel.dispose();
			secondKernel.dispose();
		}
	});
});
