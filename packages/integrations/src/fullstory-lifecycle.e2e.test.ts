/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deniedConsents } from './e2e-test-utils';
import { fullStory } from './vendors/analytics/fullstory';
import type {
	FullStoryApi,
	FullStoryCall,
	FullStoryOptions,
} from './vendors/analytics/fullstory';

const granted = { ...deniedConsents, measurement: true };
const disposals: (() => void)[] = [];
const originalFetch = window.fetch;
const mount = (
	options: FullStoryOptions,
	consent = true,
	script = fullStory(options)
) => {
	const kernel = createConsentKernel();
	void kernel.commands.save(consent ? granted : deniedConsents);
	const events: string[] = [];
	const loader = createScriptLoader({
		kernel,
		onDebug: (event) => {
			if (event.action === 'callback_error') {
				events.push(String(event.data?.error));
			}
		},
		scripts: [script],
	});
	disposals.push(() => {
		loader.dispose();
		kernel.dispose();
	});
	return { events, kernel, loader };
};
const apiOf = (): FullStoryApi => {
	if (!window.FS) {
		throw new Error('Expected FullStory bootstrap');
	}
	return window.FS;
};
const loaderElement = () => {
	const element = document.querySelector<HTMLScriptElement>('script[src]');
	if (!element) {
		throw new Error('Expected FullStory download');
	}
	return element;
};
// Models the documented controls: start is a one-time operation, restart resumes.
const recorder = (element = loaderElement()) => {
	const api = apiOf();
	let started = false;
	let capturing = false;
	const dispatch = vi.fn((...call: FullStoryCall) => {
		if (call[0] === 'start' && !started) {
			started = true;
			capturing = true;
		}
		if (call[0] === 'restart') {
			capturing = true;
		}
		if (call[0] === 'shutdown') {
			capturing = false;
		}
	});
	api._api = dispatch;
	for (const call of api.q ?? []) {
		dispatch(...call);
	}
	api.q = [];
	element.dispatchEvent(new Event('load'));
	return { capturing: () => capturing, dispatch };
};

afterEach(() => {
	for (const dispose of disposals.splice(0).reverse()) {
		dispose();
	}
	document.head.innerHTML = '';
	for (const key of [
		'FS',
		'_fs_org',
		'_fs_host',
		'_fs_script',
		'_fs_namespace',
		'_fs_capture_on_startup',
	]) {
		Reflect.deleteProperty(window, key);
	}
	window.fetch = originalFetch;
	vi.restoreAllMocks();
});

describe('FullStory Async contract', () => {
	it('chains queued promises and resolves or rejects them during six-slot replay', async () => {
		mount({ orgId: 'async-org' });
		const api = apiOf();
		const result = api('getSessionAsync', { format: 'url' }, 'app', 1);
		expect(result).toBeInstanceOf(Promise);
		const chained = result.then((value) => `session:${String(value)}`);
		const rejected = api('getSessionAsync');
		expect(rejected).toBeInstanceOf(Promise);
		const failure = expect(rejected).rejects.toThrow('replay failure');
		const calls = api.q?.filter(([name]) => name === 'getSession') ?? [];
		expect(calls).toHaveLength(2);
		expect(calls[0]?.slice(0, 3)).toEqual([
			'getSession',
			{ format: 'url' },
			'app',
		]);
		expect(calls[0]?.[5]).toBe(1);
		for (const call of calls) {
			expect(call).toHaveLength(6);
			expect(call[3]).toBeTypeOf('function');
			expect(call[4]).toBeTypeOf('function');
		}
		const resolve = calls[0]?.[3];
		const reject = calls[1]?.[4];
		if (typeof resolve === 'function') {
			resolve('url');
		}
		if (typeof reject === 'function') {
			reject(new Error('replay failure'));
		}
		await expect(chained).resolves.toBe('session:url');
		await failure;
	});
	it('rejects pending and future Async promises when the download fails', async () => {
		mount({ orgId: 'download-error' });
		const api = apiOf();
		const pending = api('getSessionAsync');
		const failed = expect(pending).rejects.toThrow(/error loading/u);
		loaderElement().dispatchEvent(new Event('error'));
		await failed;
		await expect(api('getSessionAsync')).rejects.toThrow(/error loading/u);
	});
	it('forwards loaded Async and sync calls with the API receiver and version', async () => {
		mount({ orgId: 'loaded-async-org' });
		const api = apiOf();
		const dispatch = vi.fn((...call: FullStoryCall) => {
			if (call[1] === 'reject' && typeof call[4] === 'function') {
				call[4](new Error('loaded failure'));
			} else if (typeof call[3] === 'function') {
				call[3]('loaded');
			}
			return 'sync-result';
		});
		api._api = dispatch;
		await expect(api('getSessionAsync', 'resolve', 'app', 1)).resolves.toBe(
			'loaded'
		);
		await expect(api('getSessionAsync', 'reject')).rejects.toThrow(
			'loaded failure'
		);
		expect(api('getSession', 'sync', 'app', 1)).toBe('sync-result');
		expect(dispatch.mock.calls[0]?.[0]).toBe('getSession');
		expect(dispatch.mock.calls[0]?.[5]).toBe(1);
		expect(dispatch.mock.calls[2]).toEqual([
			'getSession',
			'sync',
			'app',
			undefined,
			undefined,
			1,
		]);
		expect(dispatch.mock.contexts.every((context) => context === api)).toBe(
			true
		);
	});
});

