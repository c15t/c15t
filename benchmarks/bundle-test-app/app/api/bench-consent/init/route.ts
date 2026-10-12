import { loadBrowserBenchInit } from '@c15t/benchmarking/policy-fixtures';
import { NextResponse } from 'next/server';

const response = loadBrowserBenchInit();

export const GET = async function GET() {
	return NextResponse.json(await response, {
		headers: {
			'cache-control': 'no-store',
		},
	});
};
