/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { customerIo } from './vendors/email-and-sms/customer-io';

const GLOBALS = ['cioanalytics'];
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
		const scripts = [customerIo({ writeKey: 'test-key' })];
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
			'https://cdp.customer.io/v1/analytics-js/snippet/test-key/analytics.min.js'
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
});

describe('Customer.io readiness and identity', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.cioanalytics;
		Reflect.deleteProperty(window, 'analytics');
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
		expect(Array.isArray(window.cioanalytics)).toBe(true);
		expect(window.cioanalytics?._writeKey).toBe('key/with spaces');
		expect(window.cioanalytics?._loadOptions).toEqual({
			integrations: { All: false },
		});
		expect(getLoader().src).toBe(
			'https://cdp-eu.customer.io/v1/analytics-js/snippet/key%2Fwith%20spaces/analytics.min.js'
		);
		expect(
			getLoader().getAttribute('data-global-customerio-analytics-key')
		).toBe('cioanalytics');
		expect(window.analytics).toBe(sentinel);
	});
	it('ignores old ready callbacks across revoke and regrant, including helper recreation', () => {
		const create = () => customerIo({ writeKey: 'ready-key' });
		const scripts = [create()];
		loadScripts(scripts, granted);
		const loader = getLoader();
		const runtime = {
			page: vi.fn(),
			ready: vi.fn<(callback: () => void) => void>(),
			reset: vi.fn(),
		};
		window.cioanalytics = runtime;
		loader.dispatchEvent(new Event('load'));
		expect(runtime.ready).toHaveBeenCalledTimes(1);
		expect(runtime.page).not.toHaveBeenCalled();
		updateScripts([create()], deniedConsents);
		expect(runtime.reset).toHaveBeenCalledTimes(1);
		runtime.ready.mock.calls[0]?.[0]();
		expect(runtime.page).not.toHaveBeenCalled();
		updateScripts([create()], granted);
		expect(getLoader()).toBe(loader);
		runtime.ready.mock.calls[0]?.[0]();
		expect(runtime.page).not.toHaveBeenCalled();
		runtime.ready.mock.calls[1]?.[0]();
		expect(runtime.page).toHaveBeenCalledTimes(1);
		updateScripts([create()], granted);
		expect(runtime.ready).toHaveBeenCalledTimes(2);
		expect(window.cioanalytics).toBe(runtime);
	});
	it('does not queue a page when the download finishes after withdrawal', () => {
		const scripts = [customerIo({ writeKey: 'inflight-key' })];
		loadScripts(scripts, granted);
		const loader = getLoader();
		updateScripts(scripts, deniedConsents);
		const runtime = { page: vi.fn(), ready: vi.fn(), reset: vi.fn() };
		window.cioanalytics = runtime;
		loader.dispatchEvent(new Event('load'));
		expect(runtime.page).not.toHaveBeenCalled();
		expect(runtime.ready).not.toHaveBeenCalled();
	});
});
