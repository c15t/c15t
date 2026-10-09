/**
 * The transport `ConsentRoot` runs for a config's mode, built from
 * `@c15t/core/runtime/client-mode`.
 *
 * Each mode's code loads with `import()` through this package's own
 * modules (`./hosted-mode`, `./offline-mode`). Core's default loaders
 * import its transport files directly, which makes Turbopack split the
 * first-load chunk that the record transport shares with them, adding
 * about 600 B gzip to every page.
 *
 * @internal
 */
import type { ConsentMode } from '@c15t/core/modes';
import {
	createLazyInitTransport,
	lazyHosted,
	lazyOffline,
} from '@c15t/core/runtime/client-mode';
import type { BrowserManifestOptions } from '@c15t/core/transports/manifest-browser';
import type { ProviderTransportFactory } from '@c15t/react';

/**
 * Bundlers replace `process.env.NODE_ENV` at build time, so production
 * bundles drop the warnings behind it.
 */
declare const process: { env: { NODE_ENV?: string } };

let warnedImplementation = false;

const loadHostedModule = () => import('./hosted-mode');
const loadOfflineModule = () => import('./offline-mode');

/**
 * Browser resolution, with the resolver loaded on first init. Until then,
 * saves go out through the hosted record transport, which the hosted mode
 * shares.
 */
const lazyBrowserManifest = function lazyBrowserManifest(
	options: BrowserManifestOptions & { backendURL: string }
): ProviderTransportFactory {
	const records = lazyHosted(
		{ backendURL: options.backendURL },
		loadHostedModule
	);
	return Object.assign(
		(context: Parameters<ProviderTransportFactory>[0]) =>
			// `records` never runs init, so it answers from its record half.
			createLazyInitTransport(records(context), async () => {
				const { createBrowserManifestTransport } =
					await import('@c15t/core/transports/manifest-browser');
				return createBrowserManifestTransport(options);
			}),
		{ kind: 'manifest' as const }
	);
};

/** Where the transport sends requests. */
export interface NextClientModeOptions {
	/** Backend URL for saves, and for `GET /init` in hosted mode. */
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
 * - `offline()`, or no backend at all: the offline transport, loaded on
 *   first init.
 *
 * @param mode - The mode as data, or a transport factory, used as is.
 * @param options - Backend URL and route prefix.
 * @returns A provider transport factory.
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
	// has a backend URL. Without one, the root runs offline.
	const { routePrefix } = options;
	const data: ConsentMode = mode ?? { type: 'manifest' };
	const backendURL =
		(data.type === 'hosted' ? data.backendURL : undefined) ??
		options.backendURL ??
		routePrefix;
	if (data.type === 'offline' || !backendURL) {
		const offline =
			data.type === 'offline' ? data : { type: 'offline' as const };
		return Object.assign(
			lazyOffline({ policyRules: offline.policyRules }, loadOfflineModule),
			offline
		);
	}
	if (data.type === 'hosted') {
		return Object.assign(
			lazyHosted({ backendURL, headers: data.headers }, loadHostedModule),
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
			} as BrowserManifestOptions & { backendURL: string }),
			data
		);
	}
	return Object.assign(
		lazyHosted(
			{
				backendURL,
				initURL: routePrefix === undefined ? undefined : `${routePrefix}/init`,
				kind: 'manifest',
			},
			loadHostedModule
		),
		data
	);
};
