/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { fullStory } from './vendors/analytics/fullstory';

const GLOBALS = [
	'FS',
	'_fs_org',
	'_fs_host',
	'_fs_script',
	'_fs_capture_on_startup',
	'_fs_namespace',
];
const granted = { ...deniedConsents, measurement: true };
const unrelated = { ...deniedConsents, marketing: true };
const getLoader = (): HTMLScriptElement => {
	const loader = document.querySelector<HTMLScriptElement>('script[src]');
	if (!loader) {
		throw new Error('Expected FullStory loader');
	}
	return loader;
};

describe('FullStory consent loader', () => {
	registerVendorContractCleanup();
	beforeEach(() => {
		// Node 25+ replaces jsdom's storage globals with its own Web Storage.
		vi.stubGlobal('localStorage', jsdom.window.localStorage);
		vi.stubGlobal('sessionStorage', jsdom.window.sessionStorage);
	});
	afterEach(() => {
		for (const name of GLOBALS) {
			Reflect.deleteProperty(window, name);
		}
		localStorage.clear();
		sessionStorage.clear();
		vi.unstubAllGlobals();
	});
	it('keeps a live callback-only check through object spread', () => {
		const copy = { ...fullStory({ orgId: 'o-SPREAD-na1' }) };
		expect(typeof copy.callbackOnly).toBe('function');
		expect(fullStory({ orgId: 'o-SPREAD-na1' }).callbackOnly).toBe(
			copy.callbackOnly
		);
		const check = copy.callbackOnly as () => boolean;
		expect(check()).toBe(false);
		// A runtime this helper did not start needs callbacks only.
		Reflect.set(window, 'FS', vi.fn());
		expect(check()).toBe(true);
	});

	it('creates no vendor requests, globals or storage before mapped consent', () => {
		const scripts = [fullStory({ orgId: 'YOUR_ORG_ID' })];
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
			'https://edge.fullstory.com/s/fs.js?org=YOUR_ORG_ID'
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
			fullStory({ category: 'experience', orgId: 'YOUR_ORG_ID' }),
		];
		loadScripts(scripts, granted);
		expect(document.querySelector('script[src]')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, experience: true });
		expect(getLoader()).toBeDefined();
	});
});

describe('FullStory v2 capture controls', () => {
	registerVendorContractCleanup();
	const initialFetch = window.fetch;
	afterEach(() => {
		window.fetch = initialFetch;
		for (const name of GLOBALS) {
			Reflect.deleteProperty(window, name);
		}
	});
	it('uses six-slot init records and start, shutdown, restart without another loader', () => {
		const create = () =>
			fullStory({ elementConsent: true, orgId: 'recording-org' });
		const scripts = [create()];
		loadScripts(scripts, granted);
		const api = window.FS;
		if (!api) {
			throw new Error('Expected FS bootstrap');
		}
		expect(window._fs_capture_on_startup).toBe(false);
		expect(api.q?.[0]).toEqual([
			'init',
			{
				env: {
					captureOnStartup: false,
					host: 'fullstory.com',
					orgId: 'recording-org',
					script: 'edge.fullstory.com/s/fs.js',
				},
			},
			undefined,
			undefined,
			undefined,
			2,
		]);
		const control = vi.fn();
		api._api = control;
		const loader = getLoader();
		loader.dispatchEvent(new Event('load'));
		updateScripts([create()], granted);
		updateScripts([create()], deniedConsents);
		updateScripts([create()], granted);
		expect(control.mock.calls.map(([name]) => name)).toEqual([
			'setIdentity',
			'start',
			'setIdentity',
			'shutdown',
			'setIdentity',
			'restart',
		]);
		expect(
			control.mock.calls
				.filter(([name]) => name === 'setIdentity')
				.map(([, value]) => value)
		).toEqual([{ consent: true }, { consent: false }, { consent: true }]);
		expect(
			control.mock.calls.every((args) => args.length === 6 && args[5] === 2)
		).toBe(true);
		expect(getLoader()).toBe(loader);
	});
	it('keeps capture disabled when loading completes after withdrawal', () => {
		const scripts = [fullStory({ orgId: 'late-org' })];
		loadScripts(scripts, granted);
		const loader = getLoader();
		updateScripts(scripts, deniedConsents);
		loader.dispatchEvent(new Event('load'));
		expect(window.FS?.q?.map(([name]) => name)).toEqual([
			'init',
			'setIdentity',
			'shutdown',
		]);
		updateScripts(scripts, granted);
		expect(window.FS?.q?.at(-1)?.[0]).toBe('restart');
		expect(window._fs_capture_on_startup).toBe(false);
	});
});

