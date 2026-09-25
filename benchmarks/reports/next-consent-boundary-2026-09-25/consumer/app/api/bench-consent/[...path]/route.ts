import { setTimeout as sleep } from 'node:timers/promises';

import manifest from '../../../../components/manifest.json';
import { readTiming } from '../../../../components/timings';

/**
 * Deterministic consent backend. `C15T_BENCH_INIT_LATENCY_MS` delays every
 * manifest response (the brief's 200 ms backend latency in condition B).
 * Failure modes:
 * - a `cold` token starting with `fail500-` answers 503;
 * - a `cold` token starting with `hang-` never answers (the SDK's 10 s
 *   manifest fetch timeout fires first);
 * - `C15T_BENCH_MANIFEST_FAIL=500|hang` applies the same to every request.
 */
interface FixtureCounts {
	manifest: number;
	subjects: number;
	sessions: number;
}

const globalWithCounts = globalThis as typeof globalThis & {
	__benchCounts?: FixtureCounts;
};

const counts = (): FixtureCounts => {
	globalWithCounts.__benchCounts ??= { manifest: 0, sessions: 0, subjects: 0 };
	return globalWithCounts.__benchCounts;
};

const latency = async () => {
	const latencyMs = Number(process.env.C15T_BENCH_INIT_LATENCY_MS ?? '0');
	if (Number.isFinite(latencyMs) && latencyMs > 0) {
		await sleep(latencyMs);
	}
};

interface RouteContext {
	params: Promise<{ path: string[] }>;
}

export const GET = async (request: Request, context: RouteContext) => {
	const endpoint = (await context.params).path.join('/');
	const url = new URL(request.url);
	if (endpoint === 'manifest') {
		counts().manifest += 1;
		const token = url.searchParams.get('cold') ?? '';
		let mode = process.env.C15T_BENCH_MANIFEST_FAIL ?? 'ok';
		if (!process.env.C15T_BENCH_MANIFEST_FAIL && token.startsWith('fail500-')) {
			mode = '500';
		}
		if (!process.env.C15T_BENCH_MANIFEST_FAIL && token.startsWith('hang-')) {
			mode = 'hang';
		}
		await latency();
		if (mode === '500') {
			return new Response('unavailable', {
				headers: { 'cache-control': 'no-store' },
				status: 503,
			});
		}
		if (mode === 'hang') {
			await sleep(60_000);
		}
		return Response.json(manifest, {
			headers: {
				'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
				etag: '"paint-consumer-manifest"',
			},
		});
	}
	if (endpoint === 'stats') {
		return Response.json(counts(), {
			headers: { 'cache-control': 'no-store' },
		});
	}
	if (endpoint === 'timings') {
		return Response.json(readTiming(url.searchParams.get('sample') ?? ''), {
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
	return new Response('Not found', { status: 404 });
};
