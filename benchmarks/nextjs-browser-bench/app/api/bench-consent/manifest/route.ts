import { NextResponse } from 'next/server';

import {
	applyBenchConsentLatency,
	benchConsentManifestResponse,
	recordBenchConsentFixtureExecution,
} from '../fixture';

export const GET = async function GET() {
	recordBenchConsentFixtureExecution('manifest');
	await applyBenchConsentLatency();

	return NextResponse.json(await benchConsentManifestResponse, {
		headers: {
			'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
			etag: '"nextjs-browser-bench-manifest"',
		},
	});
};
