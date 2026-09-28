/**
 * `@c15t/core/modules/network-hold`
 *
 * Holds requests that match network-blocker rules from the moment an
 * adapter knows the rules until `createNetworkBlocker()` installs. The
 * blocker usually loads after the first render, so without the hold a
 * `fetch` or XHR sent from a child component's mount effect would leave
 * before any consent check.
 *
 * Adapters call {@link holdNetworkRequests} synchronously while they
 * construct: a React provider render, a Svelte component script, a Vue
 * plugin install. `createNetworkBlocker()` ends the hold and replays each
 * held request through its own patches, which send it, block it, or keep
 * it waiting until consent is known.
 *
 * Only requests matching a rule wait. Everything else goes straight
 * through. A held `fetch` returns a pending promise; a held XHR has not
 * called the native `send()` yet. A synchronous XHR cannot wait, so a
 * matching one throws a `NetworkError`, as a failed synchronous request
 * does.
 *
 * Ships in first-load JavaScript, so it imports nothing at runtime and
 * matches rules with a compact copy of the logic in `url.ts`.
 */
import type { NetworkBlockerRule } from './types';

/**
 * Key under which a patched `XMLHttpRequest.prototype.open` stores the
 * request for `send` to read back. Shared with the blocker's XHR patch, so
 * an XHR opened during the hold and sent after the blocker took over is
 * still evaluated.
 * @internal
 */
export const XHR_REQUEST = Symbol('c15t-xhr-request');

/** @internal */
export interface XhrStash {
	[XHR_REQUEST]?: { method: string; sync: boolean; url: string };
}

/**
 * Store an XHR's method, URL and sync flag from `open()` arguments.
 * @internal
 */
export const stashXhr = function stashXhr(
	xhr: XMLHttpRequest,
	method: string,
	url: string | URL,
	async: unknown
): void {
	(xhr as XMLHttpRequest & XhrStash)[XHR_REQUEST] = {
		method: method ? method.toUpperCase() : 'GET',
		sync: async === false,
		url: String(url),
	};
};

/**
 * The response the blocker gives a blocked `fetch`: a 451, without calling
 * the network.
 * @internal
 */
export const blockedResponse = function blockedResponse(): Response {
	return new Response(null, {
		status: 451,
		statusText: 'Request blocked by consent',
	});
};

/**
 * How the blocker fails a blocked XHR: `abort()` plus a synthetic
 * `ProgressEvent('error')`, as consumers see when the network fails.
 * @internal
 */
export const failBlockedXhr = function failBlockedXhr(
	xhr: XMLHttpRequest
): void {
	xhr.abort();
	// Synthetic error — dispatch via onerror + dispatchEvent (v2 parity).
	const event =
		typeof ProgressEvent === 'undefined'
			? ({ type: 'error' } as Event)
			: new ProgressEvent('error');
	// oxlint-disable-next-line typescript/no-explicit-any -- spec-typed XHR
	if (typeof (xhr as any).onerror === 'function') {
		// oxlint-disable-next-line typescript/no-explicit-any -- spec-typed XHR
		(xhr as any).onerror(event);
	}
	xhr.dispatchEvent(event);
};

/** A held request: sent again through the page, or answered as blocked. */
interface Held {
	block: () => void;
	input: RequestInfo | URL;
	method: string | undefined;
	replay: () => void;
}

interface Hold {
	queue: Held[];
	restore: () => void;
	rules: Set<NetworkBlockerRule>;
}

let active: Hold | null = null;

const matches = function matches(
	hold: Hold,
	input: RequestInfo | URL,
	method = 'GET'
): boolean {
	let url: URL;
	try {
		url = new URL(
			input instanceof Request ? input.url : String(input),
			window.location.href
		);
	} catch {
		return false;
	}
	const host = url.hostname.toLowerCase();
	const verb = method.toUpperCase();
	for (const rule of hold.rules) {
		const domain = rule.domain.trim().toLowerCase();
		if (
			domain &&
			(host === domain || host.endsWith(`.${domain}`)) &&
			(typeof rule.pathIncludes !== 'string' ||
				url.pathname.includes(rule.pathIncludes)) &&
			(!rule.methods?.length ||
				rule.methods.some((allowed) => allowed.toUpperCase() === verb))
		) {
			return true;
		}
	}
	return false;
};

/**
 * Start holding `fetch` and XHR requests that match `rules`. Safe to call
 * more than once (for example from a React render that runs twice); later
 * calls add their rules to the running hold. A no-op outside the browser.
 *
 * Adapter plumbing: apps configure `networkBlocker` instead.
 *
 * @param rules - Network-blocker rules whose requests should wait.
 * @internal
 */
