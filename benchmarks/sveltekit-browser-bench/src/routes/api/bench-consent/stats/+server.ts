import {
	getBenchConsentFixtureCounts,
	resetBenchConsentFixtureCounts,
} from '$lib/server/fixture';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

/** Read the fixture execution counters. */
export const GET: RequestHandler = () =>
	json(getBenchConsentFixtureCounts(), {
		headers: { 'cache-control': 'no-store' },
	});

/** Zero the fixture execution counters between scenarios. */
export const POST: RequestHandler = () =>
	json(resetBenchConsentFixtureCounts(), {
		headers: { 'cache-control': 'no-store' },
	});
