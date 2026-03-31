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
				title: 'Script Lifecycle Benchmark Banner',
				description: 'Deterministic script benchmark fixture.',
			},
			consentManagerDialog: {
				title: 'Script Lifecycle Preferences',
				description: 'Benchmark preferences description.',
			},
		},
	},
	policySnapshotToken: 'script-lifecycle-bench',
};

export async function GET() {
	return NextResponse.json(response, {
		headers: {
			'cache-control': 'no-store',
		},
	});
}
