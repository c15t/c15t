/**
 * The browser build of `@c15t/tanstack-start/server`, selected by the
 * `browser` export condition.
 *
 * Route definitions ship to the browser, and route files import
 * `consentLoaderOptions` from the server entry. Start strips the server
 * functions that call the other helpers, but the real entry's imports of
 * `@c15t/core` stayed in the client module graph. Rolldown assigns chunks
 * from that graph, so every core module the provider shares with a lazy
 * chunk got a chunk of its own: about 3 KB gzip and 5 extra files on each
 * consent route, and 5 extra files on routes without c15t.
 *
 * The helpers here keep the server entry's names, so client code that
 * survives the server-function transform still builds; calling one in the
 * browser throws.
 *
 * @internal
 */
import type {
	ConsentState,
	createConsentStateHandler as createConsentStateHandlerOnServer,
	mergeInitIntoConsentState as mergeInitIntoConsentStateOnServer,
	resolveConsent as resolveConsentOnServer,
} from './server';

export { consentLoaderOptions } from './libs/loader-options';

const serverOnly = function serverOnly(name: string): Error {
	return new Error(
		`c15t: ${name}() from @c15t/tanstack-start/server reads the request and runs on the server only. Call it inside a server function (createServerFn), a server route or request middleware.`
	);
};

/** Server only; rejects in the browser. */
export const resolveConsent: typeof resolveConsentOnServer =
	function resolveConsent(): Promise<ConsentState> {
		return Promise.reject(serverOnly('resolveConsent'));
	};

/** Server only; throws in the browser. */
export const mergeInitIntoConsentState: typeof mergeInitIntoConsentStateOnServer =
	function mergeInitIntoConsentState(): ConsentState {
		throw serverOnly('mergeInitIntoConsentState');
	};

/** Server only; the handler it returns rejects in the browser. */
export const createConsentStateHandler: typeof createConsentStateHandlerOnServer =
	function createConsentStateHandler() {
		return resolveConsent;
	};
