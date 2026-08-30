import { NextResponse } from 'next/server';

import {
	applyBenchConsentLatency,
	benchConsentInitResponse,
	recordBenchConsentFixtureExecution,
} from '../fixture';

export async function GET() {
	recordBenchConsentFixtureExecution('init');
	await applyBenchConsentLatency();

	return NextResponse.json(benchConsentInitResponse, {
		headers: {
			'cache-control': 'no-store',
		},
	});
}
