import { BENCHMARK_POLICY } from '$lib/bench/policy';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

const response = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: {
		countryCode: 'DE',
		regionCode: 'BE',
	},
	policy: BENCHMARK_POLICY,
	policySnapshotToken: 'svelte-browser-bench',
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
			cookieBanner: {
				description: 'Deterministic benchmark fixture.',
				title: 'Benchmark Consent Banner',
			},
		},
	},
};

const headers = {
	'cache-control': 'no-store',
};

export const GET: RequestHandler = () => json(response, { headers });

export const POST: RequestHandler = () => json(response, { headers });