export const holdNetworkRequests = function holdNetworkRequests(
	rules: readonly NetworkBlockerRule[]
): void {
	if (
		typeof window === 'undefined' ||
		typeof window.fetch !== 'function' ||
		typeof XMLHttpRequest === 'undefined'
	) {
		return;
	}
	if (active) {
		for (const rule of rules) {
			active.rules.add(rule);
		}
		return;
	}
	const originalFetch = window.fetch;
	const proto = XMLHttpRequest.prototype;
	const { open: originalOpen, send: originalSend } = proto;

	const heldFetch = function heldFetch(
		input: RequestInfo | URL,
		init?: RequestInit
	): Promise<Response> {
		const hold = active;
		const method =
			init?.method ?? (input instanceof Request ? input.method : undefined);
		if (hold && matches(hold, input, method)) {
			return new Promise((resolve) => {
				hold.queue.push({
					block: () => resolve(blockedResponse()),
					input,
					method,
					replay: () => resolve(window.fetch(input, init)),
				});
			});
		}
		return originalFetch.call(window, input, init);
	};

	const heldOpen = function heldOpen(
		this: XMLHttpRequest,
		method: string,
		url: string | URL,
		...rest: unknown[]
	) {
		stashXhr(this, method, url, rest[0]);
		// oxlint-disable-next-line typescript/no-explicit-any -- pass-through to native impl
		return (originalOpen as any).call(this, method, url, ...rest);
	} as typeof proto.open;

	const heldSend = function heldSend(
		this: XMLHttpRequest & XhrStash,
		body?: Document | XMLHttpRequestBodyInit | null
	) {
		const hold = active;
		const request = this[XHR_REQUEST];
		if (hold && request && matches(hold, request.url, request.method)) {
			if (request.sync) {
				throw new DOMException('Request blocked by consent', 'NetworkError');
			}
			hold.queue.push({
				block: () => failBlockedXhr(this),
				input: request.url,
				method: request.method,
				replay: () => XMLHttpRequest.prototype.send.call(this, body),
			});
			return;
		}
		return originalSend.call(this, body as never);
	} as typeof proto.send;

	window.fetch = heldFetch as typeof window.fetch;
	proto.open = heldOpen;
	proto.send = heldSend;

	active = {
		queue: [],
		// A wrapper installed on top keeps ours in its chain; the hold is
		// then a pass-through because `active` is cleared first.
		restore() {
			if (window.fetch === heldFetch) {
				window.fetch = originalFetch;
			}
			if (proto.open === heldOpen) {
				proto.open = originalOpen;
			}
			if (proto.send === heldSend) {
				proto.send = originalSend;
			}
		},
		rules: new Set(rules),
	};
};

/**
 * End the hold and restore the patched functions. Returns a function that
 * sends every held request again through whatever `fetch` and
 * `XMLHttpRequest.prototype.send` are installed when it runs; call it
 * after the blocker has installed its own patches.
 *
 * Called by `createNetworkBlocker()`.
 *
 * @returns Replays the held requests. A no-op when nothing was held.
 * @internal
 */
export const releaseNetworkRequests =
	function releaseNetworkRequests(): () => void {
		const hold = active;
		active = null;
		hold?.restore();
		return () => {
			for (const held of hold?.queue.splice(0) ?? []) {
				held.replay();
			}
		};
	};

/**
 * Stop holding for `rules` when no blocker will take over, for example a
 * runtime disposed before it started. Nothing checked consent for the
 * requests they held, so none is sent: each one no remaining rule matches
 * is answered the way the blocker answers a blocked request (a 451
 * `Response`, or a failed XHR). Requests other callers' rules still match
 * stay held. The hold ends once no rules remain.
 *
 * Rules are matched by reference, as {@link holdNetworkRequests} added
 * them.
 *
 * @param rules - The rules this caller held with.
 * @internal
 */
export const blockHeldRequests = function blockHeldRequests(
	rules: readonly NetworkBlockerRule[]
): void {
	const hold = active;
	if (!hold) {
		return;
	}
	for (const rule of rules) {
		hold.rules.delete(rule);
	}
	if (hold.rules.size === 0) {
		active = null;
		hold.restore();
	}
	for (const held of hold.queue.splice(0)) {
		if (active === hold && matches(hold, held.input, held.method)) {
			hold.queue.push(held);
		} else {
			held.block();
		}
	}
};
