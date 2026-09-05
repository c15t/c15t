import { BENCHMARK_POLICY_RESOLUTION } from '$lib/bench/policy';
import { translations } from '@c15t/translations/en';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { writePolicyResolutionWire } from 'c15t';
import type { InitOutput } from 'c15t';

const response = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: {
		countryCode: 'DE',
		regionCode: 'BE',
	},
	policyResolution: writePolicyResolutionWire(BENCHMARK_POLICY_RESOLUTION),
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
			consentTypes: translations.consentTypes,
			cookieBanner: {
				description: 'Deterministic benchmark fixture.',
				title: 'Benchmark Consent Banner',
			},
		},
	},
} satisfies InitOutput;

const headers = {
	'cache-control': 'no-store',
};

export const GET: RequestHandler = () => json(response, { headers });

export const POST: RequestHandler = () => json(response, { headers });
