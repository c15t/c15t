/**
 * Manifest route - serves the geo-independent consent manifest.
 *
 * @packageDocumentation
 */

import { sliceConsentManifestLanguage } from '@c15t/schema/types';
import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import {
	buildConsentManifestFromOptions,
	type InitManifestOptions,
} from '~/handlers/init/manifest';
import type { C15TContext, C15TOptions } from '~/types';

export const DEFAULT_MANIFEST_S_MAXAGE = 300;
export const DEFAULT_MANIFEST_STALE_WHILE_REVALIDATE = 86_400;

function normalizeCacheSeconds(value: number | undefined, fallback: number) {
	return Number.isFinite(value) && value !== undefined && value >= 0
		? Math.floor(value)
		: fallback;
}

export function getManifestCacheOptions(
	options: Pick<C15TOptions, 'manifestCache'>
): {
	sMaxAge: number;
	staleWhileRevalidate: number;
} {
	return {
		sMaxAge: normalizeCacheSeconds(
			options.manifestCache?.sMaxAge,
			DEFAULT_MANIFEST_S_MAXAGE
		),
		staleWhileRevalidate: normalizeCacheSeconds(
			options.manifestCache?.staleWhileRevalidate,
			DEFAULT_MANIFEST_STALE_WHILE_REVALIDATE
		),
	};
}

export function createManifestCacheControl(
	options: Pick<C15TOptions, 'manifestCache'>
): string {
	const cache = getManifestCacheOptions(options);
	return `public, s-maxage=${cache.sMaxAge}, stale-while-revalidate=${cache.staleWhileRevalidate}`;
}

function createEtag(revision: string): string {
	return `"${revision}"`;
}

export async function createManifestResponseBody(
	options: InitManifestOptions,
	language?: string | null
) {
	const manifest = await buildConsentManifestFromOptions(options);
	return language ? sliceConsentManifestLanguage(manifest, language) : manifest;
}

/**
 * Creates the manifest route handler.
 */
export const createManifestRoute = (options: C15TOptions) => {
	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();

	app.get(
		'/',
		describeRoute({
			summary: 'Get consent manifest',
			description: `Returns the geo-independent consent manifest used to resolve init locally.

The response is per-tenant and CDN-cacheable. Use \`?language=<code>\` to serve a single-language translation-input slice.`,
			tags: ['Manifest'],
			responses: {
				200: {
					description: 'Consent manifest',
					content: {
						'application/json': {},
					},
				},
				304: {
					description: 'Manifest not modified',
				},
			},
		}),
		async (c) => {
			const language = c.req.query('language');
			const manifest = await createManifestResponseBody(options, language);
			const etag = createEtag(manifest.revision);
			const cacheControl = createManifestCacheControl(options);

			c.header('Cache-Control', cacheControl);
			c.header('ETag', etag);
			if (c.req.header('if-none-match') === etag) {
				return c.body(null, 304);
			}

			return c.json(manifest);
		}
	);

	return app;
};