describe('FullStory fetch instrumentation contract', () => {
	registerVendorContractCleanup();
	const initialFetch = window.fetch;
	afterEach(() => {
		window.fetch = initialFetch;
		for (const name of GLOBALS) {
			Reflect.deleteProperty(window, name);
		}
	});
	it('forwards fetch through the mutable SDK slot with its receiver, arguments, and return value', () => {
		const originalResult = Promise.resolve(new Response());
		const original = vi.fn<typeof fetch>().mockReturnValue(originalResult);
		window.fetch = original;
		loadScripts([fullStory({ orgId: 'fetch-org' })], granted);
		expect(window.fetch).not.toBe(original);
		const api = window.FS;
		if (!api?._w) {
			throw new Error('Expected saved FullStory originals');
		}
		expect(api._w.fetch).toBe(original);
		expect(api._w.XMLHttpRequest).toBe(window.XMLHttpRequest);
		expect(original).not.toHaveBeenCalled();
		const forward = window.fetch;
		const receiver = { source: 'application' };
		const url = 'https://example.com/application-request';
		const options: RequestInit = { body: 'payload', method: 'POST' };
		expect(forward.call(receiver, url, options)).toBe(originalResult);
		expect(original).toHaveBeenCalledExactlyOnceWith(url, options);
		expect(original.mock.contexts[0]).toBe(receiver);
		const instrumentedResult = Promise.resolve(new Response());
		const instrumented = vi
			.fn<typeof fetch>()
			.mockReturnValue(instrumentedResult);
		api._w.fetch = instrumented;
		expect(forward.call(receiver, url, options)).toBe(instrumentedResult);
		expect(instrumented).toHaveBeenCalledExactlyOnceWith(url, options);
		expect(instrumented.mock.contexts[0]).toBe(receiver);
		expect(original).toHaveBeenCalledTimes(1);
		const replacement = vi.fn<typeof fetch>().mockReturnValue(originalResult);
		api._w = { XMLHttpRequest: window.XMLHttpRequest, fetch: replacement };
		expect(forward.call(receiver, url, options)).toBe(originalResult);
		expect(replacement).toHaveBeenCalledExactlyOnceWith(url, options);
		expect(replacement.mock.contexts[0]).toBe(receiver);
	});
	it('leaves an absent fetch absent at bootstrap', () => {
		Reflect.set(window, 'fetch', undefined);
		loadScripts([fullStory({ orgId: 'no-fetch-org' })], granted);
		expect(window.fetch).toBeUndefined();
		expect(window.FS?._w?.fetch).toBeUndefined();
		expect(window.FS?._w?.XMLHttpRequest).toBe(window.XMLHttpRequest);
	});
	it('does not replace fetch before consent or wrap it again on regrant', () => {
		const original = vi.fn<typeof fetch>();
		window.fetch = original;
		const scripts = [fullStory({ orgId: 'fetch-consent-org' })];
		loadScripts(scripts, deniedConsents);
		expect(window.fetch).toBe(original);
		updateScripts(scripts, granted);
		const forward = window.fetch;
		expect(forward).not.toBe(original);
		getLoader().dispatchEvent(new Event('load'));
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, granted);
		expect(window.fetch).toBe(forward);
		expect(window.FS?._w?.fetch).toBe(original);
	});
});
