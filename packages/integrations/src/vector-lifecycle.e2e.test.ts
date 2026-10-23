/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import type { ConsentState, Script } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { vector } from './vendors/ads-and-pixels/vector';

const denied: ConsentState = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};
const granted = { ...denied, marketing: true };
const pixelId = 'c15t-test-pixel';
const disposers: (() => void)[] = [];

interface VectorClient {
	q?: [string, unknown[]][];
	loaded?: boolean;
	load: (...args: unknown[]) => unknown;
	identify: (...args: unknown[]) => unknown;
	on: (...args: unknown[]) => unknown;
}

declare global {
	interface Window {
		vector?: VectorClient;
	}
}

const client = () => window.vector;

const mount = (script: Script = vector({ pixelId }), initial = denied) => {
	const kernel = createConsentKernel();
	void kernel.commands.save(initial);
	const loader = createScriptLoader({ kernel, scripts: [script] });
	disposers.push(kernel.dispose, loader.dispose);
	return { kernel, loader };
};

const pixelElement = () => document.head.querySelector('script');

afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	document.head.replaceChildren();
	document.body.replaceChildren();
	for (const name of [
		'vector',
		'Vector',
		'__vector_manager',
		'__c15tRunSteps',
	]) {
		Reflect.deleteProperty(window, name);
	}
	vi.restoreAllMocks();
});

describe('Vector through the production kernel and script loader', () => {
	it('keeps startup behind marketing consent and queues load before insertion', () => {
		const storageWrites = vi.spyOn(Storage.prototype, 'setItem');
		const storageReads = vi.spyOn(Storage.prototype, 'getItem');
		const cookieBefore = document.cookie;
		const original = document.head.appendChild.bind(document.head);
		const appended = vi.spyOn(document.head, 'appendChild');
		const { kernel } = mount();
		void kernel.commands.save({ ...denied, measurement: true });
		expect(appended).not.toHaveBeenCalled();
		expect(client()).toBeUndefined();
		expect(storageWrites).not.toHaveBeenCalled();
		expect(storageReads).not.toHaveBeenCalled();
		expect(document.cookie).toBe(cookieBefore);

		appended.mockImplementation((node) => {
			expect(client()?.q).toEqual([['load', [pixelId]]]);
			return original(node);
		});
		void kernel.commands.save(granted);
		expect(appended).toHaveBeenCalledOnce();
		expect(pixelElement()?.src).toBe('https://cdn.vector.co/pixel.js');
		expect(pixelElement()?.async).toBe(true);
		expect(client()?.loaded).toBe(true);
	});

	it('replays nested arguments with original objects and callback references', () => {
		mount(vector({ pixelId }), granted);
		const queue = client()?.q;
		const data = { source: 'application' };
		const callback = vi.fn();
		client()?.identify('known-id', data);
		client()?.on('pixel.loaded', callback);
		expect(queue).toEqual([
			['load', [pixelId]],
			['identify', ['known-id', data]],
			['on', ['pixel.loaded', callback]],
		]);
		expect(queue?.[1]?.[1][1]).toBe(data);
		expect(queue?.[2]?.[1][1]).toBe(callback);
		const live = { identify: vi.fn(), load: vi.fn(), on: vi.fn() };
		Reflect.set(window, 'vector', live);
		// Vector replays each entry as manager[name](...args).
		for (const [name, args] of queue ?? []) {
			if (name !== 'load' && name !== 'identify' && name !== 'on') {
				throw new Error(`Unexpected Vector method: ${name}`);
			}
			live[name](...args);
		}
		expect(live.load).toHaveBeenCalledExactlyOnceWith(pixelId);
		expect(live.identify).toHaveBeenCalledExactlyOnceWith('known-id', data);
		expect(live.on).toHaveBeenCalledExactlyOnceWith('pixel.loaded', callback);
	});

	it('starts Vector inline with nested calls and callback references', () => {
		const script = vector({ pixelId });
		const inline = script.serverStart?.(
			{ consents: granted, hasConsent: true, id: script.id },
			script
		);
		expect(inline).toBeDefined();
		// oxlint-disable-next-line no-new-func -- Runs the generated server startup.
		new Function(`${inline?.prelude ?? ''};${inline?.code ?? ''}`)();
		const callback = vi.fn();
		client()?.on('pixel.loaded', callback);
		expect(client()?.q).toEqual([
			['load', [pixelId]],
			['on', ['pixel.loaded', callback]],
		]);
		expect(client()?.q?.[1]?.[1][1]).toBe(callback);
	});

	it.each([false, true])(
		'keeps one SDK across withdrawal and regrant, already loaded=%s',
		(loaded) => {
			const { kernel, loader } = mount(vector({ pixelId }), granted);
			const element = pixelElement();
			const stub = client();
			if (loaded) {
				element?.dispatchEvent(new Event('load'));
			}
			void kernel.commands.save(denied);
			expect(element?.isConnected).toBe(true);
			if (!loaded) {
				element?.dispatchEvent(new Event('load'));
			}
			void kernel.commands.save(granted);
			loader.updateScripts([vector({ pixelId })]);
			expect(pixelElement()).toBe(element);
			expect(document.head.querySelectorAll('script')).toHaveLength(1);
			expect(client()).toBe(stub);
			expect(client()?.q).toEqual([['load', [pixelId]]]);
		}
	);

	it('preserves a previously loaded SDK and never invokes undocumented teardown', () => {
		const live = {
			block: vi.fn(),
			identify: vi.fn(),
			load: vi.fn(),
			on: vi.fn(),
			removeVisitor: vi.fn(),
		};
		Reflect.set(window, 'vector', live);
		const { kernel } = mount(vector({ pixelId }), granted);
		pixelElement()?.dispatchEvent(new Event('load'));
		void kernel.commands.save(denied);
		void kernel.commands.save(granted);
		expect(client()).toBe(live);
		expect(client()?.load).toBe(live.load);
		expect(client()?.identify).toBe(live.identify);
		expect(client()?.on).toBe(live.on);
		expect(live.load).toHaveBeenCalledExactlyOnceWith(pixelId);
		expect(live.block).not.toHaveBeenCalled();
		expect(live.removeVisitor).not.toHaveBeenCalled();
	});

	it.each([
		['   ', 'https://cdn.vector.co/pixel.js'],
		[
			' https://cdn.example.com/vector.js ',
			'https://cdn.example.com/vector.js',
		],
	])('resolves scriptUrl %j and trims the pixel ID', (scriptUrl, expected) => {
		mount(vector({ pixelId: ` ${pixelId} `, scriptUrl }), granted);
		expect(pixelElement()?.src).toBe(expected);
		expect(client()?.q).toEqual([['load', [pixelId]]]);
	});

	it.each(['', '   ', undefined])(
		'skips an absent or blank pixel ID %j',
		(id) => {
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			// Exercise a missing environment value from a JavaScript caller.
			mount(vector({ pixelId: id as string }), granted);
			expect(error).toHaveBeenCalledWith(
				'vector: missing or invalid pixelId. The script will not load.'
			);
			expect(pixelElement()).toBeNull();
			expect(client()).toBeUndefined();
		}
	);
});
