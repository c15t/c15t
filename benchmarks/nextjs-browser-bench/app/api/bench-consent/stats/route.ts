import { NextResponse } from 'next/server';

import {
	getBenchConsentFixtureCounts,
	resetBenchConsentFixtureCounts,
} from '../fixture';

export const GET = function GET() {
	return NextResponse.json(getBenchConsentFixtureCounts(), {
		headers: {
			'cache-control': 'no-store',
		},
	});
};

export const POST = function POST() {
	return NextResponse.json(resetBenchConsentFixtureCounts(), {
		headers: {
			'cache-control': 'no-store',
		},
	});
};
