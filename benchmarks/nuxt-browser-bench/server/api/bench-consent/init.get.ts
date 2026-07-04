import { setTimeout as sleep } from 'node:timers/promises';

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
			consentTypes: {
				necessary: {
					title: 'Necessary',
					description: 'Required cookies.',
				},
				functionality: {
					title: 'Functionality',
					description: 'Feature cookies.',
				},
				experience: {
					title: 'Experience',
					description: 'Experience cookies.',
				},
				measurement: {
					title: 'Measurement',
					description: 'Analytics cookies.',
				},
				marketing: {
					title: 'Marketing',
					description: 'Advertising cookies.',
				},
			},
		},
	},
	policy: {
		id: 'nuxt-browser-bench',
		model: 'opt-in',
		consent: {
			model: 'opt-in',
			categories: [
				'necessary',
				'functionality',
				'experience',
				'measurement',
				'marketing',
			],
			scopeMode: 'strict',
		},
		ui: {
			mode: 'banner',
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
		},
	},
	policyDecision: {
		policyId: 'nuxt-browser-bench',
		fingerprint: 'fingerprint_nuxt_browser_bench',
		matchedBy: 'country',
		country: 'DE',
		region: 'BE',
		jurisdiction: 'GDPR',
	},
	policySnapshotToken: 'nuxt-browser-bench',
};

export default defineEventHandler(async (event) => {
	const latencyMs = Number(process.env.C15T_BENCH_INIT_LATENCY_MS ?? '0');
	if (Number.isFinite(latencyMs) && latencyMs > 0) {
		await sleep(latencyMs);
	}

	setHeader(event, 'cache-control', 'no-store');
	return response;
});
