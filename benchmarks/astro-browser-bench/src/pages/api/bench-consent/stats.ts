/** Fixture execution counters — read between scenarios, reset before them. */
import type { APIRoute } from 'astro';

import {
	getBenchConsentFixtureCounts,
	resetBenchConsentFixtureCounts,
} from '../../../lib/fixture';

export const prerender = false;

export const GET: APIRoute = () =>
	Response.json(getBenchConsentFixtureCounts(), {
		headers: { 'cache-control': 'no-store' },
	});

export const POST: APIRoute = () =>
	Response.json(resetBenchConsentFixtureCounts(), {
		headers: { 'cache-control': 'no-store' },
	});