describe('FullStory retained recorder', () => {
	it('leaves all-denied registrations without globals, fetch changes, or a download', () => {
		const before = window.fetch;
		mount({ orgId: 'denied-owners' }, false);
		mount({ orgId: 'denied-owners' }, false);
		expect(window.FS).toBeUndefined();
		expect(window._fs_org).toBeUndefined();
		expect(window.fetch).toBe(before);
		expect(document.querySelector('script[src]')).toBeNull();
	});
	it('resumes after final-owner disposal without downloading or starting twice', () => {
		const options = { orgId: 'remount-org' };
		const first = mount(options);
		const model = recorder();
		expect(model.capturing()).toBe(true);
		first.loader.dispose();
		expect(model.capturing()).toBe(false);
		const append = vi.spyOn(document.head, 'appendChild');
		mount(options);
		expect(model.capturing()).toBe(true);
		expect(
			model.dispatch.mock.calls.filter(([name]) => name === 'start')
		).toHaveLength(1);
		expect(
			model.dispatch.mock.calls.filter(([name]) => name === 'restart')
		).toHaveLength(1);
		expect(append).not.toHaveBeenCalled();
	});
	it('retains the recorder when a customized shallow copy is remounted', () => {
		const options = { orgId: 'spread-remount' };
		const script = { ...fullStory(options), nonce: 'custom-nonce' };
		const first = mount(options, true, script);
		expect(loaderElement().nonce).toBe('custom-nonce');
		const model = recorder();
		first.loader.dispose();
		expect(model.capturing()).toBe(false);
		const append = vi.spyOn(document.head, 'appendChild');
		mount(options, true, script);
		expect(model.capturing()).toBe(true);
		expect(document.querySelector('script[src]')).toBeNull();
		expect(
			append.mock.calls.every(
				([element]) =>
					element instanceof HTMLScriptElement && !element.hasAttribute('src')
			)
		).toBe(true);
		expect(
			model.dispatch.mock.calls.filter(([name]) => name === 'start')
		).toHaveLength(1);
		expect(
			model.dispatch.mock.calls.filter(([name]) => name === 'restart')
		).toHaveLength(1);
	});
	it('waits for the original pending SDK when remounting a shallow copy', () => {
		const options = { orgId: 'pending-spread' };
		const script = { ...fullStory(options), nonce: 'pending-nonce' };
		const first = mount(options, true, script);
		const element = loaderElement();
		const api = apiOf();
		first.loader.dispose();
		mount(options, true, script);
		expect(document.querySelector('script[src]')).toBeNull();
		expect(api.q?.map(([name]) => name)).toEqual(['init']);
		const model = recorder(element);
		expect(model.capturing()).toBe(true);
		expect(
			model.dispatch.mock.calls.filter(([name]) => name === 'start')
		).toHaveLength(1);
	});
	it('does not download a precreated shallow copy over an opaque installation', () => {
		const options = { orgId: 'precreated-opaque' };
		const script = { ...fullStory(options), nonce: 'opaque-nonce' };
		const external = vi.fn();
		window.FS = external;
		const owner = mount(options, true, script);
		expect(owner.events.some((message) => /reload/u.test(message))).toBe(true);
		expect(document.querySelector('script[src]')).toBeNull();
		expect(window.FS).toBe(external);
		expect(external).not.toHaveBeenCalled();
	});
	it('reuses a pending download after disposal and waits for its original completion', () => {
		const options = { orgId: 'pending-remount' };
		const first = mount(options);
		const element = loaderElement();
		const api = apiOf();
		first.loader.dispose();
		expect(element.isConnected).toBe(false);
		const append = vi.spyOn(document.head, 'appendChild');
		mount(options);
		expect(apiOf()).toBe(api);
		expect(append).not.toHaveBeenCalled();
		const model = recorder(element);
		expect(model.capturing()).toBe(true);
		expect(
			model.dispatch.mock.calls.filter(([name]) => name === 'init')
		).toHaveLength(1);
		expect(
			model.dispatch.mock.calls.filter(([name]) => name === 'start')
		).toHaveLength(1);
	});
	it.each(['revoke', 'dispose'])(
		'shuts down its recorder and preserves replacement owners on %s',
		(action) => {
			const first = mount({ orgId: 'fetch-ownership' });
			const model = recorder();
			expect(model.capturing()).toBe(true);
			const owned = apiOf();
			const replacementFetch = vi.fn<typeof fetch>();
			window.fetch = replacementFetch;
			const external = vi.fn(() => Promise.resolve(undefined));
			window.FS = external;
			if (action === 'dispose') {
				first.loader.dispose();
			} else {
				void first.kernel.commands.save(deniedConsents);
			}
			expect(model.capturing()).toBe(false);
			expect(window.FS).toBe(external);
			expect(window.fetch).toBe(replacementFetch);
			expect(external).not.toHaveBeenCalled();
			expect(owned).not.toBe(external);
			expect(() => fullStory({ orgId: 'fetch-ownership' })).toThrow(/reload/u);
		}
	);
	it('rejects a precreated incompatible replacement without a second download', () => {
		const replacement = fullStory({ orgId: 'precreated-other' });
		const first = mount({ orgId: 'precreated-original' });
		const model = recorder();
		const api = apiOf();
		const append = vi.spyOn(document.head, 'appendChild');
		first.loader.updateScripts([replacement]);
		expect(first.events.some((message) => /reload/u.test(message))).toBe(true);
		expect(window.FS).toBe(api);
		expect(window._fs_org).toBe('precreated-original');
		expect(append).not.toHaveBeenCalled();
		expect(model.capturing()).toBe(false);
	});
	it('allows element-consent replacement while keeping the configured recorder', () => {
		const first = mount({ orgId: 'element-replacement' });
		const model = recorder();
		const api = apiOf();
		const append = vi.spyOn(document.head, 'appendChild');
		first.loader.updateScripts([
			fullStory({ elementConsent: true, orgId: 'element-replacement' }),
		]);
		expect(window.FS).toBe(api);
		expect(model.capturing()).toBe(true);
		expect(
			model.dispatch.mock.calls.filter(([name]) => name === 'start')
		).toHaveLength(1);
		expect(model.dispatch.mock.calls.at(-2)).toEqual([
			'setIdentity',
			{ consent: true },
			undefined,
			undefined,
			undefined,
			2,
		]);
		expect(append).not.toHaveBeenCalled();
	});
	it.each([false, true])(
		'aggregates a never-loaded denied owner across kernels, denied-first=%s',
		(deniedFirst) => {
			const options = { orgId: `owners-${deniedFirst}` };
			const first = mount(options, !deniedFirst);
			const second = mount(options, deniedFirst);
			const denied = deniedFirst ? first : second;
			const model = recorder();
			expect(model.capturing()).toBe(false);
			void denied.kernel.commands.save(granted);
			expect(model.capturing()).toBe(true);
			first.loader.dispose();
			expect(model.capturing()).toBe(true);
			second.loader.dispose();
			expect(model.capturing()).toBe(false);
		}
	);
	it('keeps pending withdrawal off and starts once after regrant', () => {
		const owner = mount({ orgId: 'pending-withdrawal' });
		void owner.kernel.commands.save(deniedConsents);
		const model = recorder();
		expect(model.capturing()).toBe(false);
		void owner.kernel.commands.save(granted);
		expect(model.capturing()).toBe(true);
		expect(
			model.dispatch.mock.calls.filter(([name]) => name === 'start')
		).toHaveLength(1);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
	});
	it.each([
		{ orgId: 'another-org' },
		{ host: 'other.fullstory.com', orgId: 'fixed-org' },
		{ orgId: 'fixed-org', script: 'example.com/fs.js' },
		{ orgId: 'fixed-org', scriptUrl: 'https://example.com/proxy.js' },
	])(
		'rejects loaded configuration replacement with a reload requirement: %j',
		(replacement) => {
			mount({ orgId: 'fixed-org' });
			const model = recorder();
			const api = apiOf();
			const { fetch } = window;
			expect(() => fullStory(replacement)).toThrow(/reload/iu);
			expect(window.FS).toBe(api);
			expect(window.fetch).toBe(fetch);
			expect(window._fs_org).toBe('fixed-org');
			expect(model.capturing()).toBe(true);
			expect(document.querySelectorAll('script[src]')).toHaveLength(1);
		}
	);
});
