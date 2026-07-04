import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { BENCHMARK_POLICY } from '$lib/bench/policy';

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
				description: 'Deterministic benchmark fixture.',
			},
			consentManagerDialog: {
				title: 'Benchmark Preferences',
				description: 'Benchmark preferences description.',
			},
		},
	},
	policy: BENCHMARK_POLICY,
	policySnapshotToken: 'svelte-browser-bench',
};

const headers = {
	'cache-control': 'no-store',
};

export const GET: RequestHandler = async () => {
	return json(response, { headers });
};

export const POST: RequestHandler = async () => {
	return json(response, { headers });
};
