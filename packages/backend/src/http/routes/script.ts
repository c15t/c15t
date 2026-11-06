/**
 * `GET /c15t.js` and `GET /c15t.headless.js` — the pre-configured
 * script-tag builds — and `GET /c15t.init.js`, which starts the full
 * build's `/init` while the build downloads.
 *
 * Registered by `createApp` unless `script.enabled` is `false`.
 */

import type { Context } from 'hono';
import { describeRoute } from 'hono-openapi';

import type { RouteContext } from '../context';
import {
	buildInitScriptResponse,
	buildScriptResponse,
	deriveBackendURL,
	loadPrefetchBuilder,
	loadScriptBundle,
} from '../script';
import type { ScriptResult, ScriptVariant } from '../script';

const sendScript = function sendScript(
	c: Context,
	result: ScriptResult
): Response {
	// Same cache policy as /manifest: these scripts contain no visitor
	// data. The response hash validates the config and bundle bytes.
	c.header('Cache-Control', result.cacheControl);
	c.header('CDN-Cache-Control', result.cacheControl);
	c.header('ETag', result.etag);
	c.header('Content-Type', 'text/javascript; charset=utf-8');
	c.header('X-Content-Type-Options', 'nosniff');
	if (c.req.header('If-None-Match') === result.etag) {
		return c.body(null, 304);
	}
	return c.body(result.body);
};

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
			script.iabPath ?? '/c15t.iab.js',
			'iab',
			'The consent runtime and IAB preference UI, configured for this backend',
		],
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
	const initPath = script.initPath ?? '/c15t.init.js';
	app.get(
		initPath,
		describeRoute({
			summary: "Starts the full script's /init while c15t.js downloads",
			tags: ['Script'],
		}),
		async (c) => {
			const buildPrefetch = await loadPrefetchBuilder(script);
			if (!buildPrefetch) {
				return c.json(
					{
						cause: { code: 'SCRIPT_UNAVAILABLE' },
						message:
							'The early init script needs the @c15t/core that @c15t/browser installs. It is off with script.prefetch: false or a custom script.bundles.full.',
					},
					503
				);
			}
			const result = buildInitScriptResponse({
				backendURL:
					script.backendURL ??
					deriveBackendURL(c.req.url, initPath, options.basePath),
				buildPrefetch,
				cache: options.manifestCache,
				language: c.req.query('language') ?? null,
				options: script,
			});
			return sendScript(c, result);
		}
	);
	for (const [path, variant, summary] of routes) {
		app.get(path, describeRoute({ summary, tags: ['Script'] }), async (c) => {
			// Only a missing bundle gets the install hint; invalid configuration
			// is the operator's error and surfaces as one.
			let bundle: string;
			try {
				bundle = await loadScriptBundle(variant, script);
			} catch (error) {
				// The bundle ships in `@c15t/browser`; custom file paths can
				// be supplied through `script.bundles`.
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
			const result = await buildScriptResponse({
				backendURL:
					script.backendURL ??
					deriveBackendURL(c.req.url, path, options.basePath),
				buildPrefetch:
					variant === 'full' ? await loadPrefetchBuilder(script) : undefined,
				bundle,
				cache: options.manifestCache,
				language: c.req.query('language') ?? null,
				manifest: options.manifest ?? {},
				options: script,
				variant,
			});
			return sendScript(c, result);
		});
	}
};
