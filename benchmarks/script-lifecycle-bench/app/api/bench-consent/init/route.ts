import { NextResponse } from 'next/server';

const response = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: {
		countryCode: 'DE',
		regionCode: 'BE',
	},
	policySnapshotToken: 'script-lifecycle-bench',
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
				description: 'Benchmark preferences description.',
				title: 'Script Lifecycle Preferences',
			},
			cookieBanner: {
				description: 'Deterministic script benchmark fixture.',
				title: 'Script Lifecycle Benchmark Banner',
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
