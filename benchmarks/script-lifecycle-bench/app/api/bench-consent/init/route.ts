import { loadBrowserBenchInit } from '@c15t/benchmarking/policy-fixtures';
import { NextResponse } from 'next/server';

/**
 * Deterministic init fixture. The scenarios that start as fresh visitors
 * expect the banner, so the response carries an explicit opt-in choice
 * policy: the promoted v3 API derives the first-layer UI from the
 * resolved policy and no longer infers it from `jurisdiction` alone.
 */
const response = loadBrowserBenchInit();

export const GET = async function GET() {
	return NextResponse.json(await response, {
		headers: {
			'cache-control': 'no-store',
		},
	});
};
