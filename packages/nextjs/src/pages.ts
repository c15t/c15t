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
 * import { withConsentProps } from 'c15t/next/pages';
 *
 * export const getServerSideProps = withConsentProps();
 * ```
 */

import type { GetServerSideProps, GetServerSidePropsContext } from 'next';

import type { NextConsentRouteOptions } from './api';
import { createConsentRoute } from './api';
import type { ConsentConfig } from './config';
import type {
	NodeApiRequestLike,
	NodeApiResponseLike,
	NodeRequestLike,
} from './node-bridge';
import { toWebHeaders, toWebRequest, writeWebResponse } from './node-bridge';
import type {
	ConsentState,
	KernelConfig,
	NextRequestContext,
	ResolveConsentOptions,
} from './server';
import { resolveConsent as resolveConsentFromContext } from './server';

export type {
	NodeApiRequestLike,
	NodeApiResponseLike,
	NodeIncomingHeaders,
	NodeRequestLike,
} from './node-bridge';
export type {
	ConsentConfig,
	ConsentState,
	KernelConfig,
	NextConsentRouteOptions,
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
 * behaviour as `resolveConsent` from `c15t/next/server`, reading cookies
 * and geo headers from `req` instead of `next/headers`. Most pages use
 * {@link withConsentProps}, which calls this and makes the result
 * JSON-safe.
 *
 * @param options - The Node `req`, and the server helper options
 * @returns The visitor's `ConsentState`
 * @example
 * ```ts
 * const state = await resolveConsent({ req });
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
	handler: (request: Request, req: NodeApiRequestLike) => Promise<Response>,
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
			await toWebRequest(req, trustForwardedHeaders),
			req
		);
		await writeWebResponse(response, res);
	};
};

/**
 * One Pages Router API route for every consent path,
 * `pages/api/c15t/[...c15t].ts`: `GET /manifest` and `GET /init`, and 404
 * for anything else. The Pages Router counterpart of `createConsentRoute`.
 *
 * Pages without `getServerSideProps` resolve consent in the browser, which
 * asks this route when `c15t.config.ts` sets `routePrefix: '/api/c15t'`.
 * Everything defaults to `c15t.config.ts`.
 *
 * @param options - Overrides of `c15t.config.ts` and caching options.
 * @param param - The catch-all parameter's name, from the file name.
 * @returns The API route's default export.
 * @example
 * ```ts
 * // pages/api/c15t/[...c15t].ts
 * import { createPagesConsentRoute } from 'c15t/next/pages';
 *
 * export default createPagesConsentRoute();
 * ```
 */
export const createPagesConsentRoute = function createPagesConsentRoute(
	options: Omit<NextConsentRouteOptions, 'proxy'> = {},
	param = 'c15t'
): PagesApiHandler {
	const { GET } = createConsentRoute({ ...options, proxy: false });
	return toPagesApiHandler((request, req) => {
		// `req.query` mixes the route parameter with the query string, so
		// only the named parameter goes on.
		const segments = req.query?.[param];
		if (!Array.isArray(segments)) {
			throw new TypeError(
				`@c15t/nextjs: createPagesConsentRoute found no \`${param}\` catch-all parameter. Name the file [...${param}].ts or pass its parameter name.`
			);
		}
		return GET(request, {
			params: Promise.resolve({ [param]: segments }),
		});
	}, options.trustForwardedHeaders === true);
};

/** `pageProps` of a page whose `getServerSideProps` is {@link withConsentProps}. */
export interface ConsentPageProps {
	/**
	 * The visitor's consent state. Absent on pages that don't resolve it,
	 * where the browser resolves consent itself.
	 */
	consent?: ConsentState;
}

/** Options for {@link withConsentProps}: `resolveConsent` without `req`. */
export type WithConsentPropsOptions = Omit<PagesResolveConsentOptions, 'req'>;

/**
 * `getServerSideProps` that resolves the visitor's consent from
 * `c15t.config.ts` and adds it to the page's props as `consent`, for
 * `<ConsentRoot state={pageProps.consent}>` in `pages/_app.tsx`. The state
 * is JSON-safe, as Next.js requires of props.
 *
 * Wraps the page's own `getServerSideProps` when given: consent resolves
 * while it runs, and its redirects and `notFound` pass through unchanged.
 *
 * @param getServerSideProps - The page's own `getServerSideProps`.
 * @param options - `resolveConsent` options, such as `timeoutMs`.
 * @returns The page's `getServerSideProps`.
 * @example
 * ```ts
 * // pages/index.tsx
 * import { withConsentProps } from 'c15t/next/pages';
 *
 * export const getServerSideProps = withConsentProps();
 * ```
 * @example
 * ```ts
 * export const getServerSideProps = withConsentProps(async ({ params }) => ({
 *   props: { post: await loadPost(params?.slug) },
 * }));
 * ```
 */
export const withConsentProps = function withConsentProps<
	Props extends Record<string, unknown> = Record<string, never>,
>(
	getServerSideProps?: GetServerSideProps<Props>,
	options: WithConsentPropsOptions = {}
): GetServerSideProps<Props & ConsentPageProps> {
	return async (context: GetServerSidePropsContext) => {
		const [state, result] = await Promise.all([
			resolveConsent({ ...options, req: context.req }),
			getServerSideProps ? getServerSideProps(context) : { props: {} as Props },
		]);
		if (!('props' in result)) {
			return result;
		}
		// Next.js rejects undefined prop values, such as an absent GPC signal.
		const consent = JSON.parse(JSON.stringify(state)) as ConsentState;
		return { props: { ...(await result.props), consent } };
	};
};
