/**
 * `defineConsentConfig` — the URLs a Next.js consent setup needs, declared
 * once and shared by the route handlers, the server prefetch, and the
 * client boundary.
 *
 * Plain data with no `next` imports, so the same module is safe to import
 * from a route file, a Server Component, and a `'use client'` file.
 */

const CONSENT_CONFIG_BRAND = Symbol.for('@c15t/nextjs/consent-config');

/**
 * URLs shared by every side of a Next.js consent setup.
 */
export interface ConsentConfig {
	/**
	 * Backend base URL; `/subjects` writes and, without a manifest, `/init`
	 * reads go here.
	 */
	backendURL: string;

	/**
	 * Same-origin route that serves the cached manifest (from
	 * `createNextConsentRouteHandlers`). Enables manifest mode.
	 */
	manifestURL?: string;

	/**
	 * Same-origin route that resolves init from the cached manifest with the
	 * request's geo (the handlers' `GET`). Enables geo in the browser without
	 * a backend `/init` call.
	 */
	initURL?: string;
}

type BrandedConsentConfig = ConsentConfig & {
	readonly [CONSENT_CONFIG_BRAND]: true;
};

const isProduction = function isProduction(): boolean {
	const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
		.process?.env?.NODE_ENV;
	return nodeEnv === 'production';
};

/**
 * Accepts `/`-relative paths (`/api/consent`) and absolute `http(s)` URLs.
 * Protocol-relative `//host` and bare `api/consent` are rejected: the
 * server helpers resolve relative values against the request host, and
 * both would resolve somewhere the author did not intend.
 */
const isConsentURL = function isConsentURL(value: string): boolean {
	if (value.startsWith('/')) {
		return !value.startsWith('//');
	}
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
};

const assertConsentURL = function assertConsentURL(
	field: keyof ConsentConfig,
	value: unknown,
	required: boolean
): void {
	if (value === undefined) {
		if (required) {
			throw new TypeError(
				`@c15t/nextjs: defineConsentConfig needs \`${field}\`.`
			);
		}
		return;
	}
	if (typeof value !== 'string' || !isConsentURL(value)) {
		throw new TypeError(
			`@c15t/nextjs: defineConsentConfig \`${field}\` must be an absolute http(s) URL or a \`/\`-relative path, received ${JSON.stringify(value)}.`
		);
	}
};

/**
 * Declare the consent URLs once and hand the result to every side of the
 * setup: `createNextConsentRouteHandlers` (route file),
 * `prefetchInitialConsent` (Server Component or `getServerSideProps`),
 * and `ConsentBoundary` (client). Each reads the fields it needs, so the
 * URLs are never repeated.
 *
 * The returned object is frozen plain data: no `next` imports, safe to
 * import from a `'use client'` file, and serializable as a Server Component
 * prop.
 *
 * @param config - Backend base URL plus the optional same-origin routes.
 * @returns The validated, frozen config.
 * @throws {TypeError} When `backendURL` is missing, or any URL is neither an
 * absolute `http(s)` URL nor a `/`-relative path.
 * @example
 * Manifest mode with browser geo, in three files.
 *
 * ```ts
 * // consent.config.ts
 * import { defineConsentConfig } from '@c15t/nextjs';
 *
 * export const consentConfig = defineConsentConfig({
 *   backendURL: 'https://consent.example.com',
 *   // Same-origin routes served by the handlers below.
 *   manifestURL: '/api/consent/manifest',
 *   initURL: '/api/consent/init',
 * });
 * ```
 *
 * ```ts
 * // app/api/consent/manifest/route.ts
 * import { createNextConsentRouteHandlers } from '@c15t/nextjs/api';
 * import { consentConfig } from '@/consent.config';
 *
 * export const { manifestGET: GET } =
 *   createNextConsentRouteHandlers(consentConfig);
 * ```
 *
 * ```ts
 * // app/api/consent/init/route.ts
 * import { createNextConsentRouteHandlers } from '@c15t/nextjs/api';
 * import { consentConfig } from '@/consent.config';
 *
 * export const { GET } = createNextConsentRouteHandlers(consentConfig);
 * ```
 *
 * ```tsx
 * // app/layout.tsx
 * import { ConsentBoundary } from '@c15t/nextjs';
 * import { prefetchInitialConsent } from '@c15t/nextjs/server';
 * import { consentConfig } from '@/consent.config';
 *
 * export default async function RootLayout({ children }) {
 *   const config = await prefetchInitialConsent({ config: consentConfig });
 *   return (
 *     <html>
 *       <body>
 *         <ConsentBoundary config={config} consent={consentConfig}>
 *           {children}
 *         </ConsentBoundary>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * With `initURL` set, the browser fetches init from the same-origin
 * `GET` handler, which resolves the cached manifest with the request's
 * geo headers, so the visitor's country is known without a backend
 * `/init` call. Consent saves still post to `${backendURL}/subjects`.
 * Drop `initURL` to resolve init in the browser from `manifestURL`
 * (no geo), or drop both for hosted mode against `${backendURL}/init`.
 */
export const defineConsentConfig = function defineConsentConfig(
	config: ConsentConfig
): ConsentConfig {
	if (typeof config !== 'object' || config === null) {
		throw new TypeError(
			'@c15t/nextjs: defineConsentConfig expects an object with `backendURL`.'
		);
	}
	assertConsentURL('backendURL', config.backendURL, true);
	assertConsentURL('manifestURL', config.manifestURL, false);
	assertConsentURL('initURL', config.initURL, false);

	if (config.initURL && !config.manifestURL && !isProduction()) {
		console.warn(
			'[c15t] defineConsentConfig: `initURL` without `manifestURL` sends browser init through `initURL`, but `prefetchInitialConsent` still calls the backend `/init` on every request. Set `manifestURL` to the same-origin manifest route so the server resolves init from the cached manifest too.'
		);
	}

	const defined: BrandedConsentConfig = {
		[CONSENT_CONFIG_BRAND]: true,
		backendURL: config.backendURL,
		initURL: config.initURL,
		manifestURL: config.manifestURL,
	};
	return Object.freeze(defined);
};

/**
 * Whether a value came from {@link defineConsentConfig}. The brand is an
 * enumerable symbol, so it survives object spread.
 *
 * @internal
 */
export const isConsentConfig = function isConsentConfig(
	value: unknown
): value is ConsentConfig {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Partial<BrandedConsentConfig>)[CONSENT_CONFIG_BRAND] === true
	);
};
