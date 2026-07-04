/**
 * `window.fetch` patch installer.
 *
 * The patched function evaluates each request through `evaluateBlock`.
 * If the rules + current snapshot deny the request, a 451 `Response`
 * is returned synchronously and the original `fetch` is never called.
 * Otherwise the original `fetch` runs unchanged.
 *
 * Returns an uninstall function that restores `window.fetch` only if
 * no other consumer has wrapped our patched version on top.
 */
import type { ConsentSnapshot } from '../../types';
import { evaluateBlock } from './decide';
import type { BlockedRequestInfo, NetworkBlockerRule } from './types';
import { normalizeMethod, parseUrl } from './url';

export interface FetchPatchDeps {
	getRules: () => NetworkBlockerRule[];
	getSnapshot: () => ConsentSnapshot;
	isEnabled: () => boolean;
	notifyBlocked: (info: BlockedRequestInfo) => void;
}

/**
 * Install the `window.fetch` patch. Returns a teardown fn that restores
 * the original `fetch` when this install is still the active wrapper.
 */
export function installFetchPatch(deps: FetchPatchDeps): () => void {
	const originalFetch = window.fetch.bind(window);

	function patchedFetch(
		input: RequestInfo | URL,
		init?: RequestInit
	): Promise<Response> {
		if (!deps.isEnabled()) return originalFetch(input, init);

		const method = normalizeMethod(
			init?.method ??
				(typeof Request !== 'undefined' && input instanceof Request
					? input.method
					: undefined)
		);
		const url = parseUrl(input as string | URL | Request);
		if (!url) return originalFetch(input, init);

		const decision = evaluateBlock(
			url,
			method,
			deps.getRules(),
			deps.getSnapshot()
		);
		if (decision.shouldBlock) {
			deps.notifyBlocked({
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

	return () => {
		// Only restore if our patch is still on top — a later consumer may
		// have wrapped us, in which case restoring would skip their layer.
		if (window.fetch === patchedFetch) {
			window.fetch = originalFetch;
		}
	};
}
