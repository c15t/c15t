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
 * construct: a React provider or `useNetworkBlocker` render, a Svelte
 * component script, a Vue plugin install. `createNetworkBlocker()` ends the
 * hold and replays each held request through its own patches, which send
 * it, block it, or keep it waiting until consent is known.
 *
 * Several callers can hold at once. Each call returns a {@link NetworkHold}
 * for its own rules, so one caller letting go (or its blocker taking over)
 * does not release requests another caller's rules still hold.
 *
 * Only requests matching a rule wait. Everything else goes straight
 * through. A held `fetch` returns a pending promise; a held XHR has not
 * called the native `send()` yet. A synchronous XHR cannot wait, so a
 * matching one throws a `NetworkError`, as a failed synchronous request
 * does.
 *
 * A caller whose blocker failed to load calls {@link NetworkHold.fail}. Its
 * rules then fail closed without hanging: what they held, and every later
 * request they match, is answered at once the way the blocker answers a
 * blocked request, until a blocker that does load takes the hold over.
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

/**
 * One caller's share of the hold.
 * @internal
 */
export interface NetworkHold {
	/**
	 * Stop holding for this caller's rules when no blocker will take over,
	 * for example a runtime disposed before it started. Nothing checked
	 * consent for the requests they held, so none is sent: each one no other
	 * caller's rules match is answered the way the blocker answers a blocked
	 * request (a 451 `Response`, or a failed XHR). The rest stay held. A
	 * no-op once released or blocked.
	 */
	block: () => void;
	/**
	 * The blocker that was to take over failed to load. Answer every request
	 * this caller holds, and every later one its rules match, as blocked (a
	 * 451 `Response`, or a failed XHR) instead of holding it, so nothing
	 * waits for a blocker that may never come. The hold stays in place, so a
	 * blocker that loads later can still take it over. A no-op once
	 * released or blocked.
	 */
	fail: () => void;
	/** Whether this caller's rules still hold requests. */
	readonly held: boolean;
	/**
	 * Stop holding for this caller's rules. Returns a function that sends
	 * each request held so far again, through whatever `fetch` and
	 * `XMLHttpRequest.prototype.send` are installed when it runs. A request
	 * another caller's rules still match is held again. A no-op once
	 * released or after {@link releaseNetworkRequests}.
	 */
	release: () => () => void;
}

interface Owner {
	rules: readonly NetworkBlockerRule[];
	/** Its blocker failed to load: what its rules match is blocked at once. */
	failed?: boolean;
}

/** A held request: sent again through the page, or answered as blocked. */
interface Held {
	block: () => void;
	input: RequestInfo | URL;
	method: string | undefined;
	replay: () => void;
}

interface Hold {
	owners: Set<Owner>;
	queue: Held[];
	restore: () => void;
}

let active: Hold | null = null;

const sendNothing = (): void => undefined;

/**
 * A hold for a caller whose rules hold nothing, for example a blocker
 * created with `enabled: false`. Pass it to `createNetworkBlocker({ hold })`
 * so that blocker takes over nothing, rather than omitting `hold`, which
 * ends every caller's hold.
 * @internal
 */
export const NOT_HELD: NetworkHold = {
	block: sendNothing,
	fail: sendNothing,
	held: false,
	release: () => sendNothing,
};

const replayAll = (queue: Held[]) => () => {
	for (const held of queue) {
		held.replay();
	}
};

/**
 * End the hold for every caller and restore the patched functions. Returns
 * a function that sends every held request again through whatever `fetch`
 * and `XMLHttpRequest.prototype.send` are installed when it runs; call it
 * after the blocker has installed its own patches.
 *
 * Called by `createNetworkBlocker()` when it is not given a `hold`.
 *
 * @returns Replays the held requests. A no-op when nothing was held.
 * @internal
 */
export const releaseNetworkRequests =
	function releaseNetworkRequests(): () => void {
		const hold = active;
		active = null;
		hold?.restore();
		return replayAll(hold?.queue.splice(0) ?? []);
	};

/** What a request gets: sent, held, or blocked at once. */
const SEND = 0;
const HOLD = 1;
const BLOCK = 2;

/**
 * {@link BLOCK} when a failed caller's rule matches the request, else
 * {@link HOLD} when any caller's rule does, else {@link SEND}.
 */
