import { NextResponse } from 'next/server';
import { applyBenchConsentLatency, benchConsentInitResponse } from '../fixture';

export async function GET() {
	await applyBenchConsentLatency();

	return NextResponse.json(benchConsentInitResponse, {
		headers: {
			'cache-control': 'no-store',
		},
	});
}
