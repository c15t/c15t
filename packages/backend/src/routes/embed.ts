/**
 * Embed route - Serves script-tag bootstrap payload.
 *
 * @packageDocumentation
 */

import { Hono } from 'hono';
import { buildInitPayload } from '~/handlers/init/payload';
import type { C15TContext, C15TOptions, EmbedBootstrapPayload } from '~/types';
import { getMetrics } from '~/utils/metrics';

function serializeForInlineScript(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}

function sanitizeCountryOrRegion(value: string | null): string | undefined {
	if (!value) {
		return undefined;
	}

	const normalized = value.trim().toUpperCase();
	if (!/^[A-Z0-9_-]{2,16}$/.test(normalized)) {
		return undefined;
	}

	return normalized;
}

function sanitizeLanguage(value: string | null): string | undefined {
	if (!value) {
		return undefined;
	}

	const normalized = value.trim();
	if (!/^[A-Za-z0-9,;=._\- ]{2,128}$/.test(normalized)) {
		return undefined;
	}

	return normalized;
}

function applyEmbedHeaderOverrides(request: Request): Request {
	const url = new URL(request.url);
	const country = sanitizeCountryOrRegion(url.searchParams.get('country'));
	const region = sanitizeCountryOrRegion(url.searchParams.get('region'));
	const language = sanitizeLanguage(url.searchParams.get('language'));

	if (!country && !region && !language) {
		return request;
	}

	const headers = new Headers(request.headers);

	if (country) {
		headers.set('x-c15t-country', country);
	}

	if (region) {
		headers.set('x-c15t-region', region);
	}

	if (language) {
		headers.set('accept-language', language);
	}

	return new Request(request, { headers });
}

/**
 * Creates the embed route.
 *
 * GET /embed.js
 */
export const createEmbedRoute = (options: C15TOptions) => {
	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();

	app.get('/', async (c) => {
		if (!options.advanced?.embed?.enabled) {
			return c.body('Not Found', 404);
		}

		const request = applyEmbedHeaderOverrides(c.req.raw);
		const initPayload = await buildInitPayload(request, options);

		const payload: EmbedBootstrapPayload = {
			init: initPayload,
			options: options.advanced?.embed?.options ?? {},
			revision: options.advanced?.embed?.revision,
		};

		// Record init metric for embed bootstrap path.
		const gpc = request.headers.get('sec-gpc') === '1';
		getMetrics()?.recordInit({
			jurisdiction: initPayload.jurisdiction,
			country: initPayload.location?.countryCode ?? undefined,
			region: initPayload.location?.regionCode ?? undefined,
			gpc,
		});

		const script = `;(() => {
  window.__c15tEmbedPayload = ${serializeForInlineScript(payload)};
  window.dispatchEvent(new Event('c15t:embed:payload'));
  window.c15tEmbed?.bootstrap?.();
})();\n`;

		c.header('content-type', 'application/javascript; charset=utf-8');
		c.header('cache-control', 'no-store');

		return c.body(script);
	});

	return app;
};
