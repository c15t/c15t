/**
 * The package's entry point.
 *
 * `c15tInstance(options).handler(request)` — the same two-call shape
 * `@c15t/backend` 2.x has, because every host integration is written against
 * it: the Next.js route handler, the Node adapter, the demo apps. Changing the
 * shape would make the cutover a rewrite for every consumer rather than a
 * configuration change.
 *
 * What *does* change is how storage is configured, and it has to: 2.x took a
 * fumadb adapter and this does not have one. See `db/connect.ts`.
 *
 * ```ts
 * // 2.x
 * c15tInstance({ adapter: kyselyAdapter({ db, provider: 'postgresql' }) })
 *
 * // 3.x
 * c15tInstance({ database: { dialect: 'postgres', url } })
 * ```
 *
 * ## The runtime is built once
 *
 * `ManagedRuntime` holds the connection pool, so it is constructed per
 * instance and reused for every request. Building it per request would open a
 * pool per request — which is the kind of mistake that only shows up under
 * load, so the API does not offer a way to make it.
 *
 * The cost is that an instance owns a resource. `dispose()` releases it, and
 * a long-lived server never needs to call it; a test or a script that creates
 * instances in a loop does.
 */

import type { Layer } from 'effect';
import { ManagedRuntime } from 'effect';
import type { SqlClient } from 'effect/unstable/sql';
import { type DatabaseOption, toLayer } from './db/connect';
import { createApp } from './http/app';
import type { AppOptions } from './http/context';

export interface C15TOptions extends AppOptions {
	/**
	 * Where consent records live.
	 *
	 * Either a description — `{ dialect: 'postgres', url }` — or a `SqlClient`
	 * layer for anyone embedding this in an Effect application or sharing a
	 * pool.
	 */
	readonly database: DatabaseOption;
}

export interface C15TInstance {
	/**
	 * Handles one HTTP request.
	 *
	 * Framework-agnostic by construction: web `Request` in, web `Response`
	 * out, so it drops into Next.js route handlers, Node adapters, Bun, and
	 * workers without a shim.
	 *
	 * @example
	 * ```ts
	 * export const POST = (request: Request) => instance.handler(request);
	 * ```
	 */
	readonly handler: (request: Request) => Promise<Response>;
	/**
	 * Closes the connection pool.
	 *
	 * A long-lived server does not need this. Tests and scripts that build
	 * instances repeatedly do, or they leak connections until the database
	 * refuses more.
	 */
	readonly dispose: () => Promise<void>;
}

/**
 * Builds a c15t backend.
 *
 * @example
 * ```ts
 * const instance = c15tInstance({
 * 	database: { dialect: 'postgres', url: process.env.DATABASE_URL },
 * 	trustedOrigins: ['https://app.example.com'],
 * 	apiKeys: [process.env.C15T_API_KEY],
 * });
 *
 * export const POST = (request: Request) => instance.handler(request);
 * ```
 */
/**
 * Removes the mount prefix so the routes can be declared without it.
 *
 * A backend mounted at `/api/c15t` receives `/api/c15t/status`, while the
 * route is registered as `/status`. Stripping here rather than prefixing every
 * route keeps the routes readable and matches what `@c15t/backend` does.
 */
const stripBasePath = (request: Request, basePath?: string): Request => {
	if (!basePath || basePath === '/') {
		return request;
	}

	const prefix = basePath.replace(/\/$/, '');
	const url = new URL(request.url);
	// On a segment boundary, not a string prefix: a mount at `/api/c15t` must
	// not also swallow `/api/c15t2/status` and hand the router `2/status`.
	const rest = url.pathname.slice(prefix.length);
	if (
		!url.pathname.startsWith(prefix) ||
		(rest !== '' && !rest.startsWith('/'))
	) {
		return request;
	}

	url.pathname = rest || '/';
	return new Request(url, request);
};

export const c15tInstance = (options: C15TOptions): C15TInstance => {
	const { database, ...app } = options;

	const runtime = ManagedRuntime.make(
		toLayer(database) as Layer.Layer<SqlClient.SqlClient, never>
	);
	const hono = createApp(runtime, app);

	return {
		// `fetch` may answer synchronously; the contract is a promise.
		handler: async (request) =>
			hono.fetch(stripBasePath(request, app.basePath)),
		dispose: () => runtime.dispose(),
	};
};
