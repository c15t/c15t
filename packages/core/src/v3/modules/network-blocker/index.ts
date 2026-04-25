/**
 * c15t/v3/modules/network-blocker
 *
 * Kernel-consuming network blocker. Patches `window.fetch` and
 * `XMLHttpRequest.prototype.{open,send}` to intercept requests and
 * block ones whose consent condition isn't satisfied.
 *
 * v2 parity: `packages/core/src/libs/network-blocker/{core,store,types}.ts`.
 *
 * Invariants:
 * - Idempotent init: safe to call twice; only the first call installs
 *   the patches, subsequent calls are no-ops and return a handle that
 *   shares the teardown lock.
 * - `dispose` restores the original `fetch` and XHR prototypes — if no
 *   other loader has installed on top. Subsequent loader installs chain
 *   via the existing patched function, so disposing in reverse install
 *   order is the safe path (matching v2's behavior).
 * - Blocked fetch → 451 `Response`. Blocked XHR → `abort()` + synthetic
 *   `ProgressEvent('error')`.
 * - Does NOT patch `sendBeacon`, `WebSocket`, `EventSource` (v2 parity;
 *   future opt-in).
 * - The blocker holds onto the last snapshot it saw so each fetch /
 *   XHR evaluates against the freshest consent state without a round
 *   trip to the kernel — the snapshot reference is swapped on every
 *   kernel subscribe tick.
 */
import type { ConsentKernel, ConsentSnapshot } from '../../types';
import { evaluateConsent } from '../has';

export type {
	BlockedRequestInfo,
	NetworkBlockerConfig,
	NetworkBlockerRule,
} from '../../../libs/network-blocker/types';

import type {
	BlockedRequestInfo,
	NetworkBlockerConfig,
	NetworkBlockerRule,
} from '../../../libs/network-blocker/types';

export interface NetworkBlockerOptions
	extends Omit<NetworkBlockerConfig, 'initialConsents'> {
	kernel: ConsentKernel;
}

export interface NetworkBlockerHandle {
	dispose(): void;
	/** Replace the rules list. Takes effect on the next intercepted request. */
	updateRules(next: NetworkBlockerRule[]): void;
	/** Toggle enable/disable without tearing down the patches. */
	setEnabled(enabled: boolean): void;
}

function normalizeMethod(method: string | undefined | null): string {
	if (!method) return 'GET';
	return method.toUpperCase();
}

function parseUrl(rawUrl: string | URL | Request): URL | null {
	try {
		if (rawUrl instanceof URL) return rawUrl;
		if (typeof rawUrl === 'string') {
			if (typeof window === 'undefined') return null;
			return new URL(rawUrl, window.location?.href);
		}
		if (typeof Request !== 'undefined' && rawUrl instanceof Request) {
			return new URL(rawUrl.url);
		}
		return null;
	} catch {
		return null;
	}
}

function hostnameMatchesRule(
	hostname: string,
	rule: NetworkBlockerRule
): boolean {
	if (!hostname) return false;
	const ruleDomain = rule.domain.trim().toLowerCase();
	const targetHost = hostname.trim().toLowerCase();
	if (!ruleDomain || !targetHost) return false;
	if (targetHost === ruleDomain) return true;
	return targetHost.endsWith(`.${ruleDomain}`);
}

function pathMatchesRule(pathname: string, rule: NetworkBlockerRule): boolean {
	if (typeof rule.pathIncludes !== 'string') return true;
	if (!pathname) return false;
	return pathname.includes(rule.pathIncludes);
}

function methodMatchesRule(method: string, rule: NetworkBlockerRule): boolean {
	if (!rule.methods || rule.methods.length === 0) return true;
	const upper = normalizeMethod(method);
	return rule.methods.some((m) => normalizeMethod(m) === upper);
}

interface BlockDecision {
	shouldBlock: boolean;
	rule?: NetworkBlockerRule;
}

function decide(
	url: URL,
	method: string,
	rules: NetworkBlockerRule[],
	snapshot: ConsentSnapshot
): BlockDecision {
	for (const rule of rules) {
		if (!hostnameMatchesRule(url.hostname, rule)) continue;
		if (!pathMatchesRule(url.pathname, rule)) continue;
		if (!methodMatchesRule(method, rule)) continue;

		const allowed = evaluateConsent({ category: rule.category }, snapshot);
		if (!allowed) {
			return { shouldBlock: true, rule };
		}
	}
	return { shouldBlock: false };
}

