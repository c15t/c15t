import { setTimeout as sleep } from 'node:timers/promises';

import init from '../../../../fixture/init.json';
import manifest from '../../../../fixture/manifest.json';

/**
 * Deterministic consent backend for the production consumer. The harness
 * writes the fixture JSON before building. `GET stats` reads how often the
 * SDK reached this origin; `POST stats` resets the counts.
 */
interface FixtureCounts {
	init: number;
	manifest: number;
	subjects: number;
	sessions: number;
}

const globalWithCounts = globalThis as typeof globalThis & {
	__c15tConsumerFixtureCounts?: FixtureCounts;
};

const counts = (): FixtureCounts => {
	globalWithCounts.__c15tConsumerFixtureCounts ??= {
		init: 0,
		manifest: 0,
		sessions: 0,
		subjects: 0,
	};
	return globalWithCounts.__c15tConsumerFixtureCounts;
};

const applyLatency = async () => {
	const latencyMs = Number(process.env.C15T_BENCH_INIT_LATENCY_MS ?? '0');
	if (Number.isFinite(latencyMs) && latencyMs > 0) {
		await sleep(latencyMs);
	}
};

interface RouteContext {
	params: Promise<{ path: string[] }>;
}

export const dynamic = 'force-dynamic';

export const GET = async (_request: Request, context: RouteContext) => {
	const endpoint = (await context.params).path.join('/');
	if (endpoint === 'manifest') {
		counts().manifest += 1;
		await applyLatency();
		return Response.json(manifest, {
			headers: {
				'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
				etag: '"production-consumer-manifest"',
			},
		});
	}
	if (endpoint === 'init') {
		counts().init += 1;
		await applyLatency();
		return Response.json(init, { headers: { 'cache-control': 'no-store' } });
	}
	if (endpoint === 'stats') {
		return Response.json(counts(), {
			headers: { 'cache-control': 'no-store' },
		});
	}
	return new Response('Not found', { status: 404 });
};

export const POST = async (request: Request, context: RouteContext) => {
	const endpoint = (await context.params).path.join('/');
	if (endpoint === 'subjects') {
		counts().subjects += 1;
		const body = (await request.json().catch(() => ({}))) as {
			subjectId?: string;
		};
		return Response.json(
			{ ok: true, subjectId: body.subjectId ?? 'benchmark-subject' },
			{ headers: { 'cache-control': 'no-store' } }
		);
	}
	if (endpoint === 'sessions') {
		counts().sessions += 1;
		return new Response(null, { status: 204 });
	}
	if (endpoint === 'stats') {
		const current = counts();
		current.init = 0;
		current.manifest = 0;
		current.sessions = 0;
		current.subjects = 0;
		return Response.json(current, { headers: { 'cache-control': 'no-store' } });
	}
	return new Response('Not found', { status: 404 });
};
