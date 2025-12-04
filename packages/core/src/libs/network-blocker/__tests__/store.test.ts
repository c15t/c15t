/**
 * @fileoverview Tests for the network blocker store integration
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentStoreState } from '../../../store/type';
import type { ConsentState } from '../../../types';
import { shouldBlockRequest } from '../core';
import { createNetworkBlockerManager } from '../store';
import type { NetworkBlockerConfig } from '../types';

vi.mock('../core', () => ({
	shouldBlockRequest: vi.fn(),
}));

const baseConsents: ConsentState = {
	necessary: true,
	functionality: false,
	experience: false,
	marketing: false,
	measurement: false,
};

function createState(
	overrides: Partial<
		Pick<ConsentStoreState, 'consents' | 'networkBlocker'>
	> = {}
): ConsentStoreState {
	return {
		consents: baseConsents,
		networkBlocker: undefined,
		...(overrides as Partial<ConsentStoreState>),
	} as ConsentStoreState;
}

describe('createNetworkBlockerManager', () => {
	let getState: ReturnType<typeof vi.fn>;
	let setState: ReturnType<typeof vi.fn>;
	let originalWindowFetch: typeof window.fetch;
	let originalXMLHttpRequest: typeof window.XMLHttpRequest;

	beforeEach(() => {
		getState = vi.fn();
		setState = vi.fn();
		originalWindowFetch = window.fetch;
		originalXMLHttpRequest = window.XMLHttpRequest;
		vi.clearAllMocks();
	});

	afterEach(() => {
		window.fetch = originalWindowFetch;
		window.XMLHttpRequest = originalXMLHttpRequest;
		vi.restoreAllMocks();
	});

	it('should patch fetch and block matching requests with logging and callback', async () => {
		const config: NetworkBlockerConfig = {
			enabled: true,
			rules: [
				{
					id: 'api-marketing',
					domain: 'api.example.com',
					category: 'marketing',
				},
			],
		};

		const consents: ConsentState = {
			...baseConsents,
			marketing: false,
		};

		const onRequestBlocked = vi.fn();
		config.onRequestBlocked = onRequestBlocked;

		const underlyingFetch = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 200 }));
		window.fetch = underlyingFetch as typeof window.fetch;

		getState.mockReturnValue(
			createState({
				consents,
				networkBlocker: config,
			})
		);

		const manager = createNetworkBlockerManager(
			getState as () => ConsentStoreState,
			setState
		);

		const shouldBlockRequestMock = vi.mocked(shouldBlockRequest);
		shouldBlockRequestMock.mockReturnValue(true);

		const warnSpy = vi
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);

		manager.initializeNetworkBlocker();

		expect(window.fetch).not.toBe(underlyingFetch);

		const response = await window.fetch('https://api.example.com/resource');

		expect(response.status).toBe(451);
		expect(response.statusText).toBe('Request blocked by consent manager');
		expect(underlyingFetch).not.toHaveBeenCalled();

		expect(shouldBlockRequestMock).toHaveBeenCalledTimes(1);
		expect(shouldBlockRequestMock).toHaveBeenCalledWith(
			{
				url: 'https://api.example.com/resource',
				method: 'GET',
			},
			consents,
			config
		);

		expect(warnSpy).toHaveBeenCalledWith(
			'[c15t] Network request blocked by consent manager',
			expect.objectContaining({
				method: 'GET',
				url: 'https://api.example.com/resource',
			})
		);

		expect(onRequestBlocked).toHaveBeenCalledTimes(1);
		expect(onRequestBlocked).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				url: 'https://api.example.com/resource',
			})
		);
	});

	it('should respect logBlockedRequests = false and still call onRequestBlocked', async () => {
		const config: NetworkBlockerConfig = {
			enabled: true,
			logBlockedRequests: false,
			rules: [
				{
					id: 'debug-only',
					domain: 'debug.example.com',
					category: 'experience',
				},
			],
		};

		const consents: ConsentState = {
			...baseConsents,
			experience: false,
		};

		const onRequestBlocked = vi.fn();
		config.onRequestBlocked = onRequestBlocked;

		const underlyingFetch = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 200 }));
		window.fetch = underlyingFetch as typeof window.fetch;

		getState.mockReturnValue(
			createState({
				consents,
				networkBlocker: config,
			})
		);

		const manager = createNetworkBlockerManager(
			getState as () => ConsentStoreState,
			setState
		);

		const shouldBlockRequestMock = vi.mocked(shouldBlockRequest);
		shouldBlockRequestMock.mockReturnValue(true);

		const warnSpy = vi
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);

		manager.initializeNetworkBlocker();

		const response = await window.fetch('https://debug.example.com/test');

		expect(response.status).toBe(451);
		expect(underlyingFetch).not.toHaveBeenCalled();
		expect(onRequestBlocked).toHaveBeenCalledTimes(1);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('should use a consent snapshot for blocking and update it on updateNetworkBlockerConsents', async () => {
		const config: NetworkBlockerConfig = {
			enabled: true,
			rules: [
				{
					id: 'api-marketing',
					domain: 'api.example.com',
					category: 'marketing',
				},
			],
		};

		const initialConsents: ConsentState = {
			...baseConsents,
			marketing: false,
		};

		const updatedConsents: ConsentState = {
			...baseConsents,
			marketing: true,
		};

		const underlyingFetch = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 200 }));
		window.fetch = underlyingFetch as typeof window.fetch;

		// First state used during initialization
		getState.mockReturnValueOnce(
			createState({
				consents: initialConsents,
				networkBlocker: config,
			})
		);

		// Subsequent calls will see updated consents
		getState.mockReturnValue(
			createState({
				consents: updatedConsents,
				networkBlocker: config,
			})
		);

		const manager = createNetworkBlockerManager(
			getState as () => ConsentStoreState,
			setState
		);

		const shouldBlockRequestMock = vi.mocked(shouldBlockRequest);

		// Block when marketing consent is false, allow when true
		shouldBlockRequestMock.mockImplementation((_request, consents) => {
			return !consents.marketing;
		});

		manager.initializeNetworkBlocker();

		// First call should use initial snapshot and be blocked
		const firstResponse = await window.fetch(
			'https://api.example.com/resource'
		);
		expect(firstResponse.status).toBe(451);

		// Update snapshot to use latest consents
		manager.updateNetworkBlockerConsents();

		const secondResponse = await window.fetch(
			'https://api.example.com/resource'
		);

		expect(secondResponse.status).toBe(200);
		expect(underlyingFetch).toHaveBeenCalledTimes(1);
	});

	it('should allow teardown requests before updating consents and block subsequent ones', async () => {
		const config: NetworkBlockerConfig = {
			enabled: true,
			rules: [
				{
					id: 'api-marketing',
					domain: 'api.example.com',
					category: 'marketing',
				},
			],
		};

		const initialConsents: ConsentState = {
			...baseConsents,
			marketing: true,
		};

		const updatedConsents: ConsentState = {
			...baseConsents,
			marketing: false,
		};

		const underlyingFetch = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 200 }));
		window.fetch = underlyingFetch as typeof window.fetch;

		// First state used during initialization (e.g. before user revokes marketing consent)
		getState.mockReturnValueOnce(
			createState({
				consents: initialConsents,
				networkBlocker: config,
			})
		);

		// Subsequent calls will see updated consents (after user revokes marketing consent)
		getState.mockReturnValue(
			createState({
				consents: updatedConsents,
				networkBlocker: config,
			})
		);

		const manager = createNetworkBlockerManager(
			getState as () => ConsentStoreState,
			setState
		);

		const shouldBlockRequestMock = vi.mocked(shouldBlockRequest);

		// Block when marketing consent is false, allow when true
		shouldBlockRequestMock.mockImplementation((_request, consents) => {
			return !consents.marketing;
		});

		manager.initializeNetworkBlocker();

		// First call should use initial snapshot (marketing: true) and be allowed
		const teardownResponse = await window.fetch(
			'https://api.example.com/resource'
		);
		expect(teardownResponse.status).toBe(200);
		expect(underlyingFetch).toHaveBeenCalledTimes(1);

		// After scripts have been torn down, update snapshot so future requests are blocked
		manager.updateNetworkBlockerConsents();

		const blockedResponse = await window.fetch(
			'https://api.example.com/resource'
		);

		expect(blockedResponse.status).toBe(451);
		expect(underlyingFetch).toHaveBeenCalledTimes(1);
	});

	it('should restore original fetch and XHR when disabling via setNetworkBlocker', () => {
		const config: NetworkBlockerConfig = {
			enabled: true,
			rules: [
				{
					id: 'api-marketing',
					domain: 'api.example.com',
					category: 'marketing',
				},
			],
		};

		const consents: ConsentState = {
			...baseConsents,
			marketing: false,
		};

		const underlyingFetch = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 200 }));
		window.fetch = underlyingFetch as typeof window.fetch;

		class MockXMLHttpRequest {
			onerror: ((event: ProgressEvent<EventTarget>) => void) | null = null;
			abort = vi.fn();
			dispatchEvent = vi.fn(() => true);

			// Prototype methods will be patched by the manager
			open(_method: string, _url: string): void {}
			send(_body?: Document | XMLHttpRequestBodyInit | null): void {}
		}

		window.XMLHttpRequest =
			MockXMLHttpRequest as unknown as typeof XMLHttpRequest;

		const originalOpen = window.XMLHttpRequest.prototype.open;
		const originalSend = window.XMLHttpRequest.prototype.send;

		getState.mockReturnValue(
			createState({
				consents,
				networkBlocker: config,
			})
		);

		const manager = createNetworkBlockerManager(
			getState as () => PrivacyConsentState,
			setState
		);

		manager.initializeNetworkBlocker();

		// Fetch and XHR should be patched
		expect(window.fetch).not.toBe(underlyingFetch);
		expect(window.XMLHttpRequest.prototype.open).not.toBe(originalOpen);
		expect(window.XMLHttpRequest.prototype.send).not.toBe(originalSend);

		// Disabling should restore previous implementations
		manager.setNetworkBlocker(undefined);

		expect(setState).toHaveBeenCalledWith(
			expect.objectContaining({ networkBlocker: undefined })
		);
		expect(window.fetch).toBe(underlyingFetch);
		expect(window.XMLHttpRequest.prototype.open).toBe(originalOpen);
		expect(window.XMLHttpRequest.prototype.send).toBe(originalSend);
	});
});
