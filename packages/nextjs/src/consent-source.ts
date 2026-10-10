/**
 * Where the server helpers resolve consent from, read from
 * `c15t.config.ts` and the build-time snapshot.
 *
 * @internal
 */
import type { ConsentMode } from '@c15t/core/modes';
import { normalizeRoutePrefix } from '@c15t/core/server';
import {
	backendURL as generatedBackendURL,
	snapshot as generatedSnapshot,
} from '@c15t/nextjs/generated-manifest';
import userConfig from '@c15t/nextjs/user-config';
import type { ConsentManifest } from '@c15t/schema/types';

import type { ConsentConfig } from './config';
import { readBackendURLFromEnv } from './config';

/** Options every server helper takes to override `c15t.config.ts`. */
export interface ConsentSourceOptions {
	/**
	 * The config to use instead of `c15t.config.ts`.
	 */
	config?: ConsentConfig;

	/**
	 * Backend base URL. Defaults to the config's, then
	 * `NEXT_PUBLIC_C15T_BACKEND_URL`, then `NEXT_PUBLIC_INTH_PROJECT_URL`.
	 */
	backendURL?: string;

	/**
	 * Absolute `GET /manifest` URL. Defaults to the mode's absolute
	 * `manifestURL`, then `${backendURL}/manifest`. Setting it resolves
	 * from the manifest whatever the mode.
	 */
	manifestURL?: string;

	/**
	 * A manifest to resolve from, in place of the snapshot
	 * `withConsentManifest` downloaded. Setting it resolves from the
	 * manifest whatever the mode.
	 */
	snapshot?: ConsentManifest;
}

/** What the server resolves from. */
export interface ConsentSource {
	config: ConsentConfig | undefined;
	backendURL: string | undefined;
	mode: 'hosted' | 'manifest' | undefined;
	manifestURL: string | undefined;
	snapshot: ConsentManifest | undefined;
	/** Hosted mode's `/init` headers. */
	initHeaders: Record<string, string> | undefined;
	routePrefix: string | undefined;
}

const isPath = (url: string | undefined): url is string =>
	url !== undefined && url.startsWith('/') && !url.startsWith('//');

/**
 * The config's route prefix, checked: a config passed straight to a helper
 * skips `defineConsentConfig`. A `/`-relative prefix goes through the
 * shared check, which rejects `/`.
 *
 * @param config - The config the helper reads.
 * @returns The prefix without a trailing slash, or `undefined`.
 * @throws {TypeError} When the prefix is `/`.
 * @internal
 */
export const readConfigRoutePrefix = function readConfigRoutePrefix(
	config: ConsentConfig | undefined
): string | undefined {
	const routePrefix = config?.routePrefix;
	if (routePrefix === undefined) {
		return undefined;
	}
	return routePrefix.startsWith('/')
		? normalizeRoutePrefix('@c15t/nextjs', routePrefix)
		: routePrefix.replace(/\/+$/u, '');
};

/** The backend URL: explicit, then the mode's, the config's, the env's, the build's. */
const resolveBackendURL = function resolveBackendURL(
	options: ConsentSourceOptions,
	config: ConsentConfig | undefined,
	mode: ConsentMode
): string | undefined {
	return (
		options.backendURL ??
		(mode.type === 'hosted' ? mode.backendURL : undefined) ??
		config?.backendURL ??
		readBackendURLFromEnv() ??
		generatedBackendURL
	);
};

/** Where `manifest()` (or an explicit manifest source) resolves from. */
const resolveManifestSource = function resolveManifestSource(
	options: ConsentSourceOptions,
	mode: ConsentMode,
	backendURL: string | undefined
): Pick<ConsentSource, 'manifestURL' | 'mode' | 'snapshot'> {
	const manifestMode = mode.type === 'manifest' ? mode : undefined;
	// A `/`-relative manifestURL is the browser's, usually the app's route.
	const modeURL = isPath(manifestMode?.manifestURL)
		? undefined
		: manifestMode?.manifestURL;
	const manifestURL = options.manifestURL ?? modeURL;
	const buildSnapshot =
		manifestURL === undefined && manifestMode?.source !== 'runtime'
			? generatedSnapshot
			: undefined;
	const snapshot = options.snapshot ?? manifestMode?.snapshot ?? buildSnapshot;
	const resolvable =
		snapshot !== undefined ||
		manifestURL !== undefined ||
		backendURL !== undefined;
	return {
		manifestURL,
		mode: resolvable ? 'manifest' : undefined,
		snapshot,
	};
};

/**
 * The config, mode and manifest source for a server helper call.
 *
 * - `manifest()` (the default) resolves from the snapshot, unless the mode
 *   says `source: 'runtime'` or names an absolute `manifestURL`, which the
 *   server then fetches. A `/`-relative `manifestURL` is the browser's,
 *   usually the app's own route, so the server reads
 *   `${backendURL}/manifest` instead.
 * - `hosted()` asks `${backendURL}/init` with the mode's headers.
 * - `offline()` resolves nothing on the server; the browser does.
 *
 * @param options - Explicit overrides of the config.
 * @returns Where to resolve from.
 * @internal
 */
export const resolveConsentSource = function resolveConsentSource(
	options: ConsentSourceOptions = {}
): ConsentSource {
	const config = options.config ?? userConfig;
	const mode: ConsentMode = config?.mode ?? { type: 'manifest' };
	const routePrefix = readConfigRoutePrefix(config);
	const backendURL = resolveBackendURL(options, config, mode);
	const forcedManifest =
		options.manifestURL !== undefined || options.snapshot !== undefined;
	const none = {
		config,
		initHeaders: undefined,
		manifestURL: undefined,
		routePrefix,
		snapshot: undefined,
	};
	if (mode.type === 'offline' && !forcedManifest) {
		return { ...none, backendURL: undefined, mode: undefined };
	}
	if (mode.type === 'hosted' && !forcedManifest) {
		return {
			...none,
			backendURL,
			initHeaders: mode.headers,
			mode: backendURL === undefined ? undefined : 'hosted',
		};
	}
	return {
		...none,
		...resolveManifestSource(options, mode, backendURL),
		backendURL,
	};
};
