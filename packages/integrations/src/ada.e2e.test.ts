/**
 * @vitest-environment jsdom
 *
 * Runs the production core loader with a mocked Ada module. These tests cover
 * the integration's lifecycle, not execution of Ada's remote runtime.
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	clearAllScripts,
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import type { ada as createAda, AdaOptions } from './vendors/functional/ada';

const SDK_URL = 'https://messaging-assets.ada.support/sdk.js';
const grantedConsents = { ...deniedConsents, functionality: true };

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

describe('Ada Messaging core loader contract', () => {
	registerVendorContractCleanup();

	const client = {
		start: vi.fn<(settings: AdaOptions) => Promise<void>>(),
		stop: vi.fn<() => Promise<void>>(),
	};
	const createAdaEmbedInterface = vi.fn(() => client);
	const evaluateModule = vi.fn();
	let importGate: ReturnType<typeof deferred>;
	let ada: typeof createAda;

	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		client.start.mockReset().mockResolvedValue(undefined);
		client.stop.mockReset().mockResolvedValue(undefined);
		importGate = deferred();
		// oxlint-disable-next-line anti-slop/no-module-mocking -- The remote ESM URL is the vendor boundary; the double controls module evaluation without changing the public helper API.
		vi.doMock(SDK_URL, async () => {
			evaluateModule();
			await importGate.promise;
			return { createAdaEmbedInterface };
		});
		({ ada } = await import('./vendors/functional/ada'));
	});

	afterEach(async () => {
		clearAllScripts();
		importGate.resolve();
		await settle();
		vi.doUnmock(SDK_URL);
	});

	it('waits for functionality consent, then starts one private interface', async () => {
		const scripts = [ada({ handle: ' agent ' })];
		expect(scripts[0]).toMatchObject({ callbackOnly: true, id: 'ada' });
		expect(scripts[0]?.src).toBeUndefined();
		expect(scripts[0]?.alwaysLoad).toBeUndefined();
		expect(loadScripts(scripts, deniedConsents)).toEqual([]);
		await settle();
		expect(evaluateModule).not.toHaveBeenCalled();
		expect(document.querySelector('script, iframe')).toBeNull();
		expect(window).not.toHaveProperty('adaEmbed');
		expect(window).not.toHaveProperty('adaSettings');

		expect(updateScripts(scripts, grantedConsents).loaded).toEqual(['ada']);
		await vi.waitFor(() => expect(evaluateModule).toHaveBeenCalledOnce());
		expect(client.start).not.toHaveBeenCalled();
		importGate.resolve();
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		expect(client.start).toHaveBeenCalledWith({ handle: 'agent' });
		updateScripts(scripts, { ...grantedConsents, measurement: true });
		await settle();
		expect(client.start).toHaveBeenCalledOnce();
		expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
		expect(window).not.toHaveProperty('adaEmbed');
	});

	it('keeps unrelated grants free of SDK requests and browser state writes', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		const send = vi.spyOn(XMLHttpRequest.prototype, 'send');
		const writeStorage = vi.spyOn(Storage.prototype, 'setItem');
		const writeCookie = vi.spyOn(document, 'cookie', 'set');
		const scripts = [ada({ handle: 'agent' })];
		const cookies = document.cookie;
		expect(window.localStorage).toBeInstanceOf(Storage);
		expect(window.sessionStorage).toBeInstanceOf(Storage);
		const local = { ...window.localStorage };
		const session = { ...window.sessionStorage };
		expect(loadScripts(scripts, deniedConsents)).toEqual([]);
		expect(
			updateScripts(scripts, {
				...deniedConsents,
				experience: true,
				marketing: true,
				measurement: true,
			}).loaded
		).toEqual([]);
		await settle();
		expect(evaluateModule).not.toHaveBeenCalled();
		expect(createAdaEmbedInterface).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
		expect(send).not.toHaveBeenCalled();
		expect(writeStorage).not.toHaveBeenCalled();
		expect(writeCookie).not.toHaveBeenCalled();
		expect(document.cookie).toBe(cookies);
		expect({ ...window.localStorage }).toEqual(local);
		expect({ ...window.sessionStorage }).toEqual(session);
		expect(window).not.toHaveProperty('adaEmbed');
		expect(window).not.toHaveProperty('adaSettings');
		expect(document.querySelector('script, iframe')).toBeNull();
	});

	it('deduplicates repeated registration and callbacks for one script configuration', async () => {
		importGate.resolve();
		const script = ada({ handle: 'agent' });
		const scripts = [script, script];
		expect(loadScripts(scripts, grantedConsents)).toEqual(['ada']);
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		expect(updateScripts(scripts, grantedConsents).loaded).toEqual([]);
		await settle();
		expect(evaluateModule).toHaveBeenCalledOnce();
		expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
		expect(client.start).toHaveBeenCalledOnce();
		expect(document.querySelector('script, iframe')).toBeNull();
	});

	it('shares one startup across fresh helper objects with the same script ID', async () => {
		const error = vi.spyOn(console, 'error');
		importGate.resolve();
		const scripts = [
			ada({ cluster: 'eu', handle: 'first' }),
			ada({ cluster: 'us2', handle: 'second' }),
		];
		loadScripts(scripts, grantedConsents);
		updateScripts(scripts, grantedConsents);
		await vi.waitFor(() => expect(client.start).toHaveBeenCalled());
		await settle();
		expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
		expect(client.start).toHaveBeenCalledOnce();
		expect(client.start).toHaveBeenCalledWith({
			cluster: 'eu',
			handle: 'first',
		});
		expect(error).not.toHaveBeenCalled();
	});

	it('cancels pending imports from fresh helper objects when consent is revoked', async () => {
		const error = vi.spyOn(console, 'error');
		const scripts = [
			ada({ cluster: 'eu', handle: 'first' }),
			ada({ cluster: 'us2', handle: 'second' }),
		];
		loadScripts(scripts, grantedConsents);
		updateScripts(scripts, grantedConsents);
		await vi.waitFor(() => expect(evaluateModule).toHaveBeenCalledOnce());
		expect(updateScripts(scripts, deniedConsents).unloaded).toEqual(['ada']);
		importGate.resolve();
		await settle();
		expect(createAdaEmbedInterface).not.toHaveBeenCalled();
		expect(client.start).not.toHaveBeenCalled();
		expect(client.stop).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
	});

	it('revokes the valid helper when an invalid duplicate owns the script ID', async () => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const scripts = [ada({ handle: '' }), ada({ handle: 'agent' })];
		loadScripts(scripts, grantedConsents);
		await vi.waitFor(() => expect(evaluateModule).toHaveBeenCalledOnce());
		updateScripts(scripts, deniedConsents);
		importGate.resolve();
		await settle();
		expect(client.start).not.toHaveBeenCalled();
		expect(createAdaEmbedInterface).not.toHaveBeenCalled();
		expect(error).toHaveBeenCalledExactlyOnceWith(
			'ada: missing or invalid handle. The script will not load.'
		);
	});

	it('obeys vendor denial and revocation while the category stays granted', async () => {
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [ada({ handle: 'agent' })],
		});
		try {
			await kernel.commands.save(grantedConsents, { vendors: { ada: false } });
			await settle();
			expect(evaluateModule).not.toHaveBeenCalled();
			expect(loader.getLoadedScriptIds()).toEqual([]);
			await kernel.commands.save(grantedConsents, { vendors: { ada: true } });
			importGate.resolve();
			await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
			await kernel.commands.save(grantedConsents, { vendors: { ada: false } });
			expect(client.stop).toHaveBeenCalledOnce();
			expect(loader.getLoadedScriptIds()).toEqual([]);
			await kernel.commands.save(grantedConsents, { vendors: { ada: true } });
			await vi.waitFor(() => expect(client.start).toHaveBeenCalledTimes(2));
			expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('waits for the previous configuration to stop before starting a replacement', async () => {
		const stopping = deferred();
		client.stop.mockReturnValueOnce(stopping.promise);
		importGate.resolve();
		loadScripts(
			[ada({ cluster: 'eu', domain: 'ada', handle: 'first' })],
			grantedConsents
		);
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		await settle();
		updateScripts([ada({ handle: 'second' })], grantedConsents);
		expect(client.stop).toHaveBeenCalledOnce();
		await settle();
		expect(client.start).toHaveBeenCalledOnce();
		stopping.resolve();
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledTimes(2));
		expect(client.start).toHaveBeenLastCalledWith({ handle: 'second' });
		expect(createAdaEmbedInterface).toHaveBeenCalledTimes(2);
	});

	it('keeps a shared script active until its last loader releases it', async () => {
		const script = ada({ handle: 'agent' });
		const firstKernel = createConsentKernel();
		const secondKernel = createConsentKernel();
		const firstLoader = createScriptLoader({
			kernel: firstKernel,
			scripts: [script],
		});
		const secondLoader = createScriptLoader({
			kernel: secondKernel,
			scripts: [script],
		});
		try {
			importGate.resolve();
			await firstKernel.commands.save(grantedConsents);
			await secondKernel.commands.save(grantedConsents);
			await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
			firstLoader.dispose();
			expect(client.stop).not.toHaveBeenCalled();
			expect(secondLoader.getLoadedScriptIds()).toEqual(['ada']);
			await secondKernel.commands.save(deniedConsents);
			expect(client.stop).toHaveBeenCalledOnce();
		} finally {
			firstLoader.dispose();
			secondLoader.dispose();
			firstKernel.dispose();
			secondKernel.dispose();
		}
	});

	it('uses the mapped category instead of reading functionality directly', async () => {
		const scripts = [
			{ ...ada({ handle: 'agent' }), category: 'marketing' as const },
		];
		loadScripts(scripts, grantedConsents);
		await settle();
		expect(evaluateModule).not.toHaveBeenCalled();
		updateScripts(scripts, { ...deniedConsents, marketing: true });
		importGate.resolve();
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		updateScripts(scripts, grantedConsents);
		expect(client.stop).toHaveBeenCalledOnce();
	});

	it('skips stale startup when consent is revoked during the module import', async () => {
		const scripts = [ada({ handle: 'agent' })];
		loadScripts(scripts, grantedConsents);
		await vi.waitFor(() => expect(evaluateModule).toHaveBeenCalledOnce());
		expect(updateScripts(scripts, deniedConsents).unloaded).toEqual(['ada']);
		importGate.resolve();
		await settle();
		expect(createAdaEmbedInterface).not.toHaveBeenCalled();
		expect(client.start).not.toHaveBeenCalled();
		updateScripts(scripts, grantedConsents);
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
	});

	it('starts only the current grant when regranted during a pending import', async () => {
		const scripts = [ada({ handle: 'agent' })];
		loadScripts(scripts, grantedConsents);
		await vi.waitFor(() => expect(evaluateModule).toHaveBeenCalledOnce());
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, grantedConsents);
		importGate.resolve();
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
		expect(client.stop).not.toHaveBeenCalled();
	});

	it('cancels a queued grant before the SDK import starts', async () => {
		const scripts = [ada({ handle: 'agent' })];
		loadScripts(scripts, grantedConsents);
		updateScripts(scripts, deniedConsents);
		await settle();
		expect(evaluateModule).not.toHaveBeenCalled();
		expect(createAdaEmbedInterface).not.toHaveBeenCalled();
		expect(client.start).not.toHaveBeenCalled();
	});

	it('stops an active interface once and waits for stop before regrant', async () => {
		const stopping = deferred();
		client.stop.mockReturnValueOnce(stopping.promise);
		importGate.resolve();
		const scripts = [ada({ handle: 'agent' })];
		loadScripts(scripts, grantedConsents);
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		await settle();
		expect(updateScripts(scripts, deniedConsents).unloaded).toEqual(['ada']);
		updateScripts(scripts, deniedConsents);
		expect(client.stop).toHaveBeenCalledOnce();
		updateScripts(scripts, grantedConsents);
		await settle();
		expect(client.start).toHaveBeenCalledOnce();
		stopping.resolve();
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledTimes(2));
		expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
		expect(evaluateModule).toHaveBeenCalledOnce();
	});

	it('interrupts startup immediately and waits for teardown before restarting', async () => {
		const starting = deferred();
		const stopping = deferred();
		client.start.mockImplementationOnce(() => starting.promise);
		client.stop.mockImplementationOnce(() => {
			starting.reject(new Error('start interrupted by stop'));
			return stopping.promise;
		});
		const scripts = [ada({ handle: 'agent' })];
		importGate.resolve();
		loadScripts(scripts, grantedConsents);
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		updateScripts(scripts, deniedConsents);
		expect(client.stop).toHaveBeenCalledOnce();
		updateScripts(scripts, grantedConsents);
		await settle();
		expect(client.start).toHaveBeenCalledOnce();
		stopping.resolve();
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledTimes(2));
		expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
	});

	it('waits for a pending start even when stop resolves first', async () => {
		const starting = deferred();
		client.start.mockReturnValueOnce(starting.promise);
		importGate.resolve();
		const scripts = [ada({ handle: 'agent' })];
		loadScripts(scripts, grantedConsents);
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		updateScripts(scripts, deniedConsents);
		expect(client.stop).toHaveBeenCalledOnce();
		await settle();
		updateScripts(scripts, grantedConsents);
		await settle();
		expect(client.start).toHaveBeenCalledOnce();
		starting.resolve();
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledTimes(2));
	});

	it('retries a failed start on a later granted update', async () => {
		const failure = new Error('temporary start failure');
		client.start.mockRejectedValueOnce(failure);
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		importGate.resolve();
		const scripts = [ada({ handle: 'agent' })];
		loadScripts(scripts, grantedConsents);
		await vi.waitFor(() =>
			expect(error).toHaveBeenCalledWith(
				'ada: failed to start Messaging.',
				failure
			)
		);
		updateScripts(scripts, grantedConsents);
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledTimes(2));
		expect(createAdaEmbedInterface).toHaveBeenCalledOnce();
	});

	it('stops the SDK when the core loader is disposed', async () => {
		importGate.resolve();
		loadScripts([ada({ handle: 'agent' })], grantedConsents);
		await vi.waitFor(() => expect(client.start).toHaveBeenCalledOnce());
		clearAllScripts();
		expect(client.stop).toHaveBeenCalledOnce();
	});

	it('does not start when the core loader is disposed during import', async () => {
		loadScripts([ada({ handle: 'agent' })], grantedConsents);
		await vi.waitFor(() => expect(evaluateModule).toHaveBeenCalledOnce());
		clearAllScripts();
		importGate.resolve();
		await settle();
		expect(createAdaEmbedInterface).not.toHaveBeenCalled();
	});

	it('never imports the SDK for a blank handle', async () => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		loadScripts([ada({ handle: ' ' })], grantedConsents);
		await settle();
		expect(error).toHaveBeenCalledWith(
			'ada: missing or invalid handle. The script will not load.'
		);
		expect(evaluateModule).not.toHaveBeenCalled();
		expect(createAdaEmbedInterface).not.toHaveBeenCalled();
	});
});
