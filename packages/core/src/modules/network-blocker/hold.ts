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
 * One caller's share of the hold.
 * @internal
 */
export interface NetworkHold {
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
}

interface Hold {
	owners: Set<Owner>;
	queue: (() => void)[];
	restore: () => void;
}

let active: Hold | null = null;

const sendNothing = (): void => undefined;

const NOT_HELD: NetworkHold = {
	held: false,
	release: () => sendNothing,
};

const replayAll = (queue: (() => void)[]) => () => {
	for (const replay of queue) {
		replay();
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
				return true;
			}
		}
	}
	return false;
};

const joinHold = function joinHold(
	hold: Hold,
	rules: readonly NetworkBlockerRule[]
): NetworkHold {
	const owner: Owner = { rules };
	hold.owners.add(owner);
	return {
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
		if (
			hold &&
			matches(
				hold,
				input,
				init?.method ?? (input instanceof Request ? input.method : undefined)
			)
		) {
			return new Promise((resolve) => {
				hold.queue.push(() => resolve(window.fetch(input, init)));
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
			hold.queue.push(() => XMLHttpRequest.prototype.send.call(this, body));
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
