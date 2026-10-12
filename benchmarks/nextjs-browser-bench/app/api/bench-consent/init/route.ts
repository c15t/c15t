import { NextResponse } from 'next/server';

import {
	applyBenchConsentLatency,
	benchConsentInitResponse,
	recordBenchConsentFixtureExecution,
} from '../fixture';

export const GET = async function GET() {
	recordBenchConsentFixtureExecution('init');
	await applyBenchConsentLatency();

	return NextResponse.json(await benchConsentInitResponse, {
		headers: {
			'cache-control': 'no-store',
		},
	});
};
