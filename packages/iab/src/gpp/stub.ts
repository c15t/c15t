/**
 * GPP stub.
 *
 * Installs `__gpp` before the CMP loads, as the GPP CMP API requires: `ping`
 * and the event listener commands answer at once, section queries answer
 * `null`, and every other command waits in a queue for the CMP. Also adds
 * the `__gppLocator` frame and the `postMessage` handler that let scripts
 * in iframes reach `__gpp`.
 *
 * @packageDocumentation
 */

import { GPP_VERSION } from './sections';
import type {
	GPPApi,
	GPPCallback,
	GPPEventData,
	GPPPingData,
	GPPQueuedListener,
} from './types';

const LOCATOR_NAME = '__gppLocator';

let stubInitialized = false;
/** The stub this module installed, distinct from a CMP that replaced it. */
let ownedStub: GPPApi | null = null;
let locatorFrame: HTMLIFrameElement | null = null;

const stubPingData = function stubPingData(): GPPPingData {
	return {
		applicableSections: [-1],
		cmpDisplayStatus: 'hidden',
		cmpId: 0,
		cmpStatus: 'stub',
		gppString: '',
		gppVersion: GPP_VERSION,
		parsedSections: {},
		sectionList: [],
		signalStatus: 'not ready',
		supportedAPIs: [],
	};
};

/** Commands the stub answers with `null` instead of queueing. */
const SECTION_QUERIES = new Set(['hasSection', 'getSection', 'getField']);

/**
 * Creates a stub `__gpp`.
 *
 * @returns A function that follows the GPP stub contract.
 *
 * @internal
 */
export const createGPPStub = function createGPPStub(): GPPApi {
	const queue: unknown[][] = [];
	const events: GPPQueuedListener[] = [];
	let lastId = 0;
	return function gppStub(
		...args: [
			command?: string,
			handler?: GPPCallback,
			parameter?: unknown,
			version?: string,
		]
	): unknown {
		const [command, handler, parameter] = args;
		if (args.length === 0) {
			return queue;
		}
		if (command === 'events') {
			return events;
		}
		if (command === 'ping') {
			handler?.(stubPingData(), true);
			return undefined;
		}
		if (command === 'addEventListener') {
			lastId += 1;
			const listener = handler as GPPCallback<GPPEventData> | undefined;
			if (listener) {
				events.push({ callback: listener, id: lastId, parameter });
				listener(
					{
						data: true,
						eventName: 'listenerRegistered',
						listenerId: lastId,
						pingData: stubPingData(),
					},
					true
				);
			}
			return undefined;
		}
		if (command === 'removeEventListener') {
			const index = events.findIndex((event) => event.id === parameter);
			if (index !== -1) {
				events.splice(index, 1);
			}
			handler?.(index !== -1, true);
			return undefined;
		}
		if (command && SECTION_QUERIES.has(command)) {
			handler?.(null, true);
			return undefined;
		}
		queue.push(args);
		return undefined;
	};
};

interface GPPCallMessage {
	command: string;
	parameter?: unknown;
	version?: string;
	callId: string | number;
}

/** Reads a `__gppCall` request, sent as an object or as JSON. */
const readCall = function readCall(
	data: unknown
): { call: GPPCallMessage; json: boolean } | null {
	let message = data;
	let json = false;
	if (typeof data === 'string') {
		try {
			message = JSON.parse(data);
			json = true;
		} catch {
			return null;
		}
	}
	if (!message || typeof message !== 'object' || !('__gppCall' in message)) {
		return null;
	}
	const call = (message as { __gppCall: unknown }).__gppCall;
	if (
		!call ||
		typeof call !== 'object' ||
		typeof (call as GPPCallMessage).command !== 'string' ||
		(call as GPPCallMessage).callId === undefined
	) {
		return null;
	}
	return { call: call as GPPCallMessage, json };
};

/** Answers `__gppCall` messages from frames, in the form they arrived. */
const handlePostMessage = function handlePostMessage(
	event: MessageEvent
): void {
	if (typeof window === 'undefined' || !window.__gpp) {
		return;
	}
	const request = readCall(event.data);
	if (!request) {
		return;
	}
	const { call, json } = request;
	window.__gpp(
		call.command,
		(returnValue, success) => {
			const response = {
				__gppReturn: { callId: call.callId, returnValue, success },
			};
			const source = event.source as Window | null;
			if (source && typeof source.postMessage === 'function') {
				source.postMessage(json ? JSON.stringify(response) : response, '*');
			}
		},
		call.parameter,
		call.version
	);
};

const createLocatorFrame =
	function createLocatorFrame(): HTMLIFrameElement | null {
		if (
			typeof document === 'undefined' ||
			document.querySelector(`iframe[name="${LOCATOR_NAME}"]`)
		) {
			return null;
		}
		const frame = document.createElement('iframe');
		frame.name = LOCATOR_NAME;
		frame.style.display = 'none';
		frame.setAttribute('aria-hidden', 'true');
		frame.tabIndex = -1;
		(document.body ?? document.documentElement).appendChild(frame);
		return frame;
	};

/**
 * Installs the GPP stub, the `__gppLocator` frame and the frame message
 * handler. Call it as early as possible so vendors that load before the
 * CMP can queue calls. Does nothing on the server, when it already ran, or
 * (for `__gpp` itself) when another CMP already installed one.
 *
 * @example
 * ```ts
 * import { initializeGPPStub } from '@c15t/iab/gpp';
 *
 * initializeGPPStub();
 * ```
 */
export const initializeGPPStub = function initializeGPPStub(): void {
	if (typeof window === 'undefined' || stubInitialized) {
		return;
	}
	if (!window.__gpp) {
		ownedStub = createGPPStub();
		window.__gpp = ownedStub;
	}
	locatorFrame = createLocatorFrame();
	window.addEventListener('message', handlePostMessage);
	stubInitialized = true;
};

/**
 * Removes what {@link initializeGPPStub} installed. `__gpp` is removed only
 * while it is still this module's stub.
 */
export const destroyGPPStub = function destroyGPPStub(): void {
	if (typeof window === 'undefined') {
		return;
	}
	window.removeEventListener('message', handlePostMessage);
	locatorFrame?.remove();
	locatorFrame = null;
	if (ownedStub && window.__gpp === ownedStub) {
		delete window.__gpp;
	}
	ownedStub = null;
	stubInitialized = false;
};
