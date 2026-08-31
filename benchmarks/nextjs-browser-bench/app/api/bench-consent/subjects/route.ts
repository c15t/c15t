import { NextResponse } from 'next/server';

import { recordBenchConsentFixtureExecution } from '../fixture';

export const POST = async function POST(request: Request) {
	recordBenchConsentFixtureExecution('subjects');
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
