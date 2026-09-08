/**
 * `GET /c15t.js` and `GET /c15t.headless.js` — the pre-configured
 * script-tag builds.
 *
 * Registered by `createApp` unless `script.enabled` is `false`.
 */

import { describeRoute } from 'hono-openapi';

import type { RouteContext } from '../context';
import { buildScriptResponse, deriveBackendURL } from '../script';
import type { ScriptVariant } from '../script';

export const register = function register({
	app,
	options,
}: RouteContext): void {
	const script = options.script ?? {};
	if (script.enabled === false) {
		return;
	}
	const routes: [string, ScriptVariant, string][] = [
		[
			script.path ?? '/c15t.js',
			'full',
			'The consent banner as one script tag, configured for this backend',
		],
		[
			script.headlessPath ?? '/c15t.headless.js',
			'headless',
			'The consent runtime with no UI, configured for this backend',
		],
	];
	for (const [path, variant, summary] of routes) {
		app.get(path, describeRoute({ summary, tags: ['Script'] }), async (c) => {
			let result: Awaited<ReturnType<typeof buildScriptResponse>>;
			try {
				result = await buildScriptResponse({
					backendURL: script.backendURL ?? deriveBackendURL(c.req.url, path),
					cache: options.manifestCache,
					language: c.req.query('language') ?? null,
					manifest: options.manifest ?? {},
					options: script,
					variant,
				});
			} catch (error) {
				// The bundle ships in `@c15t/browser`; a runtime without a
				// filesystem needs `script.bundles`. Say so rather than 500.
				return c.json(
					{
						cause: { code: 'SCRIPT_UNAVAILABLE' },
						message: `Could not load the ${variant} script bundle: ${
							error instanceof Error ? error.message : String(error)
						}. Install @c15t/browser next to @c15t/backend, or set script.bundles.`,
					},
					503
				);
			}
			// Same policy as /manifest: geo-independent, shared-cacheable, and
			// the revision doubles as the validator.
			c.header('Cache-Control', result.cacheControl);
			c.header('ETag', result.etag);
			c.header('Content-Type', 'text/javascript; charset=utf-8');
			c.header('X-Content-Type-Options', 'nosniff');
			if (c.req.header('If-None-Match') === result.etag) {
				return c.body(null, 304);
			}
			return c.body(result.body);
		});
	}
};