const matches = function matches(
	hold: Hold,
	input: RequestInfo | URL,
	method = 'GET'
): number {
	let url: URL;
	try {
		url = new URL(
			input instanceof Request ? input.url : String(input),
			window.location.href
		);
	} catch {
		return SEND;
	}
	const host = url.hostname.toLowerCase();
	const verb = method.toUpperCase();
	let found = SEND;
	for (const owner of hold.owners) {
		for (const rule of owner.rules) {
			const domain = rule.domain.trim().toLowerCase();
			if (
				domain &&
				(host === domain || host.endsWith(`.${domain}`)) &&
				(typeof rule.pathIncludes !== 'string' ||
					url.pathname.includes(rule.pathIncludes)) &&
				(!rule.methods?.length ||
					rule.methods.some((allowed) => allowed.toUpperCase() === verb))
			) {
				if (owner.failed) {
					return BLOCK;
				}
				found = HOLD;
			}
		}
	}
	return found;
};

/**
 * After owners left or failed without a blocker to take over: end the hold
 * if none remain, and answer as blocked every held request no remaining
 * owner still holds.
 */
const blockUnmatched = function blockUnmatched(hold: Hold): void {
	if (hold.owners.size === 0 && active === hold) {
		active = null;
		hold.restore();
	}
	for (const held of hold.queue.splice(0)) {
		if (active === hold && matches(hold, held.input, held.method) === HOLD) {
			hold.queue.push(held);
		} else {
			held.block();
		}
	}
};

const joinHold = function joinHold(
	hold: Hold,
	rules: readonly NetworkBlockerRule[]
): NetworkHold {
	const owner: Owner = { rules };
	hold.owners.add(owner);
	return {
		block() {
			if (active === hold && hold.owners.delete(owner)) {
				blockUnmatched(hold);
			}
		},
		fail() {
			if (active === hold && hold.owners.has(owner)) {
				owner.failed = true;
				blockUnmatched(hold);
			}
		},
		get held() {
			return active === hold && hold.owners.has(owner);
		},
		release() {
			if (active !== hold || !hold.owners.delete(owner)) {
				return sendNothing;
			}
			if (hold.owners.size === 0) {
				return releaseNetworkRequests();
			}
			// Other callers still hold: resend what only this caller held.
			return replayAll(hold.queue.splice(0));
		},
	};
};

/**
 * Start holding `fetch` and XHR requests that match `rules`. Safe to call
 * more than once (for example from a React render that runs twice); later
 * calls join the running hold with their own rules. A no-op outside the
 * browser.
 *
 * Adapter plumbing: apps configure `networkBlocker` instead.
 *
 * @param rules - Network-blocker rules whose requests should wait.
 * @returns This caller's share of the hold. Pass it to
 *   `createNetworkBlocker({ hold })` to hand its requests to the blocker, or
 *   release it when no blocker will take over.
 * @internal
 */
export const holdNetworkRequests = function holdNetworkRequests(
	rules: readonly NetworkBlockerRule[]
): NetworkHold {
	if (
		typeof window === 'undefined' ||
		typeof window.fetch !== 'function' ||
		typeof XMLHttpRequest === 'undefined'
	) {
		return NOT_HELD;
	}
	if (active) {
		return joinHold(active, rules);
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
		const match = hold ? matches(hold, input, method) : SEND;
		if (match === BLOCK) {
			return Promise.resolve(blockedResponse());
		}
		if (hold && match) {
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
		const match =
			hold && request ? matches(hold, request.url, request.method) : SEND;
		if (hold && request && match) {
			if (request.sync) {
				throw new DOMException('Request blocked by consent', 'NetworkError');
			}
			if (match === BLOCK) {
				failBlockedXhr(this);
				return;
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

	const hold: Hold = {
		owners: new Set(),
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
	};
	active = hold;
	return joinHold(hold, rules);
};

/**
 * Stop holding for `rules` when no blocker will take over, as
 * {@link NetworkHold.block} does, for a caller that kept its rules rather
 * than its hold. Every caller that held with only these rules (matched by
 * reference) lets go; requests other callers' rules still match stay held.
 *
 * @param rules - The rules the caller held with.
 * @internal
 */
export const blockHeldRequests = function blockHeldRequests(
	rules: readonly NetworkBlockerRule[]
): void {
	const hold = active;
	if (!hold) {
		return;
	}
	const dropped = new Set(rules);
	for (const owner of [...hold.owners]) {
		if (owner.rules.every((rule) => dropped.has(rule))) {
			hold.owners.delete(owner);
		}
	}
	blockUnmatched(hold);
};
