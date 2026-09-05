/**
 * Composes the HTTP surface.
 *
 * This file wires things together and owns nothing else: CORS, the route
 * modules, and the OpenAPI document. Each resource's routes live in
 * `./routes/`, mirroring `@c15t/backend`'s layout — one file per resource
 * keeps a reviewer able to hold a change in mind, and keeps the cutover diff
 * readable.
 */

import { isOriginTrusted } from '@c15t/schema/geo';
import type { ManagedRuntime } from 'effect';
import type { SqlClient } from 'effect/unstable/sql';
import { Hono } from 'hono';
import { openAPIRouteHandler } from 'hono-openapi';

import {
	gradeLevel,
	middleware as observability,
} from '../observability/evlog';
import { makeRun } from './context';
import type { AppOptions, RouteContext } from './context';
import { register as registerConsent } from './routes/consent';
import { register as registerInit } from './routes/init';
import { register as registerLegalDocument } from './routes/legal-document';
import { register as registerManifest } from './routes/manifest';
import { register as registerStatus } from './routes/status';
import { register as registerSubject } from './routes/subject';

export type { AppOptions } from './context';

export const createApp = function createApp(
	runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>,
	options: AppOptions = {}
) {
	const app = new Hono();

	// First, so the wide event covers CORS rejections and preflights too — a
	// blocked origin is exactly the kind of thing an operator needs to see.
	const observe = observability(options.observability);
	if (observe) {
		app.use('*', observe);
		// Immediately after, so it runs inside evlog's wrapper and can grade
		// the event from the final status before it is emitted.
		app.use('*', gradeLevel);
	}

	app.use('*', async (c, runNext) => {
		const origin = c.req.header('Origin');
		const allowed =
			origin !== undefined &&
			isOriginTrusted(origin, [...(options.trustedOrigins ?? [])]);

		if (allowed && origin) {
			c.header('Access-Control-Allow-Origin', origin);
			c.header('Vary', 'Origin');
			c.header('Access-Control-Allow-Credentials', 'true');
		}

		if (c.req.method === 'OPTIONS') {
			if (!allowed) {
				// No CORS headers, so the browser blocks it. 204 rather than 403
				// because the preflight itself is well-formed.
				return c.body(null, 204);
			}
			c.header(
				'Access-Control-Allow-Methods',
				'GET, POST, PUT, DELETE, PATCH, OPTIONS'
			);
			c.header(
				'Access-Control-Allow-Headers',
				'Content-Type, Authorization, x-request-id, x-c15t-version, x-c15t-country, x-c15t-region, x-c15t-gpc, sec-gpc, accept-language'
			);
			c.header('Access-Control-Max-Age', '86400');
			return c.body(null, 204);
		}

		await runNext();
	});

	/**
	 * Runs a handler and maps its typed failure onto a response.
	 *
	 * `Effect.result` moves the typed error into the success channel, so what
	 * comes back is a value to branch on. A defect is left alone and still
	 * rejects the promise — laundering one into a tidy 500 would erase the
	 * distinction the typed channel exists to make.
	 */

	const context: RouteContext = {
		app,
		options,
		run: makeRun(runtime, options.tenantId),
	};

	registerInit(context);
	registerManifest(context);
	registerStatus(context);
	registerLegalDocument(context);
	registerConsent(context);
	registerSubject(context);

	// Registered last so every route above is already on the app and appears
	// in the generated document.
	if (options.openapi?.enabled !== false) {
		app.get(
			options.openapi?.specPath ?? '/spec.json',
			openAPIRouteHandler(app, {
				documentation: {
					components: {
						securitySchemes: {
							bearerAuth: { scheme: 'bearer', type: 'http' },
						},
					},
					info: {
						description: 'API for consent management',
						title: options.openapi?.title ?? 'c15t API',
						version: options.version ?? '0.0.0',
					},
					openapi: '3.1.0',
					servers: [{ url: options.openapi?.basePath ?? '/' }],
				},
			})
		);
	}

	return app;
};
