/**
 * `defineConsentConfig` — the URLs a Next.js consent setup needs, declared
 * once and shared by the route handlers, `resolveConsent`, and the client
 * `ConsentRoot`.
 *
 * Plain data with no `next` imports, so the same module is safe to import
 * from a route file, a Server Component, and a `'use client'` file.
 */

import type { ConsentJourneyOption } from '@c15t/core';

const CONSENT_CONFIG_BRAND = Symbol.for('@c15t/nextjs/consent-config');

/**
 * Next.js replaces this exact expression with the variable's build-time
 * value in server and browser bundles, so it must stay written out in full.
 * Outside Next.js there may be no `process` at all.
 */
declare const process: { env: Record<string, string | undefined> };

/** Environment variable `backendURL` defaults to. */
export const BACKEND_URL_ENV = 'NEXT_PUBLIC_C15T_BACKEND_URL';

/**
 * `NEXT_PUBLIC_C15T_BACKEND_URL`, or `undefined` when it is unset or the
 * runtime has no `process`.
 *
 * @internal
 */
export const readBackendURLFromEnv = function readBackendURLFromEnv():
	| string
	| undefined {
	try {
		return process.env.NEXT_PUBLIC_C15T_BACKEND_URL || undefined;
	} catch {
		return undefined;
	}
};

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
	 * Where the catch-all consent route from `createConsentRoute` is
	 * mounted, such as `/api/c15t` for `app/api/c15t/[...c15t]/route.ts`.
	 * Sets `manifestURL` to `${routePrefix}/manifest` and `initURL` to
	 * `${routePrefix}/init` unless they are given, so the browser and
	 * `resolveConsent` use the route and never fetch it from the server.
	 *
	 * Same meaning as TanStack Start's `routePrefix`, without its
	 * `/api/c15t` default: here setting it switches the browser from hosted
	 * mode to the route, and `/api/c15t` may instead be a rewrite to the
	 * backend.
	 */
	routePrefix?: string;

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

	/**
	 * The consent journey scope, read by both `resolveConsent` and
	 * `ConsentRoot` so they agree.
	 */
	journey?: ConsentJourneyOption;
}

/**
 * What {@link defineConsentConfig} accepts: a {@link ConsentConfig} whose
 * `backendURL` may come from `NEXT_PUBLIC_C15T_BACKEND_URL` instead.
 */
export type ConsentConfigInput = Omit<ConsentConfig, 'backendURL'> & {
	/**
	 * Backend base URL.
	 *
	 * @default process.env.NEXT_PUBLIC_C15T_BACKEND_URL
	 */
	backendURL?: string;
};

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
				field === 'backendURL'
					? `@c15t/nextjs: defineConsentConfig needs \`backendURL\`, or ${BACKEND_URL_ENV} set at build time.`
					: `@c15t/nextjs: defineConsentConfig needs \`${field}\`.`
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
 * setup: `createConsentRoute` (route file), `resolveConsent` (Server
 * Component or `getServerSideProps`), and `ConsentRoot` (client). Each reads
 * the fields it needs, so the URLs are never repeated.
 *
 * The returned object is frozen data with no `next` imports, safe to import
 * from a route file, a Server Component and a `'use client'` file. It is not
 * a Server Component prop: its symbol brand cannot cross the server/client
 * boundary, so import it in the client file that renders `ConsentRoot`.
 *
 * @param input - Backend base URL (defaults to
 * `NEXT_PUBLIC_C15T_BACKEND_URL`) plus the optional same-origin routes.
 * @returns The validated, frozen config.
 * @throws {TypeError} When no backend URL is set, or any URL is neither an
 * absolute `http(s)` URL nor a `/`-relative path.
 * @example
 * Manifest mode with browser geo: one catch-all route serves both
 * `/api/c15t/manifest` and `/api/c15t/init`.
 *
 * ```ts
 * // c15t.config.ts (backend URL from NEXT_PUBLIC_C15T_BACKEND_URL)
 * import { defineConsentConfig } from '@c15t/nextjs';
 *
 * export const consentConfig = defineConsentConfig({ routePrefix: '/api/c15t' });
 * ```
 *
 * ```ts
 * // app/api/c15t/[...c15t]/route.ts
 * import { createConsentRoute } from '@c15t/nextjs/api';
 * import { consentConfig } from '@/c15t.config';
 *
 * export const { GET } = createConsentRoute(consentConfig);
 * ```
 *
 * ```tsx
 * // components/consent.tsx
 * 'use client';
 * import { ConsentRoot } from '@c15t/nextjs';
 * import { consentConfig } from '@/c15t.config';
 *
 * export function Consent({ children, state }) {
 *   return (
 *     <ConsentRoot state={state} config={consentConfig}>
 *       {children}
 *     </ConsentRoot>
 *   );
 * }
 * ```
 *
 * ```tsx
 * // app/layout.tsx
 * import { resolveConsent } from '@c15t/nextjs/server';
 * import { consentConfig } from '@/c15t.config';
 * import { Consent } from '@/components/consent';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <Consent state={resolveConsent(consentConfig)}>{children}</Consent>
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
 * Set only `manifestURL` to resolve init in the browser (no geo), or drop
 * the routes for hosted mode against `${backendURL}/init`.
 */
export const defineConsentConfig = function defineConsentConfig(
	input: ConsentConfigInput = {}
): ConsentConfig {
	if (typeof input !== 'object' || input === null) {
		throw new TypeError(
			'@c15t/nextjs: defineConsentConfig expects an object with `backendURL`.'
		);
	}
	assertConsentURL('routePrefix', input.routePrefix, false);
	const routePrefix = input.routePrefix?.replace(/\/+$/u, '');
	const config = {
		...input,
		backendURL: input.backendURL ?? readBackendURLFromEnv(),
		initURL: input.initURL ?? (routePrefix ? `${routePrefix}/init` : undefined),
		manifestURL:
			input.manifestURL ??
			(routePrefix ? `${routePrefix}/manifest` : undefined),
	};
	assertConsentURL('backendURL', config.backendURL, true);
	assertConsentURL('manifestURL', config.manifestURL, false);
	assertConsentURL('initURL', config.initURL, false);
	if (
		config.journey !== undefined &&
		config.journey !== false &&
		config.journey !== 'page' &&
		config.journey !== 'tab'
	) {
		throw new TypeError(
			"@c15t/nextjs: defineConsentConfig `journey` must be 'page', 'tab' or false."
		);
	}

	if (config.initURL && !config.manifestURL && !isProduction()) {
		console.warn(
			'[c15t] defineConsentConfig: `initURL` without `manifestURL` sends browser init through `initURL`, but `resolveConsent` still calls the backend `/init` on every request. Set `manifestURL` to the same-origin manifest route so the server resolves init from the cached manifest too.'
		);
	}

	const defined: BrandedConsentConfig = {
		[CONSENT_CONFIG_BRAND]: true,
		backendURL: config.backendURL as string,
		initURL: config.initURL,
		manifestURL: config.manifestURL,
	};
	if (routePrefix !== undefined) {
		defined.routePrefix = routePrefix;
	}
	if (config.journey !== undefined) {
		defined.journey = config.journey;
	}
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
