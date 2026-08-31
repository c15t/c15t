import { setTimeout as sleep } from 'node:timers/promises';

import { NextResponse } from 'next/server';

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
		id: 'react-browser-bench',
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
		fingerprint: 'fingerprint_react_browser_bench',
		jurisdiction: 'GDPR',
		matchedBy: 'country',
		policyId: 'react-browser-bench',
		region: 'BE',
	},
	policySnapshotToken: 'react-browser-bench',
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
				title: 'Benchmark Preferences',
			},
			consentTypes: {
				experience: {
					description: 'Experience cookies.',
					title: 'Experience',
				},
				functionality: {
					description: 'Feature cookies.',
					title: 'Functionality',
				},
				marketing: {
					description: 'Advertising cookies.',
					title: 'Marketing',
				},
				measurement: {
					description: 'Analytics cookies.',
					title: 'Measurement',
				},
				necessary: {
					description: 'Required cookies.',
					title: 'Necessary',
				},
			},
			cookieBanner: {
				description: 'Benchmark fixture description.',
				title: 'Benchmark Consent Banner',
			},
		},
	},
};

export const GET = async function GET() {
	const latencyMs = Number(process.env.C15T_BENCH_INIT_LATENCY_MS ?? '0');
	if (Number.isFinite(latencyMs) && latencyMs > 0) {
		await sleep(latencyMs);
	}

	return NextResponse.json(response, {
		headers: {
			'cache-control': 'no-store',
		},
	});
};
