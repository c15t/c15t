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
	return NextResponse.json(response, {
		headers: {
			'cache-control': 'no-store',
		},
	});
}
