/**
 * `XMLHttpRequest.prototype.{open, send}` patch installer.
 *
 * `open` runs first and stashes the (method, url) pair on the XHR
 * instance via Symbol-keyed properties (so we don't collide with
 * userland keys). `send` reads them back and runs the gate.
 *
 * Blocked XHR is signaled via `abort()` plus a synthetic
 * `ProgressEvent('error')` to match what consumers see when the
 * network actually fails — v2 parity.
 */
import type { ConsentSnapshot } from '../../types';
import { evaluateBlock } from './decide';
import type { BlockedRequestInfo, NetworkBlockerRule } from './types';
import { normalizeMethod, parseUrl } from './url';

export interface XhrPatchDeps {
	getRules: () => NetworkBlockerRule[];
	getSnapshot: () => ConsentSnapshot;
	isEnabled: () => boolean;
	notifyBlocked: (info: BlockedRequestInfo) => void;
}

const INTERNAL_METHOD = Symbol('c15t-xhr-method');
const INTERNAL_URL = Symbol('c15t-xhr-url');

/**
 * Install the XHR `open` + `send` patches. Returns a teardown fn that
 * restores the original prototype methods when the patches are still
 * the active wrappers.
 */
export function installXhrPatch(deps: XhrPatchDeps): () => void {
	const originalOpen = XMLHttpRequest.prototype.open;
	const originalSend = XMLHttpRequest.prototype.send;

	const patchedOpen = function patchedOpen(
		this: XMLHttpRequest,
		method: string,
		url: string | URL,
		...rest: unknown[]
	) {
		// biome-ignore lint/suspicious/noExplicitAny: internal symbol-keyed stash
		(this as any)[INTERNAL_METHOD] = normalizeMethod(method);
		// biome-ignore lint/suspicious/noExplicitAny: internal symbol-keyed stash
		(this as any)[INTERNAL_URL] =
			typeof url === 'string' ? url : url.toString();
		// biome-ignore lint/suspicious/noExplicitAny: pass-through to native impl
		return (originalOpen as any).call(this, method, url, ...rest);
	} as typeof XMLHttpRequest.prototype.open;

	const patchedSend = function patchedSend(
		this: XMLHttpRequest,
		body?: Document | XMLHttpRequestBodyInit | null
	) {
		if (!deps.isEnabled()) {
			return originalSend.call(this, body as never);
		}
		// biome-ignore lint/suspicious/noExplicitAny: internal symbol-keyed stash
		const method: string = (this as any)[INTERNAL_METHOD] ?? 'GET';
		// biome-ignore lint/suspicious/noExplicitAny: internal symbol-keyed stash
		const rawUrl: string = (this as any)[INTERNAL_URL] ?? '';
		const url = parseUrl(rawUrl);
		if (!url) return originalSend.call(this, body as never);

		const decision = evaluateBlock(
			url,
			method,
			deps.getRules(),
			deps.getSnapshot()
		);
		if (!decision.shouldBlock) {
			return originalSend.call(this, body as never);
		}

		deps.notifyBlocked({
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

	XMLHttpRequest.prototype.open = patchedOpen;
	XMLHttpRequest.prototype.send = patchedSend;

	return () => {
		if (XMLHttpRequest.prototype.open === patchedOpen) {
			XMLHttpRequest.prototype.open = originalOpen;
		}
		if (XMLHttpRequest.prototype.send === patchedSend) {
			XMLHttpRequest.prototype.send = originalSend;
		}
	};
}
