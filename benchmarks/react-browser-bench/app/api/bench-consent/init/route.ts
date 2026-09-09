import { setTimeout as sleep } from 'node:timers/promises';

import { loadBrowserBenchInit } from '@c15t/benchmarking/policy-fixtures';
import { NextResponse } from 'next/server';

const response = loadBrowserBenchInit();

export const GET = async function GET() {
	const latencyMs = Number(process.env.C15T_BENCH_INIT_LATENCY_MS ?? '0');
	if (Number.isFinite(latencyMs) && latencyMs > 0) {
		await sleep(latencyMs);
	}

	return NextResponse.json(await response, {
		headers: {
			'cache-control': 'no-store',
		},
	});
};
