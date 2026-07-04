import { NextResponse } from 'next/server';
import {
	getBenchConsentFixtureCounts,
	resetBenchConsentFixtureCounts,
} from '../fixture';

export async function GET() {
	return NextResponse.json(getBenchConsentFixtureCounts(), {
		headers: {
			'cache-control': 'no-store',
		},
	});
}

export async function POST() {
	return NextResponse.json(resetBenchConsentFixtureCounts(), {
		headers: {
			'cache-control': 'no-store',
		},
	});
}
