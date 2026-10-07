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
 * import { resolveConsent } from '@c15t/nextjs/pages';
 * import { consentConfig } from '../consent.config';
 *
 * // `consentConfig.backendURL` is the backend itself. A render never
 * // fetches the app's own `/api/c15t` routes; with a same-origin
 * // `manifestURL` it reads `${backendURL}/manifest` through the cache.
 * export const getServerSideProps = async ({ req }) => ({
 * 	props: { state: await resolveConsent({ config: consentConfig, req }) },
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
	ConsentServerOptions,
	ConsentServerResolveOptions,
	ConsentState,
	KernelConfig,
	NextRequestContext,
	ResolveConsentOptions,
} from './server';
import {
	createConsentServer as createAppRouterConsentServer,
	resolveConsent as resolveConsentFromContext,
} from './server';

export type {
	NodeApiRequestLike,
	NodeApiResponseLike,
	NodeIncomingHeaders,
	NodeRequestLike,
} from './node-bridge';
export type {
	ConsentConfig,
	ConsentServerOptions,
	ConsentState,
	KernelConfig,
	NextConsentManifestHandlersOptions,
	NextRequestContext,
};
export { defineConsentConfig } from './config';

/**
 * `resolveConsent` options with the Node request in place of the `request`
 * adapter, which this entry derives from `req`.
 */
export type PagesResolveConsentOptions = Omit<
	ResolveConsentOptions,
	'request'
> & {
	/**
	 * The `req` from `getServerSideProps` or an API route.
	 */
	req: NodeRequestLike;
};

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
 * Resolve the visitor's consent state in `getServerSideProps`. Same
 * behaviour as `resolveConsent` from `@c15t/nextjs/server`, reading cookies
 * and geo headers from `req` instead of `next/headers`: without a backend
 * URL it returns the request-only state, with one it also folds in the
 * backend or manifest init. The result is plain JSON, so return it as a
 * prop and hand it to `ConsentRoot`.
 *
 * @param options - Backend URL or a `defineConsentConfig` result, the Node
 * `req`, and the server helper options
 * @returns The visitor's JSON-serializable `ConsentState`
 * @example
 * ```ts
 * export const getServerSideProps = async ({ req }) => ({
 * 	props: { state: await resolveConsent({ config: consentConfig, req }) },
 * });
 * ```
 */
export const resolveConsent = function resolveConsent(
	options: PagesResolveConsentOptions
): Promise<ConsentState> {
	const { req, ...rest } = options;
	return resolveConsentFromContext({
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
	handler: (request: Request) => Promise<Response>,
	trustForwardedHeaders: boolean
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
		const response = await handler(
			await toWebRequest(req, trustForwardedHeaders)
		);
		await writeWebResponse(response, res);
	};
};

/**
 * Pages Router API route handlers for the consent routes. Wraps
 * `createNextConsentRouteHandlers` from `@c15t/nextjs/api` so each handler
 * takes the Node `req`/`res` of a `pages/api` route.
 *
 * @param options - Same options as `createNextConsentRouteHandlers`, with
 * `backendURL` or `manifestURL`, or a `defineConsentConfig` result
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
	options: NextConsentManifestHandlersOptions | ConsentConfig
): { init: PagesApiHandler; manifest: PagesApiHandler } {
	const handlers = createNextConsentRouteHandlers(options);
	const trustForwardedHeaders =
		(options as NextConsentManifestHandlersOptions).trustForwardedHeaders ===
		true;
	return {
		init: toPagesApiHandler(handlers.GET, trustForwardedHeaders),
		manifest: toPagesApiHandler(handlers.manifestGET, trustForwardedHeaders),
	};
};

/** Per-request options for {@link PagesConsentServer.resolve}. */
export type PagesConsentServerResolveOptions = Omit<
	ConsentServerResolveOptions,
	'request'
> & {
	/** The `req` from `getServerSideProps` or an API route. */
	req: NodeRequestLike;
};

/** A Pages Router consent setup bound to one config and manifest source. */
export interface PagesConsentServer {
	/**
	 * Resolves consent for `req` in `getServerSideProps`. Reads fresh request
	 * input on every call, like `resolveConsent`.
	 */
	resolve: (options: PagesConsentServerResolveOptions) => Promise<ConsentState>;
	/** API route handlers serving the same manifest source as `resolve()`. */
	handlers: { init: PagesApiHandler; manifest: PagesApiHandler };
}

/**
 * Binds a consent config and its manifest source once, so
 * `getServerSideProps` and the consent API routes always resolve from the
 * same policy. Same options as `createConsentServer` from
 * `@c15t/nextjs/server`; the handlers take the Node `req` and `res`.
 *
 * @param options - The config, an optional build-time manifest, and options
 * both sides share.
 * @returns `resolve()` for `getServerSideProps`, and `handlers` for the
 * `pages/api` routes.
 * @throws {TypeError} When `config` is not a `defineConsentConfig` result.
 * @example
 * ```ts
 * // c15t.server.ts
 * import { createConsentServer } from 'c15t/next/pages';
 *
 * import { consentManifest } from '@/c15t-manifest';
 * import { consentConfig } from '@/c15t.config';
 *
 * export const consent = createConsentServer({
 *   config: consentConfig,
 *   manifest: consentManifest,
 * });
 *
 * // pages/api/c15t/manifest.ts
 * export default consent.handlers.manifest;
 * ```
 */
export const createConsentServer = function createConsentServer(
	options: ConsentServerOptions
): PagesConsentServer {
	const server = createAppRouterConsentServer(options);
	const trustForwardedHeaders = options.trustForwardedHeaders === true;
	return {
		handlers: {
			init: toPagesApiHandler(server.handlers.GET, trustForwardedHeaders),
			manifest: toPagesApiHandler(
				server.handlers.manifestGET,
				trustForwardedHeaders
			),
		},
		resolve: ({ req, ...rest }) =>
			server.resolve({ ...rest, request: createPagesRequestContext(req) }),
	};
};
