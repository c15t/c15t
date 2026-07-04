import { setTimeout as sleep } from 'node:timers/promises';
import { NextResponse } from 'next/server';

const response = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: {
		countryCode: 'DE',
		regionCode: 'BE',
	},
	translations: {
		language: 'en',
		translations: {
			common: {
				acceptAll: 'Accept All',
				rejectAll: 'Reject All',
				customize: 'Customize',
				save: 'Save',
			},
			cookieBanner: {
				title: 'Benchmark Consent Banner',
				description: 'Benchmark fixture description.',
			},
			consentManagerDialog: {
				title: 'Benchmark Preferences',
				description: 'Benchmark preferences description.',
			},
		},
	},
	policySnapshotToken: 'nextjs-browser-bench',
};

export async function GET() {
	const latencyMs = Number(process.env.C15T_BENCH_INIT_LATENCY_MS ?? '0');
	if (Number.isFinite(latencyMs) && latencyMs > 0) {
		await sleep(latencyMs);
	}

	return NextResponse.json(response, {
		headers: {
			'cache-control': 'no-store',
		},
	});
}
