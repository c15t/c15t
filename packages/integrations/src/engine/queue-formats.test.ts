/** @vitest-environment jsdom */
import type { Script } from '@c15t/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCallbackInfo } from '../__tests__/helpers';
import { resolveManifest } from '../resolve';
import { vendorManifestContract } from '../types';
import type { DefineQueueMethodsStep, VendorManifest } from '../types';

interface QueueClient {
	q: unknown[][];
	load: (...args: unknown[]) => unknown;
	on: (...args: unknown[]) => unknown;
	empty: (...args: unknown[]) => unknown;
}

declare global {
	interface Window {
		queueSdk?: QueueClient;
	}
}

const client = (): QueueClient => {
	const sdk = window.queueSdk;
	if (!sdk) {
		throw new Error('Expected the queue SDK');
	}
	return sdk;
};
const consents = {
	experience: false,
	functionality: false,
	marketing: true,
	measurement: false,
	necessary: true,
};

const makeScript = (queueFormat: DefineQueueMethodsStep['queueFormat']) =>
	resolveManifest(
		{
			...vendorManifestContract,
			category: 'marketing',
			install: [
				{ name: 'queueSdk', type: 'setGlobal', value: { q: [] } },
				{
					methods: ['load', 'on', 'empty'],
					preserveExisting: true,
					queue: { property: 'q' },
					queueFormat,
					target: 'queueSdk',
					type: 'defineQueueMethods',
				},
				{
					args: ['sample-pixel'],
					global: 'queueSdk',
					method: 'load',
					type: 'callGlobal',
				},
				{ src: 'https://example.com/pixel.js', type: 'loadScript' },
			],
			vendor: 'queue-format-test',
			vendorDetails: {
				name: 'Queue test',
				privacyPolicyUrl: 'https://example.com/privacy',
			},
		} satisfies VendorManifest,
		{}
	);

const start = (script: Script, mode: 'runtime' | 'inline') => {
	const info = { consents, hasConsent: true, id: script.id };
	if (mode === 'runtime') {
		script.onBeforeLoad?.(createCallbackInfo(info));
		return;
	}
	const inline = script.serverStart?.(info, script);
	expect(inline).toBeDefined();
	// oxlint-disable-next-line no-new-func -- Executes the generated server startup.
	new Function(`${inline?.prelude ?? ''};${inline?.code ?? ''}`)();
};

afterEach(() => {
	Reflect.deleteProperty(window, 'queueSdk');
	Reflect.deleteProperty(window, '__c15tRunSteps');
});

describe.each(['runtime', 'inline'] as const)('%s queue formats', (mode) => {
	it('keeps nested arguments, empty calls, objects and callback references', () => {
		start(makeScript('nameAndArgs'), mode);
		const handler = vi.fn();
		const payload = { source: 'app' };
		expect(client().on('ready', handler, payload)).toBeUndefined();
		expect(client().empty()).toBeUndefined();
		expect(client().q).toEqual([
			['load', ['sample-pixel']],
			['on', ['ready', handler, payload]],
			['empty', []],
		]);
		const args = client().q[1]?.[1];
		expect(Array.isArray(args)).toBe(true);
		if (!Array.isArray(args)) {
			throw new Error('Expected a nested argument array');
		}
		expect(args[1]).toBe(handler);
		expect(args[2]).toBe(payload);
		const live = { empty: vi.fn(), load: vi.fn(), on: vi.fn() };
		for (const [name, queuedArgs] of client().q) {
			if (
				(name !== 'load' && name !== 'on' && name !== 'empty') ||
				!Array.isArray(queuedArgs)
			) {
				throw new Error('Expected [methodName, argsArray]');
			}
			live[name](...queuedArgs);
		}
		expect(live.load).toHaveBeenCalledExactlyOnceWith('sample-pixel');
		expect(live.on).toHaveBeenCalledExactlyOnceWith('ready', handler, payload);
		expect(live.empty).toHaveBeenCalledExactlyOnceWith();
	});

	it('preserves loaded SDK methods', () => {
		const live = { empty: vi.fn(), load: vi.fn(), on: vi.fn(), q: [] };
		Reflect.set(window, 'queueSdk', live);
		start(makeScript('nameAndArgs'), mode);
		expect(client()).toBe(live);
		expect(client().load).toBe(live.load);
		expect(client().on).toBe(live.on);
		expect(client().empty).toBe(live.empty);
		expect(live.load).toHaveBeenCalledExactlyOnceWith('sample-pixel');
		expect(live.q).toEqual([]);
	});

	it.each([undefined, 'tuple'] as const)(
		'preserves the existing flat format for %s',
		(queueFormat) => {
			start(makeScript(queueFormat), mode);
			const handler = vi.fn();
			client().on('ready', handler);
			client().empty();
			expect(client().q).toEqual([
				['load', 'sample-pixel'],
				['on', 'ready', handler],
				['empty'],
			]);
			expect(client().q[1]?.[2]).toBe(handler);
		}
	);
});
