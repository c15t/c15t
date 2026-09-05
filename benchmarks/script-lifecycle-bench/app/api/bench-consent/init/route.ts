import { NextResponse } from 'next/server';

/**
 * Deterministic init fixture. The scenarios that start as fresh visitors
 * expect the banner, so the response carries an explicit opt-in choice
 * policy: the promoted v3 API derives the first-layer UI from the
 * resolved policy and no longer infers it from `jurisdiction` alone.
 */
const response = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: {
		countryCode: 'DE',
		regionCode: 'BE',
	},
	policy: {
		consent: {
			categories: [
				'necessary',
				'functionality',
				'experience',
				'measurement',
				'marketing',
			],
			model: 'opt-in',
			scopeMode: 'strict',
		},
		id: 'script-lifecycle-bench',
		model: 'opt-in',
		ui: {
			banner: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryActions: ['accept'],
				scrollLock: false,
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryActions: ['accept'],
				scrollLock: false,
			},
			mode: 'banner',
		},
	},
	policyDecision: {
		country: 'DE',
		fingerprint: 'fingerprint_script_lifecycle_bench',
		jurisdiction: 'GDPR',
		matchedBy: 'country',
		policyId: 'script-lifecycle-bench',
		region: 'BE',
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
