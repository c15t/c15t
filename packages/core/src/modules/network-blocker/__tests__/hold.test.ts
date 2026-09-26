/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	optInRule,
	optOutRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import type { InitResponse, KernelTransport } from '../../../types';
import { holdNetworkRequests, releaseNetworkRequests } from '../hold';
import { createNetworkBlocker } from '../index';
import type { NetworkBlockerHandle, NetworkBlockerRule } from '../types';

const rules: NetworkBlockerRule[] = [
	{ category: 'measurement', domain: 'tracker.example' },
];

const pendingKernel = function pendingKernel() {
	let resolveInit: (value: InitResponse) => void = () => {};
	let rejectInit: (error: unknown) => void = () => {};
	const transport: KernelTransport = {
		init: () =>
			new Promise((resolve, reject) => {
				resolveInit = resolve;
				rejectInit = reject;
			}),
	};
	const kernel = createConsentKernel({
		initRetry: false,
		initialPolicyPending: true,
		transport,
	});
	const init = kernel.commands.init();
	return {
		async fail() {
			rejectInit(new Error('manifest unavailable'));
			await init;
		},
		kernel,
		async resolve(rule = optInRule()) {
			resolveInit({
				policyResolution: { ...matchedResolution(rule), version: 1 },
			});
			await init;
		},
	};
};

const flush = () =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});

let original: ReturnType<typeof vi.fn>;
let originalSend: ReturnType<typeof vi.fn>;
let blocker: NetworkBlockerHandle | null = null;
const nativeOpen = XMLHttpRequest.prototype.open;
const nativeSend = XMLHttpRequest.prototype.send;

beforeEach(() => {
	original = vi.fn().mockResolvedValue(new Response('ok'));
	window.fetch = original as unknown as typeof window.fetch;
	originalSend = vi.fn();
	XMLHttpRequest.prototype.send =
		originalSend as unknown as XMLHttpRequest['send'];
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	blocker?.dispose();
	blocker = null;
	releaseNetworkRequests()();
	XMLHttpRequest.prototype.open = nativeOpen;
	XMLHttpRequest.prototype.send = nativeSend;
	vi.restoreAllMocks();
});

describe('holdNetworkRequests', () => {
	test('holds a matching fetch until the blocker takes over and blocks it', async () => {
		holdNetworkRequests(rules);

		const held = window.fetch('https://tracker.example/collect', {
			method: 'POST',
		});
		await window.fetch('https://api.example/data');
		await flush();
		expect(original).toHaveBeenCalledOnce();
		expect(original.mock.calls[0]?.[0]).toBe('https://api.example/data');

		blocker = createNetworkBlocker({ kernel: createConsentKernel(), rules });

		expect((await held).status).toBe(451);
		expect(original).toHaveBeenCalledOnce();
	});

	test('sends a held fetch once a pending policy allows it', async () => {
		const pending = pendingKernel();
		holdNetworkRequests(rules);
		const held = window.fetch('https://tracker.example/collect');

		blocker = createNetworkBlocker({ kernel: pending.kernel, rules });
		await flush();
		// Consent is still unknown: the request waits instead of failing.
		expect(original).not.toHaveBeenCalled();

		await pending.resolve(optOutRule());

		expect((await held).status).toBe(200);
		expect(original).toHaveBeenCalledWith(
			'https://tracker.example/collect',
			undefined
		);
	});

	test('blocks a waiting request when the pending policy denies it', async () => {
		const pending = pendingKernel();
		holdNetworkRequests(rules);
		const held = window.fetch('https://tracker.example/collect');
		blocker = createNetworkBlocker({ kernel: pending.kernel, rules });

		await pending.resolve(optInRule());

		expect((await held).status).toBe(451);
		expect(original).not.toHaveBeenCalled();
	});

	test('blocks a waiting request when the policy fails to load', async () => {
		const pending = pendingKernel();
		blocker = createNetworkBlocker({ kernel: pending.kernel, rules });
		const waiting = window.fetch('https://tracker.example/collect');

		await pending.fail();

		expect((await waiting).status).toBe(451);
		expect(original).not.toHaveBeenCalled();
	});

	test('holds an XHR and replays it through the blocker', () => {
		holdNetworkRequests(rules);
		const xhr = new XMLHttpRequest();
		const onError = vi.fn();
		xhr.addEventListener('error', onError);
		xhr.open('POST', 'https://tracker.example/collect');
		xhr.send();
		expect(originalSend).not.toHaveBeenCalled();

		blocker = createNetworkBlocker({ kernel: createConsentKernel(), rules });

		expect(onError).toHaveBeenCalledOnce();
		expect(originalSend).not.toHaveBeenCalled();
	});

	test('throws for a matching synchronous XHR it cannot hold', () => {
		holdNetworkRequests(rules);
		const xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://tracker.example/collect', false);

		expect(() => xhr.send()).toThrow('Request blocked by consent');
		expect(originalSend).not.toHaveBeenCalled();
	});

	test('leaves nothing behind once the blocker is disposed', async () => {
		holdNetworkRequests(rules);
		holdNetworkRequests(rules);
		blocker = createNetworkBlocker({ kernel: createConsentKernel(), rules });
		blocker.dispose();
		blocker = null;

		expect((await window.fetch('https://tracker.example/collect')).status).toBe(
			200
		);
		expect(original).toHaveBeenCalledOnce();
		expect(XMLHttpRequest.prototype.send).toBe(originalSend);
	});

	test('does nothing without a window', () => {
		vi.stubGlobal('window', undefined);
		try {
			expect(() => holdNetworkRequests(rules)).not.toThrow();
		} finally {
			vi.unstubAllGlobals();
		}
		expect(XMLHttpRequest.prototype.send).toBe(originalSend);
	});
});
