/**
 * @vitest-environment jsdom
 */

import type { Script } from '@c15t/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	deniedConsentState,
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import type { ada as createAda, AdaOptions } from './ada';

const SDK_URL = 'https://messaging-assets.ada.support/sdk.js';

const deferred = function deferred() {
	let complete!: () => void;
	let fail!: (reason: unknown) => void;
	const promise = new Promise<void>((resolve, reject) => {
		complete = resolve;
		fail = reject;
	});
	return { promise, reject: fail, resolve: complete };
};

const settle = async function settle(): Promise<void> {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
};

describe('ada', () => {
	const client = {
		start: vi.fn<(settings: AdaOptions) => Promise<void>>(),
		stop: vi.fn<() => Promise<void>>(),
	};
	const createAdaEmbedInterface = vi.fn(() => client);
	const evaluateModule = vi.fn();
	let importGate: ReturnType<typeof deferred>;
	let ada: typeof createAda;
	let scripts: Script[];

	const create = (options: AdaOptions = { handle: 'agent' }): Script => {
		const script = ada(options);
		scripts.push(script);
		return script;
	};

	const info = (script: Script, hasConsent: boolean) =>
		createCallbackInfo({ hasConsent, id: script.id });

	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		client.start.mockReset().mockResolvedValue(undefined);
		client.stop.mockReset().mockResolvedValue(undefined);
		importGate = deferred();
		scripts = [];
		// oxlint-disable-next-line anti-slop/no-module-mocking -- The remote ESM URL is the vendor boundary; the double controls module evaluation without changing the public helper API.
		vi.doMock(SDK_URL, async () => {
			evaluateModule();
			await importGate.promise;
			return { createAdaEmbedInterface };
		});
		({ ada } = await import('./ada'));
	});

	afterEach(async () => {
		for (const script of scripts) {
			script.onDispose?.(info(script, false));
		}
		importGate.resolve();
		await settle();
		vi.doUnmock(SDK_URL);
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('matches the functional integration registry without an eager loader', () => {
		const script = create();
		expectScriptMatchesIntegration('ada', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: undefined,
		});
		expect(script.callbackOnly).toBe(true);
		expect(evaluateModule).not.toHaveBeenCalled();
	});

	it.each(['', '   ', undefined, null, {}])(
		'logs and skips the script for invalid handle %s',
		(handle) => {
			expectSkippedScript(
				() => ada({ handle: handle as string }),
				{ category: 'functionality', id: 'ada' },
				'ada: missing or invalid handle'
			);
			expect(evaluateModule).not.toHaveBeenCalled();
		}
	);

	it('keeps module evaluation, globals, and storage behind the hook permission', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		const writeStorage = vi.spyOn(Storage.prototype, 'setItem');
		const script = create();
		const denied = createCallbackInfo({
			consents: { ...deniedConsentState, functionality: true },
			hasConsent: false,
			id: script.id,
		});
		script.onBeforeLoad?.(denied);
		script.onLoad?.(denied);
		script.onConsentChange?.(denied);
		await settle();
		expect(evaluateModule).not.toHaveBeenCalled();
		expect(createAdaEmbedInterface).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
		expect(writeStorage).not.toHaveBeenCalled();
		expect(window).not.toHaveProperty('adaEmbed');
		expect(window).not.toHaveProperty('adaSettings');
		expect(document.querySelector('script, iframe')).toBeNull();
	});

	it('normalises settings, creates a private interface, and starts once', async () => {
		importGate.resolve();
		const script = create({
			cluster: ' eu ',
			domain: ' ada ',
			handle: ' agent ',
		});
		script.onBeforeLoad?.(info(script, true));
		script.onLoad?.(info(script, true));
		script.onConsentChange?.(info(script, true));
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		expect(client.start).toHaveBeenCalledWith({
			cluster: 'eu',
			domain: 'ada',
			handle: 'agent',
		});
		expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
		expect(window).not.toHaveProperty('adaEmbed');
		expect(window).not.toHaveProperty('adaSettings');
	});

	it('omits blank regional settings', async () => {
		importGate.resolve();
		const script = create({ cluster: ' ', domain: '', handle: 'agent' });
		script.onLoad?.(info(script, true));
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		expect(client.start).toHaveBeenCalledWith({ handle: 'agent' });
	});

	it('does not create or start an interface when an import completes after revocation', async () => {
		const script = create();
		script.onLoad?.(info(script, true));
		await vi.waitFor(() => expect(evaluateModule).toHaveBeenCalledOnce());
		script.onConsentChange?.(info(script, false));
		importGate.resolve();
		await settle();
		expect(createAdaEmbedInterface).not.toHaveBeenCalled();
		expect(client.start).not.toHaveBeenCalled();
		expect(client.stop).not.toHaveBeenCalled();
	});

	it('starts only the latest grant after a revoked import completes', async () => {
		const script = create();
		script.onLoad?.(info(script, true));
		await vi.waitFor(() => expect(evaluateModule).toHaveBeenCalledOnce());
		script.onConsentChange?.(info(script, false));
		script.onLoad?.(info(script, true));
		importGate.resolve();
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
	});

	it('interrupts a pending start and waits for start and stop before regrant', async () => {
		importGate.resolve();
		const starting = deferred();
		const stopping = deferred();
		client.start.mockImplementationOnce(() => starting.promise);
		client.stop.mockImplementationOnce(() => {
			starting.reject(new Error('start interrupted by stop'));
			return stopping.promise;
		});
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const script = create();
		script.onLoad?.(info(script, true));
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		script.onConsentChange?.(info(script, false));
		expect(client.stop).toHaveBeenCalledOnce();
		script.onLoad?.(info(script, true));
		await settle();
		expect(client.start).toHaveBeenCalledOnce();
		stopping.resolve();
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledTimes(2));
		expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
		expect(error).not.toHaveBeenCalled();
	});

	it('stops once on revocation and restarts the same private interface', async () => {
		importGate.resolve();
		const script = create();
		script.onLoad?.(info(script, true));
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		script.onConsentChange?.(info(script, false));
		script.onConsentChange?.(info(script, false));
		expect(client.stop).toHaveBeenCalledOnce();
		script.onLoad?.(info(script, true));
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledTimes(2));
		expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
	});

	it('cancels a pending import on disposal even if the payload still has consent', async () => {
		const script = create();
		script.onLoad?.(info(script, true));
		await vi.waitFor(() => expect(evaluateModule).toHaveBeenCalledOnce());
		script.onDispose?.(info(script, true));
		importGate.resolve();
		await settle();
		expect(createAdaEmbedInterface).not.toHaveBeenCalled();
	});

	it('stops an active interface on disposal', async () => {
		importGate.resolve();
		const script = create();
		script.onLoad?.(info(script, true));
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		script.onDispose?.(info(script, true));
		expect(client.stop).toHaveBeenCalledOnce();
	});

	it('reports SDK import failures without an unhandled rejection', async () => {
		const failure = new Error('SDK import failed');
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const script = create();
		script.onLoad?.(info(script, true));
		await vi.waitFor(() => expect(evaluateModule).toHaveBeenCalledOnce());
		importGate.reject(failure);
		await vi.waitFor(() =>
			expect(error).toHaveBeenCalledWith(
				'ada: failed to start Messaging.',
				expect.objectContaining({ cause: failure })
			)
		);
		expect(createAdaEmbedInterface).not.toHaveBeenCalled();
	});

	it('reports start and stop failures', async () => {
		importGate.resolve();
		const startFailure = new Error('start failed');
		const stopFailure = new Error('stop failed');
		client.start.mockRejectedValueOnce(startFailure);
		client.stop.mockRejectedValueOnce(stopFailure);
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const script = create();
		script.onLoad?.(info(script, true));
		await vi.waitFor(() =>
			expect(error).toHaveBeenCalledWith(
				'ada: failed to start Messaging.',
				startFailure
			)
		);
		script.onConsentChange?.(info(script, false));
		await vi.waitFor(() =>
			expect(error).toHaveBeenCalledWith(
				'ada: failed to stop Messaging.',
				stopFailure
			)
		);
	});

	it('can be created and called during SSR without evaluating the SDK', async () => {
		vi.stubGlobal('window', undefined);
		const script = create();
		script.onBeforeLoad?.(info(script, true));
		script.onLoad?.(info(script, true));
		script.onConsentChange?.(info(script, true));
		script.onDispose?.(info(script, true));
		await settle();
		expect(evaluateModule).not.toHaveBeenCalled();
	});
});
