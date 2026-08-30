import { NextResponse } from 'next/server';

import {
	applyBenchConsentLatency,
	benchConsentManifestResponse,
	recordBenchConsentFixtureExecution,
} from '../fixture';

export async function GET() {
	recordBenchConsentFixtureExecution('manifest');
	await applyBenchConsentLatency();

	return NextResponse.json(benchConsentManifestResponse, {
		headers: {
			'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
			etag: '"nextjs-browser-bench-manifest"',
		},
	});
}
