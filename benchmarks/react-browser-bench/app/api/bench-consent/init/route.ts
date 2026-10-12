import { loadBrowserBenchInit } from '@c15t/benchmarking/policy-fixtures';
import { NextResponse } from 'next/server';

import { applyBenchBackendLatency } from '../../bench-latency';

const response = loadBrowserBenchInit();

export const GET = async function GET() {
	await applyBenchBackendLatency();

	return NextResponse.json(await response, {
		headers: {
			'cache-control': 'no-store',
		},
	});
};
