/**
 * The transport `ConsentRoot` runs for a config's mode, built from
 * `@c15t/core/runtime/client-mode`.
 *
 * Each mode's code loads with `import()` from core's self-contained
 * chunks (`@c15t/core/runtime/lazy-*`), which share no module with the
 * page. A loader that imports a transport module the page also uses
 * makes Turbopack split the page's first-load chunk by which lazy chunk
 * shares each module, costing several hundred bytes gzip per page.
 *
 * @internal
 */
import type { ConsentMode } from '@c15t/core/modes';
import {
	lazyBrowserManifest,
	lazyHosted,
	lazyOffline,
} from '@c15t/core/runtime/client-mode';
import type { LazyBrowserManifestOptions } from '@c15t/core/runtime/client-mode';
import type { ProviderTransportFactory } from '@c15t/react';

/**
 * Bundlers replace `process.env.NODE_ENV` at build time, so production
 * bundles drop the warnings behind it.
 */
declare const process: { env: { NODE_ENV?: string } };

let warnedImplementation = false;

/** Where the transport sends requests. */
export interface NextClientModeOptions {
	/**
	 * Backend URL for saves, and for `GET /init` in hosted mode. With
	 * `proxy`, the route prefix.
	 */
	backendURL?: string;
	/** Prefix of the app's catch-all consent route, such as `/api/c15t`. */
	routePrefix?: string;
}

/**
 * The transport factory for a mode, carrying the mode's data like core's
 * `clientMode()`.
 *
 * - `manifest()` resolved on the server (the default): saves through the
 *   record transport; a re-init loads the hosted transport and asks
 *   `${routePrefix}/init`, else `${backendURL}/init`.
 * - `manifest({ resolve: 'browser' })`: the browser resolver, loaded on
 *   first init, reading `${routePrefix}/manifest`, else
 *   `${backendURL}/manifest`.
 * - `hosted()`: the hosted transport, loaded on first init.
 * - `offline()`: the offline transport, loaded on first init.
 *
 * @param mode - The mode as data, or a transport factory, used as is.
 * @param options - Backend URL and route prefix.
 * @returns A provider transport factory.
 * @throws {Error} When `manifest()` or `hosted()` has no backend URL.
 * @internal
 */
export const createClientMode = function createClientMode(
	mode: ConsentMode | ProviderTransportFactory | undefined,
	options: NextClientModeOptions
): ProviderTransportFactory {
	if (typeof mode === 'function') {
		if (
			process.env.NODE_ENV !== 'production' &&
			mode.kind !== 'custom' &&
			!warnedImplementation
		) {
			warnedImplementation = true;
			console.warn(
				`[c15t] ConsentRoot \`mode\` is the ${mode.kind}() transport itself, so its code ships in the first-load bundle. Use ${mode.kind}() from c15t/next instead: it is plain data, and the root loads the code only when it runs.`
			);
		}
		return mode;
	}
	// `defineConsentConfig` trimmed the prefix and checked that the mode
	// has a backend URL. Without a config there may be none: say so rather
	// than run a mode the app never chose.
	const { routePrefix } = options;
	const data: ConsentMode = mode ?? { type: 'manifest' };
	if (data.type === 'offline') {
		return Object.assign(lazyOffline({ policyRules: data.policyRules }), data);
	}
	// Saves never fall back to `routePrefix`: the route takes writes only
	// with `proxy`, and then `ConsentRoot` passes it as `backendURL`.
	const backendURL =
		(data.type === 'hosted' ? data.backendURL : undefined) ??
		options.backendURL;
	if (!backendURL) {
		throw new Error(
			`@c15t/nextjs: ${data.type}() needs a backend URL. Set NEXT_PUBLIC_C15T_BACKEND_URL, or \`backendURL\` in c15t.config.ts.`
		);
	}
	if (data.type === 'hosted') {
		return Object.assign(
			lazyHosted({ backendURL, headers: data.headers }),
			data
		);
	}
	if (data.resolve === 'browser') {
		const {
			resolve: _resolve,
			source: _source,
			type: _type,
			...browser
		} = data;
		return Object.assign(
			lazyBrowserManifest({
				...browser,
				backendURL,
				manifestURL:
					data.manifestURL ??
					(routePrefix === undefined ? undefined : `${routePrefix}/manifest`),
			} as LazyBrowserManifestOptions),
			data
		);
	}
	return Object.assign(
		lazyHosted({
			backendURL,
			initURL: routePrefix === undefined ? undefined : `${routePrefix}/init`,
			kind: 'manifest',
		}),
		data
	);
};
