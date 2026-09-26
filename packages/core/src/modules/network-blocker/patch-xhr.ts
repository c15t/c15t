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
import { stashXhr, XHR_REQUEST } from './hold';
import type { XhrStash } from './hold';
import type { BlockedRequestInfo, NetworkBlockerRule } from './types';
import { parseUrl } from './url';

export interface XhrPatchDeps {
	getRules: () => NetworkBlockerRule[];
	getSnapshot: () => ConsentSnapshot;
	isEnabled: () => boolean;
	notifyBlocked: (info: BlockedRequestInfo) => void;
	/**
	 * Promise that settles once consent is known, or `null` when it already
	 * is. An async XHR that would be blocked waits for it and is evaluated
	 * again. A synchronous XHR cannot wait and is blocked.
	 */
	whenSettled?: () => Promise<void> | null;
}

/**
 * Install the XHR `open` + `send` patches. Returns a teardown fn that
 * restores the original prototype methods when the patches are still
 * the active wrappers.
 */
export const installXhrPatch = function installXhrPatch(
	deps: XhrPatchDeps
): () => void {
	const originalOpen = XMLHttpRequest.prototype.open;
	const originalSend = XMLHttpRequest.prototype.send;

	const patchedOpen = function patchedOpen(
		this: XMLHttpRequest,
		method: string,
		url: string | URL,
		...rest: unknown[]
	) {
		stashXhr(this, method, url, rest[0]);
		// oxlint-disable-next-line typescript/no-explicit-any -- pass-through to native impl
		return (originalOpen as any).call(this, method, url, ...rest);
	} as typeof XMLHttpRequest.prototype.open;

	const patchedSend = function patchedSend(
		this: XMLHttpRequest & XhrStash,
		body?: Document | XMLHttpRequestBodyInit | null
	) {
		if (!deps.isEnabled()) {
			return originalSend.call(this, body as never);
		}
		const request = this[XHR_REQUEST];
		const method = request?.method ?? 'GET';
		const url = parseUrl(request?.url ?? '');
		if (!url) {
			return originalSend.call(this, body as never);
		}

		const decision = evaluateBlock(
			url,
			method,
			deps.getRules(),
			deps.getSnapshot()
		);
		if (!decision.shouldBlock) {
			return originalSend.call(this, body as never);
		}
		const settled = request?.sync ? null : deps.whenSettled?.();
		if (settled) {
			void (async () => {
				await settled;
				patchedSend.call(this, body);
			})();
			return;
		}

		deps.notifyBlocked({
			method,
			rule: decision.rule,
			url: url.toString(),
		});
		this.abort();
		// Synthetic error — dispatch via onerror + dispatchEvent (v2 parity).
		const event =
			typeof ProgressEvent === 'undefined'
				? ({ type: 'error' } as Event)
				: new ProgressEvent('error');
		// oxlint-disable-next-line typescript/no-explicit-any -- spec-typed XHR
		if (typeof (this as any).onerror === 'function') {
			// oxlint-disable-next-line typescript/no-explicit-any -- spec-typed XHR
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
};
