/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { pendo } from './vendors/analytics/pendo';

const GLOBALS = ['pendo'];
const granted = { ...deniedConsents, measurement: true };
const unrelated = { ...deniedConsents, marketing: true };
const getLoader = (): HTMLScriptElement => {
	const loader = document.querySelector<HTMLScriptElement>('script[src]');
	if (!loader) {
		throw new Error('Expected Pendo loader');
	}
	return loader;
};

describe('Pendo consent loader', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		for (const name of GLOBALS) {
			Reflect.deleteProperty(window, name);
		}
		localStorage.clear();
		sessionStorage.clear();
	});
	it('creates no vendor requests, globals or storage before mapped consent', () => {
		const scripts = [pendo({ apiKey: 'YOUR_API_KEY' })];
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
			'https://cdn.pendo.io/agent/static/YOUR_API_KEY/pendo.js'
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
		const scripts = [pendo({ apiKey: 'YOUR_API_KEY', category: 'experience' })];
		loadScripts(scripts, granted);
		expect(document.querySelector('script[src]')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).toBeDefined();
	});
});

describe('Pendo event lifecycle', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		delete window.pendo;
	});
	it('initializes once, preserves metadata and resumes the same identity', async () => {
		const create = () =>
			pendo({
				account: { id: 'account' },
				apiKey: 'lifecycle-key',
				initializeOptions: {
					disableCookies: true,
					visitor: { id: 'overridden' },
				},
				visitor: { id: 'visitor' },
			});
		loadScripts([create()], granted);
		const loader = getLoader();
		const runtime = {
			clearSession: vi.fn(),
			initialize: vi.fn(),
			startSendingEvents: vi.fn(),
			stopSendingEvents: vi.fn(),
		};
		window.pendo = runtime;
		loader.dispatchEvent(new Event('load'));
		await Promise.resolve();
		expect(runtime.initialize).toHaveBeenCalledWith({
			account: { id: 'account' },
			disableCookies: true,
			visitor: { id: 'visitor' },
		});
		updateScripts([create()], deniedConsents);
		expect(runtime.stopSendingEvents).toHaveBeenCalledTimes(1);
		updateScripts([create()], granted);
		await Promise.resolve();
		updateScripts([create()], granted);
		await Promise.resolve();
		expect(runtime.initialize).toHaveBeenCalledTimes(1);
		expect(runtime.startSendingEvents).toHaveBeenCalledTimes(1);
		expect(runtime.clearSession).not.toHaveBeenCalled();
		expect(getLoader()).toBe(loader);
	});
	it('does not initialize after in-flight withdrawal; first regrant initializes without changing identity', async () => {
		const scripts = [pendo({ apiKey: 'late-key' })];
		loadScripts(scripts, granted);
		const loader = getLoader();
		updateScripts(scripts, deniedConsents);
		const runtime = {
			initialize: vi.fn(),
			startSendingEvents: vi.fn(),
			stopSendingEvents: vi.fn(),
		};
		window.pendo = runtime;
		loader.dispatchEvent(new Event('load'));
		await Promise.resolve();
		expect(runtime.initialize).not.toHaveBeenCalled();
		expect(runtime.stopSendingEvents).toHaveBeenCalledTimes(1);
		updateScripts(scripts, granted);
		await Promise.resolve();
		expect(runtime.initialize).toHaveBeenCalledTimes(1);
		expect(runtime.startSendingEvents).toHaveBeenCalledTimes(1);
	});
	it('rechecks consent before queued activation and after initialization', async () => {
		const scripts = [pendo({ apiKey: 'race-key' })];
		loadScripts(scripts, granted);
		const loader = getLoader();
		const runtime = {
			initialize: vi.fn(() => {
				updateScripts(scripts, deniedConsents);
			}),
			startSendingEvents: vi.fn(),
			stopSendingEvents: vi.fn(),
		};
		window.pendo = runtime;
		loader.dispatchEvent(new Event('load'));
		updateScripts(scripts, deniedConsents);
		await Promise.resolve();
		expect(runtime.initialize).not.toHaveBeenCalled();
		updateScripts(scripts, granted);
		await Promise.resolve();
		await Promise.resolve();
		expect(runtime.initialize).toHaveBeenCalledTimes(1);
		expect(runtime.startSendingEvents).not.toHaveBeenCalled();
		expect(runtime.stopSendingEvents).toHaveBeenCalledTimes(2);
	});
});
