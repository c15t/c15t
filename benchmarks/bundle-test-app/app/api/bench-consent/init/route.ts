import { NextResponse } from 'next/server';

const response = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: {
		countryCode: 'DE',
		regionCode: 'BE',
	},
	policySnapshotToken: 'bundle-bench-snapshot',
	translations: {
		language: 'en',
		translations: {
			common: {
				acceptAll: 'Accept All',
				customize: 'Customize',
				rejectAll: 'Reject All',
				save: 'Save',
			},
			consentManagerDialog: {
				description: 'Benchmark fixture dialog description.',
				title: 'Benchmark Preferences',
			},
			cookieBanner: {
				description: 'Benchmark fixture description.',
				title: 'Benchmark Consent Banner',
			},
		},
	},
};

export const GET = function GET() {
	return NextResponse.json(response, {
		headers: {
			'cache-control': 'no-store',
		},
	});
};
