import { NextResponse } from 'next/server';

import { applyBenchBackendLatency } from '../../bench-latency';

export const POST = async function POST(request: Request) {
	await applyBenchBackendLatency();
	const body = await request.json();
	return NextResponse.json(
		{
			ok: true,
			subjectId: body.subjectId ?? 'benchmark-subject',
		},
		{
			headers: {
				'cache-control': 'no-store',
			},
		}
	);
};
