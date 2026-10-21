/** @vitest-environment jsdom */
import { afterEach, expect, test, vi } from 'vitest';

import { choiceRecords } from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import { createScriptLoader } from '../index';
import type { Script } from '../index';

const disposers: (() => void)[] = [];
afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	document.head.replaceChildren();
	vi.restoreAllMocks();
});

const mount = (scripts: Script[]) => {
	const kernel = createConsentKernel({
		initialRecords: choiceRecords({ measurement: true }),
	});
	const loader = createScriptLoader({ kernel, scripts });
	disposers.push(
		() => kernel.dispose(),
		() => loader.dispose()
	);
	const element = document.querySelector('script');
	if (!element) {
		throw new Error('Expected a mounted script');
	}
	return { element, kernel, loader };
};

test.each([undefined, false, true])(
	'retains an inserted element only with persistAfterDispose=%s',
	(persistAfterDispose) => {
		const onDispose = vi.fn();
		const { loader, element } = mount([
			{
				category: 'measurement',
				id: 'retention',
				onDispose,
				persistAfterDispose,
				src: 'https://example.com/sdk.js',
			},
		]);
		loader.dispose();
		expect(onDispose).toHaveBeenCalledOnce();
		expect(element.isConnected).toBe(persistAfterDispose === true);
	}
);

test.each(['load', 'error'] as const)(
	'remembers an ownerless retained download completing with %s',
	async (completion) => {
		const oldLoad = vi.fn();
		const oldError = vi.fn();
		const script: Script = {
			category: 'measurement',
			id: 'retained-pending',
			onError: oldError,
			onLoad: oldLoad,
			persistAfterDispose: true,
			src: 'https://example.com/sdk.js',
		};
		const { loader, element, kernel } = mount([script]);
		loader.dispose();
		element.dispatchEvent(new Event(completion));
		expect(oldLoad).not.toHaveBeenCalled();
		expect(oldError).not.toHaveBeenCalled();
		const onLoad = vi.fn();
		const onError = vi.fn();
		const next = createScriptLoader({
			kernel,
			scripts: [{ ...script, onError, onLoad }],
		});
		disposers.push(() => next.dispose());
		await Promise.resolve();
		expect(document.querySelectorAll('script')).toHaveLength(1);
		expect(document.querySelector('script')).toBe(element);
		const called = completion === 'load' ? onLoad : onError;
		const untouched = completion === 'load' ? onError : onLoad;
		expect(called).toHaveBeenCalledOnce();
		expect(called.mock.calls[0]?.[0].element).toBe(element);
		expect(untouched).not.toHaveBeenCalled();
	}
);

test('releases callbacks while retaining the element on configuration removal', async () => {
	const oldLoad = vi.fn();
	const onDispose = vi.fn();
	const script: Script = {
		category: 'measurement',
		id: 'retained-removal',
		onDispose,
		onLoad: oldLoad,
		persistAfterDispose: true,
		src: 'https://example.com/sdk.js',
	};
	const { loader, element } = mount([script]);
	loader.updateScripts([]);
	element.dispatchEvent(new Event('load'));
	expect(element.isConnected).toBe(true);
	expect(onDispose).toHaveBeenCalledOnce();
	expect(oldLoad).not.toHaveBeenCalled();
	const nextLoad = vi.fn();
	loader.updateScripts([{ ...script, onLoad: nextLoad }]);
	await Promise.resolve();
	expect(nextLoad).toHaveBeenCalledOnce();
	expect(nextLoad.mock.calls[0]?.[0].element).toBe(element);
});

test('keeps consent withdrawal governed by persistAfterConsentRevoked', async () => {
	const { kernel, element } = mount([
		{
			category: 'measurement',
			id: 'retained-dispose-only',
			persistAfterDispose: true,
			src: 'https://example.com/sdk.js',
		},
	]);
	await kernel.commands.save({ measurement: false });
	expect(element.isConnected).toBe(false);
});

test('removes a re-adopted retained element on consent withdrawal', async () => {
	const script: Script = {
		category: 'measurement',
		id: 'retained-replacement',
		onDispose: vi.fn(),
		persistAfterDispose: true,
		src: 'https://example.com/sdk.js',
	};
	const { kernel, loader, element } = mount([script]);
	loader.updateScripts([{ ...script }]);
	expect(document.querySelector('script')).toBe(element);
	await kernel.commands.save({ measurement: false });
	expect(element.isConnected).toBe(false);
});

test('removes an adopted retained element when its new owner disposes without retention', () => {
	const script: Script = {
		category: 'measurement',
		id: 'retained-new-owner',
		persistAfterDispose: true,
		src: 'https://example.com/sdk.js',
	};
	const { kernel, loader, element } = mount([script]);
	loader.dispose();
	const next = createScriptLoader({
		kernel,
		scripts: [{ ...script, persistAfterDispose: false }],
	});
	disposers.push(() => next.dispose());
	expect(document.querySelector('script')).toBe(element);
	next.dispose();
	expect(element.isConnected).toBe(false);
});
