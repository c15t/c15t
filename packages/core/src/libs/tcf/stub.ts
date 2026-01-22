/**
 * IAB TCF Stub
 *
 * The stub creates the __tcfapi function immediately and queues calls
 * until the real CMP is ready. It also sets up cross-frame communication.
 *
 * Based on IAB TCF specification for CMP stub implementation.
 *
 * @packageDocumentation
 */

import type { PingData, TCFApi, TCFApiCallback } from '../../types/iab-tcf';

// ─────────────────────────────────────────────────────────────────────────────
// Module State
// ─────────────────────────────────────────────────────────────────────────────

/** Whether the stub has been initialized */
let stubInitialized = false;

/** Iframe element for cross-frame communication */
let locatorIframe: HTMLIFrameElement | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Stub Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the initial stub ping response.
 */
function createStubPingData(): PingData {
	return {
		gdprApplies: undefined,
		cmpLoaded: false,
		cmpStatus: 'stub',
		displayStatus: 'hidden',
		apiVersion: '2.2',
		cmpVersion: 0,
		cmpId: 0,
		gvlVersion: 0,
		tcfPolicyVersion: 5, // TCF 2.3
	};
}

/**
 * The stub implementation of __tcfapi.
 *
 * Queues all calls except 'ping' for processing when the real CMP loads.
 */
function createStubApi(): TCFApi {
	const queue: Array<Parameters<TCFApi>> = [];

	const stub = ((
		command: string,
		version: number,
		callback: TCFApiCallback<unknown>,
		parameter?: unknown
	) => {
		if (command === 'ping') {
			// Ping can be handled immediately
			(callback as TCFApiCallback<PingData>)(createStubPingData(), true);
		} else {
			// Queue all other commands
			queue.push([command, version, callback, parameter] as Parameters<TCFApi>);
		}
	}) as TCFApi;

	stub.queue = queue;

	return stub;
}

/**
 * Creates the __tcfapiLocator iframe for cross-frame communication.
 *
 * This allows child iframes (e.g., ad iframes) to locate the CMP
 * by looking for this named iframe in parent frames.
 */
function createLocatorIframe(): HTMLIFrameElement | null {
	if (typeof document === 'undefined') {
		return null;
	}

	// Check if locator already exists
	if (document.querySelector('iframe[name="__tcfapiLocator"]')) {
		return null;
	}

	const iframe = document.createElement('iframe');
	iframe.name = '__tcfapiLocator';
	iframe.style.display = 'none';
	iframe.setAttribute('aria-hidden', 'true');
	iframe.tabIndex = -1;

	// Add to body or document element
	const target = document.body ?? document.documentElement;
	target.appendChild(iframe);

	return iframe;
}

/**
 * Message handler for cross-frame __tcfapi communication.
 */
function handlePostMessage(event: MessageEvent): void {
	if (typeof window === 'undefined' || !window.__tcfapi) {
		return;
	}

	const { data } = event;

	// Check if this is a __tcfapiCall message
	if (!data || typeof data !== 'object' || !('__tcfapiCall' in data)) {
		return;
	}

	const call = data.__tcfapiCall as {
		command: string;
		version: number;
		callId: string;
		parameter?: unknown;
	};

	if (!call || !call.command || !call.callId) {
		return;
	}

	// Execute the command and send response
	(
		window.__tcfapi as (
			command: string,
			version: number,
			callback: TCFApiCallback<unknown>,
			parameter?: unknown
		) => void
	)(
		call.command,
		call.version,
		(returnValue: unknown, success: boolean) => {
			const response = {
				__tcfapiReturn: {
					returnValue,
					success,
					callId: call.callId,
				},
			};

			// Send response back to the caller
			if (event.source && typeof event.source.postMessage === 'function') {
				(event.source as Window).postMessage(response, '*');
			}
		},
		call.parameter
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initializes the IAB TCF stub.
 *
 * This should be called as early as possible in the page lifecycle
 * to ensure __tcfapi is available before any vendors attempt to use it.
 *
 * Features:
 * - Creates __tcfapi function that queues calls
 * - Creates __tcfapiLocator iframe for cross-frame communication
 * - Sets up postMessage handler for iframe communication
 *
 * @example
 * ```typescript
 * // Call early in your app initialization
 * initializeIABStub();
 *
 * // Later, when the real CMP is ready, it will drain the queue
 * const cmpApi = createCMPApi({ cmpId: 28, gvl });
 * ```
 *
 * @public
 */
export function initializeIABStub(): void {
	if (typeof window === 'undefined') {
		return;
	}

	// Don't reinitialize if already done
	if (stubInitialized) {
		return;
	}

	// Create stub API if not already present
	if (!window.__tcfapi) {
		window.__tcfapi = createStubApi();
	}

	// Create locator iframe
	locatorIframe = createLocatorIframe();

	// Set up postMessage handler
	window.addEventListener('message', handlePostMessage);

	stubInitialized = true;
}

/**
 * Gets the queued calls from the stub.
 *
 * @returns Array of queued __tcfapi calls, or empty array if no stub
 *
 * @public
 */
export function getStubQueue(): Array<Parameters<TCFApi>> {
	if (typeof window === 'undefined' || !window.__tcfapi) {
		return [];
	}

	return window.__tcfapi.queue ?? [];
}

/**
 * Clears the stub queue after processing.
 *
 * @public
 */
export function clearStubQueue(): void {
	if (typeof window !== 'undefined' && window.__tcfapi?.queue) {
		window.__tcfapi.queue = [];
	}
}

/**
 * Checks if the stub is currently active (vs the real CMP).
 *
 * @returns True if the current __tcfapi is the stub
 *
 * @public
 */
export function isStubActive(): boolean {
	if (typeof window === 'undefined' || !window.__tcfapi) {
		return false;
	}

	// The stub has a queue property
	return Array.isArray(window.__tcfapi.queue);
}

/**
 * Destroys the IAB stub and cleans up.
 *
 * @public
 */
export function destroyIABStub(): void {
	if (typeof window === 'undefined') {
		return;
	}

	// Remove postMessage handler
	window.removeEventListener('message', handlePostMessage);

	// Remove locator iframe
	if (locatorIframe?.parentNode) {
		locatorIframe.parentNode.removeChild(locatorIframe);
		locatorIframe = null;
	}

	// Don't remove __tcfapi as the real CMP might be using it
	stubInitialized = false;
}

/**
 * Checks if the stub has been initialized.
 *
 * @returns True if the stub has been initialized
 *
 * @public
 */
export function isStubInitialized(): boolean {
	return stubInitialized;
}
