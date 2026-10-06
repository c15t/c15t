import { NextResponse } from 'next/server';

import {
	applyBenchConsentLatency,
	recordBenchConsentFixtureExecution,
} from '../fixture';

export const POST = async function POST(request: Request) {
	recordBenchConsentFixtureExecution('subjects');
	await applyBenchConsentLatency();
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
