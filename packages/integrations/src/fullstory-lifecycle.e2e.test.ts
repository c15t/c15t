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
// Count insertions even when core removes the element before the next task.
const sdkInsertions = () => {
	const elements: HTMLScriptElement[] = [];
	const record = (records: MutationRecord[]) => {
		for (const mutation of records) {
			for (const node of mutation.addedNodes) {
				if (node instanceof HTMLScriptElement && node.src.includes('fs.js')) {
					elements.push(node);
				}
			}
		}
	};
	const observer = new MutationObserver(record);
	observer.observe(document, { childList: true, subtree: true });
	disposals.push(() => observer.disconnect());
	return () => {
		record(observer.takeRecords());
		return elements;
	};
};
// Records control commands; capture state below is a test model, not SDK evidence.
const recorder = (element = loaderElement()) => {
	const api = apiOf();
	let started = false;
	let capturing = false;
	const dispatch = vi.fn((...call: FullStoryCall) => {
		if (call[0] === 'getSession') {
			call[3]?.('session-url');
		}
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
	document.body.innerHTML = '';
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
	it.each(['head', 'body'] as const)(
		'keeps a pending shallow copy in %s after observer delivery',
		async (target) => {
			const insertions = sdkInsertions();
			const options = { orgId: `pending-target-${target}` };
			const originalScript = fullStory(options);
			const denier = mount(options, false, originalScript);
			const script = { ...originalScript, nonce: 'sdk-nonce', target };
			const owner = mount(options, true, script);
			const original = loaderElement();
			expect(original.parentNode).toBe(document[target]);
			expect(original.nonce).toBe('sdk-nonce');
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			owner.loader.updateScripts([]);
			owner.loader.updateScripts([script]);
			expect(insertions()).toEqual([original]);
			expect(original.isConnected).toBe(false);
			// The copy keeps the live callback-only check, so no placeholder mounts.
			expect(document.querySelector('script')).toBeNull();
			expect(apiOf().q?.map(([name]) => name)).toEqual(['init']);
			const model = recorder(original);
			expect(model.dispatch.mock.calls.map(([name]) => name)).toEqual([
				'init',
				'setIdentity',
				'shutdown',
			]);
			void denier.kernel.commands.save(granted);
			expect(model.capturing()).toBe(true);
		}
	);
	it('loads in the head before a body exists', () => {
		const { body } = document;
		body.remove();
		try {
			const insertions = sdkInsertions();
			const owner = mount({ orgId: 'no-body' });
			const original = loaderElement();
			expect(insertions()).toEqual([original]);
			expect(recorder(original).capturing()).toBe(true);
			expect(owner.events).toEqual([]);
		} finally {
			document.documentElement.appendChild(body);
		}
	});
	it('retains a pending SDK when MutationObserver is unavailable', () => {
		const insertions = sdkInsertions();
		vi.stubGlobal('MutationObserver', undefined);
		try {
			const options = { orgId: 'no-observer' };
			const denier = mount(options, false);
			const owner = mount(options);
			const original = loaderElement();
			expect(insertions()).toEqual([original]);
			owner.loader.updateScripts([]);
			owner.loader.updateScripts([fullStory(options)]);
			expect(insertions()).toEqual([original]);
			const model = recorder(original);
			expect(model.capturing()).toBe(false);
			void denier.kernel.commands.save(granted);
			expect(model.capturing()).toBe(true);
			expect(owner.events).toEqual([]);
		} finally {
			vi.unstubAllGlobals();
		}
	});
	it.each([
		{ action: 'remount', deniedFirst: false, flow: 'R1' },
		{ action: 'remount', deniedFirst: true, flow: 'R1b' },
		{ action: 'grant', deniedFirst: false, flow: 'R2' },
		{ action: 'remount-both', deniedFirst: false, flow: 'R3' },
		{ action: 'update', deniedFirst: false, flow: 'R4' },
		{ action: 'update', deniedFirst: true, flow: 'R4b' },
	])(
		'retains the first pending SDK with a same-options denier, $flow',
		({ flow, deniedFirst, action }) => {
			const insertions = sdkInsertions();
			const options = { orgId: `pending-multi-owner-${flow}` };
			const script = fullStory(options);
			let denier = deniedFirst ? mount(options, false, script) : undefined;
			const owner = mount(options, true, script);
			denier ??= mount(options, false, script);
			const original = loaderElement();
			expect(insertions()).toEqual([original]);
			const api = apiOf();
			if (action === 'update') {
				owner.loader.updateScripts([]);
				owner.loader.updateScripts([script]);
			} else {
				owner.loader.dispose();
				if (action === 'grant') {
					void denier.kernel.commands.save(granted);
				} else {
					if (action === 'remount-both') {
						denier.loader.dispose();
					}
					mount(options, true, script);
					if (action === 'remount-both') {
						denier = mount(options, false, script);
					}
				}
			}
			expect(original.isConnected).toBe(false);
			expect(insertions()).toEqual([original]);
			expect(apiOf()).toBe(api);
			for (const element of document.querySelectorAll('script')) {
				element.dispatchEvent(new Event('load'));
			}
			expect(api.q?.map(([name]) => name)).toEqual(['init']);
			const model = recorder(original);
			expect(model.dispatch.mock.calls.map(([name]) => name)).toEqual([
				'init',
				'setIdentity',
				action === 'grant' ? 'start' : 'shutdown',
			]);
			void denier.kernel.commands.save(granted);
			expect(model.capturing()).toBe(true);
			expect(model.dispatch.mock.calls.map(([name]) => name)).toEqual(
				action === 'grant'
					? ['init', 'setIdentity', 'start']
					: ['init', 'setIdentity', 'shutdown', 'setIdentity', 'restart']
			);
			expect(owner.events).toEqual([]);
			expect(denier.events).toEqual([]);
		}
	);

	it.each([false, true])(
		'retries an interrupted bootstrap without a second init, shallow-copy=%s',
		async (shallowCopy) => {
			const insertions = sdkInsertions();
			const options = { orgId: `interrupted-${shallowCopy}` };
			const original = fullStory(options);
			const script = shallowCopy ? { ...original, nonce: 'retry' } : original;
			const prepared: HTMLScriptElement[] = [];
			const beforeLoad = script.onBeforeLoad;
			script.onBeforeLoad = (info) => {
				if (info.element) {
					prepared.push(info.element);
				}
				beforeLoad?.(info);
			};
			const owner = mount(options, false, script);
			let interrupted = false;
			const sibling = {
				category: 'measurement',
				id: 'interrupting-sibling',
				onBeforeLoad: () => {
					if (!interrupted) {
						interrupted = true;
						owner.loader.updateScripts([script, sibling]);
					}
				},
				src: 'https://example.com/sibling.js',
			} as const;
			owner.loader.updateScripts([script, sibling]);
			void owner.kernel.commands.save(granted);
			expect(interrupted).toBe(true);
			const element = loaderElement();
			expect(insertions()).toEqual([element]);
			expect(apiOf().q?.map(([name]) => name)).toEqual(['init']);
			const pending = apiOf()('getSessionAsync');
			expect(pending).toBeInstanceOf(Promise);
			expect(prepared).toHaveLength(2);
			expect(prepared[0]).not.toBe(element);
			expect(prepared[0]?.hasAttribute('src')).toBe(false);
			prepared[0]?.dispatchEvent(new Event('load'));
			prepared[0]?.dispatchEvent(new Event('error'));
			expect(apiOf().q?.map(([name]) => name)).toEqual(['init', 'getSession']);
			const denied = mount(options, false, script);
			owner.loader.dispose();
			mount(options, true, script);
			expect(insertions()).toEqual([element]);
			const model = recorder(element);
			expect(model.capturing()).toBe(false);
			void denied.kernel.commands.save(granted);
			expect(model.capturing()).toBe(true);
			await expect(pending).resolves.toBe('session-url');
			element.dispatchEvent(new Event('load'));
			expect(
				model.dispatch.mock.calls
					.filter(([name]) => ['start', 'restart', 'shutdown'].includes(name))
					.map(([name]) => name)
			).toEqual(['shutdown', 'restart']);
		}
	);
	it.each([false, true])(
		'reapplies consent when a separate denied lifecycle is disposed, denied-first=%s',
		(deniedFirst) => {
			const options = { orgId: `separate-denier-${deniedFirst}` };
			const deniedOptions = { ...options, elementConsent: true };
			const first = mount(deniedFirst ? deniedOptions : options, !deniedFirst);
			const second = mount(deniedFirst ? options : deniedOptions, deniedFirst);
			const denied = deniedFirst ? first : second;
			const model = recorder();
			expect(model.capturing()).toBe(false);
			denied.loader.dispose();
			expect(model.capturing()).toBe(true);
			expect(
				model.dispatch.mock.calls
					.filter(([name]) => ['start', 'restart', 'shutdown'].includes(name))
					.map(([name]) => name)
			).toEqual(['shutdown', 'restart']);
			expect(model.dispatch.mock.calls.at(-2)?.slice(0, 2)).toEqual([
				'setIdentity',
				{ consent: false },
			]);
		}
	);
	it('reapplies document consent after removing a pre-bootstrap incompatible denier', () => {
		const options = { orgId: 'separate-denier-endpoint' };
		const denied = mount({ ...options, host: 'eu1.fullstory.com' }, false);
		mount(options);
		const api = apiOf();
		const model = recorder();
		expect(model.capturing()).toBe(false);
		denied.loader.dispose();
		expect(model.capturing()).toBe(true);
		expect(window.FS).toBe(api);
		expect(window._fs_host).toBe('fullstory.com');
		expect(() => fullStory({ ...options, host: 'eu1.fullstory.com' })).toThrow(
			/reload/u
		);
		expect(denied.events).toEqual([]);
	});
	it('preserves a foreign replacement when a pre-bootstrap denier is disposed', () => {
		const options = { orgId: 'separate-denier-foreign' };
		const denied = mount({ ...options, elementConsent: true }, false);
		mount(options);
		const model = recorder();
		expect(model.capturing()).toBe(false);
		const foreign = vi.fn();
		window.FS = foreign;
		denied.loader.dispose();
		expect(model.capturing()).toBe(false);
		expect(window.FS).toBe(foreign);
		expect(foreign).not.toHaveBeenCalled();
		expect(denied.events).toEqual([]);
	});
	it('completes a callback-only remount without making its detached pending SDK ready', async () => {
		const options = { orgId: 'placeholder-readiness' };
		const script = { ...fullStory(options), nonce: 'placeholder' };
		const first = mount(options, true, script);
		const original = loaderElement();
		first.loader.dispose();
		const completed = vi.fn();
		const { onLoad } = script;
		script.onLoad = (info) => {
			completed();
			onLoad?.(info);
		};
		mount(options, true, script);
		// The copy keeps the live callback-only check, so no placeholder mounts.
		expect(document.querySelector('script')).toBeNull();
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(completed).toHaveBeenCalledOnce();
		expect(apiOf().q?.map(([name]) => name)).toEqual(['init']);
		const model = recorder(original);
		expect(model.capturing()).toBe(true);
	});
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
		// Validation rejects the batch before the active owner is removed.
		expect(() => first.loader.updateScripts([replacement])).toThrow(
			/reload the page/u
		);
		expect(first.events).toEqual([]);
		expect(window.FS).toBe(api);
		expect(window._fs_org).toBe('precreated-original');
		expect(append).not.toHaveBeenCalled();
		expect(model.capturing()).toBe(true);
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
	it('keeps pending withdrawal off and restarts once after regrant', () => {
		const owner = mount({ orgId: 'pending-withdrawal' });
		void owner.kernel.commands.save(deniedConsents);
		const model = recorder();
		expect(model.capturing()).toBe(false);
		void owner.kernel.commands.save(deniedConsents);
		void owner.kernel.commands.save(granted);
		void owner.kernel.commands.save(granted);
		expect(model.dispatch.mock.calls.map(([name]) => name)).toEqual([
			'init',
			'setIdentity',
			'shutdown',
			'setIdentity',
			'restart',
		]);
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

describe('FullStory shutdown before first start', () => {
	it.each(['same-script', 'new-helper'] as const)(
		'restarts after an ownerless late load and %s remount',
		(remount) => {
			const insertions = sdkInsertions();
			const options = { orgId: 'ownerless-late-load' };
			const script = fullStory(options);
			const owner = mount(options, true, script);
			const element = loaderElement();
			const api = apiOf();
			owner.loader.dispose();
			expect(element.isConnected).toBe(false);
			element.dispatchEvent(new Event('load'));
			expect(api.q?.map(([name]) => name)).toEqual([
				'init',
				'setIdentity',
				'shutdown',
			]);
			mount(
				options,
				true,
				remount === 'same-script' ? script : fullStory({ ...options })
			);
			expect(apiOf()).toBe(api);
			expect(api.q?.map(([name]) => name)).toEqual([
				'init',
				'setIdentity',
				'shutdown',
				'setIdentity',
				'restart',
			]);
			expect(insertions()).toHaveLength(1);
			expect(window._fs_capture_on_startup).toBe(false);
		}
	);
});

describe('FullStory effective regional configuration', () => {
	it.each([
		{
			host: 'eu1.fullstory.com',
			options: {
				orgId: 'o-ABC123-eu1',
			},
			script: 'edge.eu1.fullstory.com/s/fs.js',
			src: 'https://edge.eu1.fullstory.com/s/fs.js?org=o-ABC123-eu1',
		},
		{
			host: 'eu1.fullstory.com',
			options: {
				orgId: 'u-ABC123-eu1',
			},
			script: 'edge.eu1.fullstory.com/s/fs.js',
			src: 'https://edge.eu1.fullstory.com/s/fs.js?org=u-ABC123-eu1',
		},
		{
			host: 'eu1.fullstory.com',
			options: {
				orgId: '-ABC123-eu1',
			},
			script: 'edge.eu1.fullstory.com/s/fs.js',
			src: 'https://edge.eu1.fullstory.com/s/fs.js?org=-ABC123-eu1',
		},
		{
			host: 'eu1.fullstory.com',
			options: {
				orgId: 'o-ABC-extra-eu1',
			},
			script: 'edge.eu1.fullstory.com/s/fs.js',
			src: 'https://edge.eu1.fullstory.com/s/fs.js?org=o-ABC-extra-eu1',
		},
		{
			host: 'ap1.fullstory.com',
			options: {
				orgId: 'o-ABC123-ap1',
			},
			script: 'edge.ap1.fullstory.com/s/fs.js',
			src: 'https://edge.ap1.fullstory.com/s/fs.js?org=o-ABC123-ap1',
		},
		{
			host: 'custom.fullstory.com',
			options: {
				orgId: 'o-ABC123-custom',
			},
			script: 'edge.custom.fullstory.com/s/fs.js',
			src: 'https://edge.custom.fullstory.com/s/fs.js?org=o-ABC123-custom',
		},
		{
			host: 'fullstory.com',
			options: {
				orgId: 'o-ABC123-na1',
			},
			script: 'edge.fullstory.com/s/fs.js',
			src: 'https://edge.fullstory.com/s/fs.js?org=o-ABC123-na1',
		},
		{
			host: 'fullstory.com',
			options: {
				orgId: 'legacy-eu1',
			},
			script: 'edge.fullstory.com/s/fs.js',
			src: 'https://edge.fullstory.com/s/fs.js?org=legacy-eu1',
		},
		{
			host: 'fullstory.com',
			options: {
				orgId: 'legacy-id-eu1',
			},
			script: 'edge.fullstory.com/s/fs.js',
			src: 'https://edge.fullstory.com/s/fs.js?org=legacy-id-eu1',
		},
		{
			host: 'fullstory.com',
			options: {
				orgId: 'ABC123',
			},
			script: 'edge.fullstory.com/s/fs.js',
			src: 'https://edge.fullstory.com/s/fs.js?org=ABC123',
		},
		{
			host: 'fullstory.com',
			options: {
				orgId: 'o-ABC123-',
			},
			script: 'edge.fullstory.com/s/fs.js',
			src: 'https://edge.fullstory.com/s/fs.js?org=o-ABC123-',
		},
		{
			host: 'eu1.fullstory.com',
			options: {
				host: ' ',
				orgId: '  o-ABC123-eu1  ',
				script: '\t',
				scriptUrl: ' ',
			},
			script: 'edge.eu1.fullstory.com/s/fs.js',
			src: 'https://edge.eu1.fullstory.com/s/fs.js?org=o-ABC123-eu1',
		},
		{
			host: 'eu1.fullstory.com',
			options: {
				host: 'fullstory.com',
				orgId: 'o-ABC123-eu1',
				script: 'edge.fullstory.com/s/fs.js',
			},
			script: 'edge.eu1.fullstory.com/s/fs.js',
			src: 'https://edge.eu1.fullstory.com/s/fs.js?org=o-ABC123-eu1',
		},
		{
			host: 'eu1.fullstory.com',
			options: {
				host: '  eu1.fullstory.com ',
				orgId: 'o-ABC123-eu1',
				script: ' edge.eu1.fullstory.com/s/fs.js ',
			},
			script: 'edge.eu1.fullstory.com/s/fs.js',
			src: 'https://edge.eu1.fullstory.com/s/fs.js?org=o-ABC123-eu1',
		},
		{
			host: 'eu1.fullstory.com',
			options: {
				host: 'ap1.fullstory.com',
				orgId: 'o-ABC123-eu1',
				script: 'edge.na1.fullstory.com/s/fs.js',
			},
			script: 'edge.eu1.fullstory.com/s/fs.js',
			src: 'https://edge.eu1.fullstory.com/s/fs.js?org=o-ABC123-eu1',
		},
		{
			host: 'www.eu1.fullstory.com/custom',
			options: {
				host: ' www.fullstory.com/custom ',
				orgId: 'o-ABC123-eu1',
				script: 'cdn.fullstory.com/custom/fs.js',
			},
			script: 'cdn.eu1.fullstory.com/custom/fs.js',
			src: 'https://cdn.eu1.fullstory.com/custom/fs.js?org=o-ABC123-eu1',
		},
		{
			host: 'relay.example.com',
			options: {
				host: ' relay.example.com ',
				orgId: 'o-ABC123-eu1',
			},
			script: 'edge.eu1.fullstory.com/s/fs.js',
			src: 'https://edge.eu1.fullstory.com/s/fs.js?org=o-ABC123-eu1',
		},
		{
			host: 'eu1.fullstory.com',
			options: {
				orgId: 'o-ABC123-eu1',
				script: ' cdn.example.com/fullstory.com/s/fs.js ',
			},
			script: 'cdn.example.com/fullstory.com/s/fs.js',
			src: 'https://cdn.example.com/fullstory.com/s/fs.js?org=o-ABC123-eu1',
		},
		{
			host: 'fullstory.com.example.com',
			options: {
				host: 'fullstory.com.example.com',
				orgId: 'o-ABC123-eu1',
				script: 'edge.fullstory.com.example.com/s/fs.js',
			},
			script: 'edge.fullstory.com.example.com/s/fs.js',
			src: 'https://edge.fullstory.com.example.com/s/fs.js?org=o-ABC123-eu1',
		},
		{
			host: 'relay.example.com',
			options: {
				host: 'relay.example.com',
				orgId: 'o-ABC123-eu1',
				script: 'relay.example.com/s/fs.js',
			},
			script: 'relay.example.com/s/fs.js',
			src: 'https://relay.example.com/s/fs.js?org=o-ABC123-eu1',
		},
		{
			host: 'eu1.fullstory.com',
			options: {
				orgId: 'o-ABC123-eu1',
				scriptUrl: ' https://edge.fullstory.com/s/fs.js?fixed=1 ',
			},
			script: 'edge.eu1.fullstory.com/s/fs.js',
			src: 'https://edge.fullstory.com/s/fs.js?fixed=1',
		},
		{
			host: 'eu1.fullstory.com',
			options: {
				orgId: 'o-ABC123-eu1',
				script: 'relay.example.com/sdk.js',
				scriptUrl: ' https://download.example.com/exact.js ',
			},
			script: 'relay.example.com/sdk.js',
			src: 'https://download.example.com/exact.js',
		},
		{
			host: 'eu1.fullstory.com',
			options: {
				host: 'eu1.fullstory.com',
				orgId: 'o-ABC123-na1',
				script: 'edge.eu1.fullstory.com/s/fs.js',
			},
			script: 'edge.eu1.fullstory.com/s/fs.js',
			src: 'https://edge.eu1.fullstory.com/s/fs.js?org=o-ABC123-na1',
		},
	])(
		'resolves endpoints before bootstrap: $options',
		({ options, host, script, src }) => {
			mount(options);
			expect(loaderElement().src).toBe(src);
			expect(window._fs_org).toBe(options.orgId.trim());
			expect(window._fs_host).toBe(host);
			expect(window._fs_script).toBe(script);
			expect(window._fs_capture_on_startup).toBe(false);
			expect(apiOf().q).toEqual([
				[
					'init',
					{
						env: {
							captureOnStartup: false,
							host,
							orgId: options.orgId.trim(),
							script,
						},
					},
					undefined,
					undefined,
					undefined,
					2,
				],
			]);
		}
	);
	it('snapshots effective options and shares inferred and explicit regional defaults', () => {
		const insertions = sdkInsertions();
		const options = {
			host: ' ',
			orgId: '  o-ABC123-eu1  ',
			script: '\t',
			scriptUrl: ' ',
		};
		const original = fullStory(options);
		const explicit = {
			host: 'eu1.fullstory.com',
			orgId: 'o-ABC123-eu1',
			script: 'edge.eu1.fullstory.com/s/fs.js',
			scriptUrl: 'https://edge.eu1.fullstory.com/s/fs.js?org=o-ABC123-eu1',
		};
		expect(fullStory(explicit)).toBe(original);
		Object.assign(options, {
			host: 'mutated.example.com',
			orgId: 'o-OTHER-ap1',
			script: 'mutated.example.com/fs.js',
			scriptUrl: 'https://mutated.example.com/fs.js',
		});
		const owner = mount(explicit, true, original);
		const element = loaderElement();
		const api = apiOf();
		expect(element.src).toBe(explicit.scriptUrl);
		expect(window._fs_host).toBe(explicit.host);
		expect(window._fs_script).toBe(explicit.script);
		void owner.kernel.commands.save(deniedConsents);
		element.dispatchEvent(new Event('load'));
		void owner.kernel.commands.save(granted);
		owner.loader.dispose();
		mount(explicit);
		expect(apiOf()).toBe(api);
		expect(insertions()).toHaveLength(1);
		expect(api.q?.map(([name]) => name)).toEqual([
			'init',
			'setIdentity',
			'shutdown',
			'setIdentity',
			'restart',
			'setIdentity',
			'shutdown',
			'setIdentity',
			'restart',
		]);
	});
	it('preserves a custom proxy whose path contains a dotted FullStory hostname', () => {
		mount({
			host: ' relay.example.com/path.edge.fullstory.com ',
			orgId: 'o-ABC123-eu1',
			script: ' cdn.example.com/path.edge.fullstory.com/fs.js ',
		});
		expect(window._fs_host).toBe('relay.example.com/path.edge.fullstory.com');
		expect(window._fs_script).toBe(
			'cdn.example.com/path.edge.fullstory.com/fs.js'
		);
		expect(loaderElement().src).toBe(
			'https://cdn.example.com/path.edge.fullstory.com/fs.js?org=o-ABC123-eu1'
		);
	});
	it('normalizes an unrestricted locale only once across lifecycle recreation', () => {
		const insertions = sdkInsertions();
		const options = { orgId: 'o-A&B-eu1.example' };
		const script = fullStory(options);
		const owner = mount(options, true, script);
		const api = apiOf();
		expect(loaderElement().src).toBe(
			'https://edge.eu1.example.fullstory.com/s/fs.js?org=o-A%26B-eu1.example'
		);
		owner.loader.dispose();
		mount(options, true, script);
		expect(window._fs_host).toBe('eu1.example.fullstory.com');
		expect(window._fs_script).toBe('edge.eu1.example.fullstory.com/s/fs.js');
		expect(apiOf()).toBe(api);
		expect(insertions()).toHaveLength(1);
	});

	it.each([
		{ orgId: 'o-OTHER-eu1' },
		{ host: 'relay.example.com', orgId: 'o-ABC123-eu1' },
		{ orgId: 'o-ABC123-eu1', script: 'relay.example.com/fs.js' },
		{
			orgId: 'o-ABC123-eu1',
			scriptUrl: 'https://edge.fullstory.com/s/fs.js?org=o-ABC123-eu1',
		},
	])(
		'requires reload for a changed effective configuration: %j',
		(replacement) => {
			mount({ orgId: 'o-ABC123-eu1' });
			const api = apiOf();
			expect(() => fullStory(replacement)).toThrow(/reload/u);
			expect(apiOf()).toBe(api);
			expect(document.querySelectorAll('script[src]')).toHaveLength(1);
		}
	);
});
