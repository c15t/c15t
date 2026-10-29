/**
 * `@c15t/core/modes` — consent modes as plain data.
 *
 * Server-framework packages (Next.js, TanStack Start, Nuxt, Astro and
 * SvelteKit) read their config on the server and in the browser, and Nuxt
 * and Astro serialize it. A transport factory can't cross that boundary, so
 * these factories return a serializable `{ type, …options }` object. Each
 * framework's client turns it into a transport with
 * `@c15t/core/runtime/client-mode`, which loads every non-default mode with
 * `import()`.
 *
 * This module has no runtime imports, so importing it adds only these
 * functions to a bundle.
 *
 * Single-page apps use the implementation factories instead (`hosted()` and
 * `local()` from `@c15t/core`, `manifest()` from
 * `@c15t/core/transports/manifest-browser`). They carry the same `type` and
 * options, so a value of either kind satisfies {@link ConsentMode}.
 */
import type { ConsentManifest, PolicyRule } from '@c15t/schema/types';

/** A visitor location known before init, such as one an edge worker injected. */
export interface ManifestModeInputs {
	/** ISO 3166-1 alpha-2 country code, such as `DE`. */
	country?: string;
	/** ISO 3166-2 subdivision code without the country prefix, such as `CA`. */
	region?: string;
}

/** Options every `manifest()` accepts, wherever it resolves. */
export interface ManifestModeBaseOptions {
	/**
	 * Where to fetch the manifest at runtime. On the server it defaults to
	 * `${backendURL}/manifest`. In the browser it defaults to
	 * `${routePrefix}/manifest`, else `${backendURL}/manifest`.
	 */
	manifestURL?: string;
	/**
	 * A same-origin route that answers with the visitor's
	 * `{ country, region }`. Browser resolution only: asked when the
	 * manifest's policy depends on a location the browser doesn't know yet.
	 */
	geoURL?: string;
	/**
	 * The visitor's location, when the page already knows it. Browser
	 * resolution only. Kernel overrides win over these.
	 */
	inputs?: ManifestModeInputs;
}

/**
 * Where the manifest comes from. `snapshot` and `source` are mutually
 * exclusive: a manifest you pass in is its own source.
 */
export type ManifestModeSourceOptions =
	| {
			/**
			 * `'build'` (default) uses the snapshot the build integration
			 * fetched. With none, such as in dev or after
			 * `onBuildError: 'runtime'`, the manifest is fetched at runtime.
			 * `'runtime'` always fetches it at runtime.
			 */
			source?: 'build' | 'runtime';
			snapshot?: never;
	  }
	| {
			/** A manifest you supply yourself. */
			snapshot: ConsentManifest;
			source?: never;
	  };

/** Options for the data `manifest()` from `@c15t/core/modes`. */
export type ManifestModeOptions = ManifestModeBaseOptions &
	ManifestModeSourceOptions & {
		/**
		 * Where init is resolved. `'server'` (default) resolves on the server
		 * and ships no resolver to the browser. `'browser'` loads the resolver
		 * in the browser, for pages the server doesn't render per visitor.
		 * Server-framework packages only.
		 */
		resolve?: 'server' | 'browser';
	};

/** Resolve init from the backend's consent manifest. */
export type ManifestMode = { type: 'manifest' } & ManifestModeOptions;

/** Options for the data `hosted()` from `@c15t/core/modes`. */
export interface HostedModeOptions {
	/**
	 * Backend URL. Can be relative (`/api/c15t`) or absolute. Defaults to the
	 * framework's top-level `backendURL`, then the value the build
	 * integration read from the framework's public env var.
	 */
	backendURL?: string;
	/** Headers forwarded to the backend's `GET /init`. */
	headers?: Record<string, string>;
}

/** Ask the backend's `/init` for every visitor's policy. */
export interface HostedMode extends HostedModeOptions {
	type: 'hosted';
}

/** Options for the data `local()` from `@c15t/core/modes`. */
export interface OfflineModeOptions {
	/**
	 * Rules to resolve locally. Omit them to use `recommendedPolicyRules()`.
	 * Passing rules replaces that pack entirely.
	 */
	policyRules?: PolicyRule[];
	/**
	 * Hide the development warning that local mode keeps no consent records.
	 *
	 * Local mode keeps consent only in the visitor's browser. c15t keeps no
	 * server-side record of it, and with no geolocation every visitor gets
	 * the same policy. Set this to `true` once you have decided that is
	 * enough, such as in tests or on a site that records consent another
	 * way. It changes nothing else. c15t v4 will require it.
	 *
	 * @defaultValue false
	 * @see https://c15t.com/docs/concepts/modes
	 */
	acknowledgeNoRecords?: boolean;
}

/**
 * Resolve policy rules locally, with no backend. Its `type` stays
 * `'offline'` until c15t v4.
 */
export interface OfflineMode extends OfflineModeOptions {
	type: 'offline';
}

/** Every consent mode, as data. */
export type ConsentMode = ManifestMode | HostedMode | OfflineMode;

/** The `type` of a {@link ConsentMode}. */
export type ConsentModeType = ConsentMode['type'];

/**
 * Resolve init from the backend's consent manifest. The default mode in
 * every server-framework package.
 *
 * @param options - Where the manifest comes from and where init resolves.
 * @returns A serializable manifest mode.
 * @example
 * ```ts
 * import { manifest } from '@c15t/core/modes';
 *
 * const mode = manifest();
 * const staticPages = manifest({ resolve: 'browser' });
 * ```
 */
export const manifest = function manifest(
	options: ManifestModeOptions = {}
): ManifestMode {
	return { ...options, type: 'manifest' };
};

/**
 * Ask the backend's `/init` for every visitor's policy.
 *
 * @param options - Backend URL and init headers.
 * @returns A serializable hosted mode.
 * @example
 * ```ts
 * import { hosted } from '@c15t/core/modes';
 *
 * const mode = hosted({ backendURL: 'https://your-project.inth.app' });
 * ```
 */
export const hosted = function hosted(
	options: HostedModeOptions = {}
): HostedMode {
	return { ...options, type: 'hosted' };
};

/**
 * Resolve policy rules locally, with no backend. Consent stays in the
 * visitor's browser, and c15t keeps no server-side record of it. Use it for
 * development and tests. In development builds it warns once per page until
 * you set `acknowledgeNoRecords: true`.
 *
 * @param options - Rules to resolve, omitted for the recommended pack, and
 *   `acknowledgeNoRecords`.
 * @returns A serializable local mode.
 * @example
 * ```ts
 * import { local } from '@c15t/core/modes';
 *
 * const mode = local({ acknowledgeNoRecords: true });
 * ```
 */
export const local = function local(
	options: OfflineModeOptions = {}
): OfflineMode {
	return { ...options, type: 'offline' };
};

/**
 * The old name for {@link local}.
 *
 * @deprecated Use `local()`. c15t v4 removes `offline()`.
 */
export const offline = local;
