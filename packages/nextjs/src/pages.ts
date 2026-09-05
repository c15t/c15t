/**
 * `@c15t/nextjs/pages` — Pages Router entry.
 *
 * `@c15t/nextjs/server` reads the request through `next/headers`, which only
 * exists in the App Router, and `@c15t/nextjs/api` ships App Router route
 * handlers (Web `Request` in, `Response` out). These wrappers take the Node
 * `req`/`res` that `getServerSideProps` and API routes receive instead.
 *
 * @example
 * ```ts
 * // pages/index.tsx
 * import { prefetchInitialConsent } from '@c15t/nextjs/pages';
 *
 * export const getServerSideProps = async ({ req }) => ({
 * 	props: { config: await prefetchInitialConsent({ backendURL: '/api/c15t', req }) },
 * });
 * ```
 */

import type { NextConsentManifestHandlersOptions } from './api';
import { createNextConsentRouteHandlers } from './api';
import type { ConsentConfig } from './config';
import type {
	NodeApiRequestLike,
	NodeApiResponseLike,
	NodeRequestLike,
} from './node-bridge';
import { toWebHeaders, toWebRequest, writeWebResponse } from './node-bridge';
import type {
	KernelConfig,
	NextRequestContext,
	PrefetchInitialConsentOptions,
	ReadInitialConsentConfigOptions,
} from './server';
import {
	prefetchInitialConsent as prefetchInitialConsentFromContext,
	readInitialConsentConfig as readInitialConsentConfigFromContext,
} from './server';

export type {
	NodeApiRequestLike,
	NodeApiResponseLike,
	NodeIncomingHeaders,
	NodeRequestLike,
} from './node-bridge';
export type {
	ConsentConfig,
	KernelConfig,
	NextConsentManifestHandlersOptions,
	NextRequestContext,
};
export { defineConsentConfig } from './config';

/**
 * `readInitialConsentConfig` options without the `request` adapter, which
 * this entry derives from `req`.
 */
export type PagesReadInitialConsentConfigOptions = Omit<
	ReadInitialConsentConfigOptions,
	'request'
>;

/**
 * `prefetchInitialConsent` options with the Node request in place of the
 * `request` adapter.
 */
export interface PagesPrefetchInitialConsentOptions extends Omit<
	PrefetchInitialConsentOptions,
	'request'
> {
	/**
	 * The `req` from `getServerSideProps` or an API route.
	 */
	req: NodeRequestLike;
}

/**
 * Builds the `request` adapter the server helpers expect from a Node
 * request. Headers convert to Web `Headers`; cookies come from the `cookie`
 * header.
 *
 * @param req - `req` from `getServerSideProps` or an API route
 * @returns A `NextRequestContext` for `@c15t/nextjs/server`
 */
export const createPagesRequestContext = function createPagesRequestContext(
	req: NodeRequestLike
): NextRequestContext {
	const headers = toWebHeaders(req.headers);
	return {
		cookies: () => ({ toString: () => headers.get('cookie') ?? '' }),
		headers: () => headers,
	};
};

/**
 * Derive a `KernelConfig` from a Pages Router request. Same behaviour as
 * `readInitialConsentConfig` from `@c15t/nextjs/server`, reading cookies and
 * geo headers from `req` instead of `next/headers`. The result is plain JSON,
 * so it can be returned from `getServerSideProps` as a prop.
 *
 * @param req - `req` from `getServerSideProps` or an API route
 * @param options - Cookie name and header overrides
 * @returns A JSON-serializable `KernelConfig`
 */
export const readInitialConsentConfig = function readInitialConsentConfig(
	req: NodeRequestLike,
	options: PagesReadInitialConsentConfigOptions = {}
): Promise<KernelConfig> {
	return readInitialConsentConfigFromContext({
		...options,
		request: createPagesRequestContext(req),
	});
};

/**
 * Server-side consent prefetch for `getServerSideProps`. Same behaviour as
 * `prefetchInitialConsent` from `@c15t/nextjs/server`, reading the request
 * from `req`. The result is plain JSON, so hand it to `ConsentBoundary` as a
 * prop.
 *
 * @param options - Backend URL or a `defineConsentConfig` result, the Node
 * `req`, and the server helper options
 * @returns A JSON-serializable `KernelConfig`
 * @example
 * ```ts
 * export const getServerSideProps = async ({ req }) => ({
 * 	props: { config: await prefetchInitialConsent({ config: consentConfig, req }) },
 * });
 * ```
 */
export const prefetchInitialConsent = function prefetchInitialConsent(
	options: PagesPrefetchInitialConsentOptions
): Promise<KernelConfig> {
	const { req, ...rest } = options;
	return prefetchInitialConsentFromContext({
		...rest,
		request: createPagesRequestContext(req),
	});
};

/**
 * A Pages Router API route handler: Node `req` in, Node `res` written.
 */
export type PagesApiHandler = (
	req: NodeApiRequestLike,
	res: NodeApiResponseLike
) => Promise<void>;

const toPagesApiHandler = function toPagesApiHandler(
	handler: (request: Request) => Promise<Response>
): PagesApiHandler {
	return async (req, res) => {
		// The App Router only exposes GET for these routes and answers other
		// methods with 405; a pages/api default export sees every method.
		const method = (req.method ?? 'GET').toUpperCase();
		if (method !== 'GET' && method !== 'HEAD') {
			await writeWebResponse(
				new Response(null, { headers: { allow: 'GET' }, status: 405 }),
				res
			);
			return;
		}
		const response = await handler(await toWebRequest(req));
		await writeWebResponse(response, res);
	};
};

/**
 * Pages Router API route handlers for the consent routes. Wraps
 * `createNextConsentRouteHandlers` from `@c15t/nextjs/api` so each handler
 * takes the Node `req`/`res` of a `pages/api` route.
 *
 * @param options - Same options as `createNextConsentRouteHandlers`, or a
 * `defineConsentConfig` result
 * @returns `init` for `GET /init` and `manifest` for `GET /manifest`
 *
 * @example
 * ```ts
 * // pages/api/consent/manifest.ts
 * import { createPagesApiHandlers } from '@c15t/nextjs/pages';
 *
 * export default createPagesApiHandlers({ backendURL: '/api/c15t' }).manifest;
 * ```
 */
export const createPagesApiHandlers = function createPagesApiHandlers(
	options: NextConsentManifestHandlersOptions | ConsentConfig = {}
): { init: PagesApiHandler; manifest: PagesApiHandler } {
	const handlers = createNextConsentRouteHandlers(options);
	return {
		init: toPagesApiHandler(handlers.GET),
		manifest: toPagesApiHandler(handlers.manifestGET),
	};
};