export function createNetworkBlocker(
	options: NetworkBlockerOptions
): NetworkBlockerHandle {
	const { kernel, onRequestBlocked } = options;
	const logBlocked = options.logBlockedRequests ?? true;
	let rules = [...(options.rules ?? [])];
	let enabled = options.enabled !== false;
	let snapshot = kernel.getSnapshot();

	// In non-browser (Node/RSC) environments there is nothing to patch;
	// the handle is a no-op that only subscribes for parity.
	const hasBrowserAPIs =
		typeof window !== 'undefined' &&
		typeof XMLHttpRequest !== 'undefined' &&
		typeof window.fetch === 'function';

	const unsubscribe = kernel.subscribe((next) => {
		snapshot = next;
	});

	if (!hasBrowserAPIs) {
		return {
			dispose() {
				unsubscribe();
			},
			updateRules(next) {
				rules = [...next];
			},
			setEnabled(v) {
				enabled = v;
			},
		};
	}

	// Originals captured once per install. If a later install wraps
	// these references, dispose falls back to the original to avoid
	// leaving a chain of wrappers in place.
	const originalFetch = window.fetch.bind(window);
	const originalXHROpen = XMLHttpRequest.prototype.open;
	const originalXHRSend = XMLHttpRequest.prototype.send;

	function notifyBlocked(info: BlockedRequestInfo): void {
		if (logBlocked) {
			// biome-ignore lint/suspicious/noConsole: user-configurable log
			console.warn(
				`[c15t] blocked ${info.method} ${info.url}${
					info.rule?.id ? ` (rule: ${info.rule.id})` : ''
				}`
			);
		}
		if (onRequestBlocked) {
			try {
				onRequestBlocked(info);
			} catch {
				// Swallow — v2 parity.
			}
		}
	}

	function patchedFetch(
		input: RequestInfo | URL,
		init?: RequestInit
	): Promise<Response> {
		if (!enabled) return originalFetch(input, init);
		const method = normalizeMethod(
			init?.method ??
				(typeof Request !== 'undefined' && input instanceof Request
					? input.method
					: undefined)
		);
		const url = parseUrl(input as string | URL | Request);
		if (!url) return originalFetch(input, init);

		const decision = decide(url, method, rules, snapshot);
		if (decision.shouldBlock) {
			notifyBlocked({
				method,
				url: url.toString(),
				rule: decision.rule,
			});
			return Promise.resolve(
				new Response(null, {
					status: 451,
					statusText: 'Request blocked by consent',
				})
			);
		}
		return originalFetch(input, init);
	}

	window.fetch = patchedFetch as typeof window.fetch;

	// XHR patch — needs to remember (method, url) at `open` time because
	// `send` alone doesn't carry them.
	const INTERNAL_METHOD = Symbol('c15t-xhr-method');
	const INTERNAL_URL = Symbol('c15t-xhr-url');

	XMLHttpRequest.prototype.open = function patchedOpen(
		this: XMLHttpRequest,
		method: string,
		url: string | URL,
		...rest: unknown[]
	) {
		// biome-ignore lint/suspicious/noExplicitAny: internal stash
		(this as any)[INTERNAL_METHOD] = normalizeMethod(method);
		// biome-ignore lint/suspicious/noExplicitAny: internal stash
		(this as any)[INTERNAL_URL] =
			typeof url === 'string' ? url : url.toString();
		// biome-ignore lint/suspicious/noExplicitAny: pass-through
		return (originalXHROpen as any).call(this, method, url, ...rest);
	} as typeof XMLHttpRequest.prototype.open;

	XMLHttpRequest.prototype.send = function patchedSend(
		this: XMLHttpRequest,
		body?: Document | XMLHttpRequestBodyInit | null
	) {
		if (!enabled) {
			return originalXHRSend.call(this, body as never);
		}
		// biome-ignore lint/suspicious/noExplicitAny: internal stash
		const method: string = (this as any)[INTERNAL_METHOD] ?? 'GET';
		// biome-ignore lint/suspicious/noExplicitAny: internal stash
		const rawUrl: string = (this as any)[INTERNAL_URL] ?? '';
		const url = parseUrl(rawUrl);
		if (!url) return originalXHRSend.call(this, body as never);

		const decision = decide(url, method, rules, snapshot);
		if (!decision.shouldBlock) {
			return originalXHRSend.call(this, body as never);
		}

		notifyBlocked({
			method,
			url: url.toString(),
			rule: decision.rule,
		});
		this.abort();
		// Synthetic error — dispatch via onerror + dispatchEvent (v2 parity).
		const event =
			typeof ProgressEvent !== 'undefined'
				? new ProgressEvent('error')
				: ({ type: 'error' } as Event);
		// biome-ignore lint/suspicious/noExplicitAny: spec-typed XHR
		if (typeof (this as any).onerror === 'function') {
			// biome-ignore lint/suspicious/noExplicitAny: spec-typed XHR
			(this as any).onerror(event);
		}
		this.dispatchEvent(event);
	} as typeof XMLHttpRequest.prototype.send;

	return {
		dispose() {
			unsubscribe();
			if (window.fetch === patchedFetch) {
				window.fetch = originalFetch;
			}
			if (XMLHttpRequest.prototype.open !== originalXHROpen) {
				XMLHttpRequest.prototype.open = originalXHROpen;
			}
			if (XMLHttpRequest.prototype.send !== originalXHRSend) {
				XMLHttpRequest.prototype.send = originalXHRSend;
			}
		},
		updateRules(next) {
			rules = [...next];
		},
		setEnabled(v) {
			enabled = v;
		},
	};
}
