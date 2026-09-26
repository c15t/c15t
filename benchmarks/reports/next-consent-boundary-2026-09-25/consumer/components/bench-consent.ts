// Server-side consent resolution shared by the awaited and streamed arms.
// Reads two harness cookies:
// - `bench-manifest`: a per-sample token that gives the request its own
//   upstream manifest URL, which is a cold SDK manifest cache in a warm
//   process. Tokens starting with `fail500-` or `hang-` make the upstream
//   fail or hang.
// - `bench-sample`: a sample id; the resolution start and end times are
//   recorded against it and read back through /api/bench-consent/timings.
import { resolveConsent } from 'c15t/next/server';
import { cookies } from 'next/headers';
import { after } from 'next/server';

import { recordTiming } from './timings';

export const resolveBenchConsent = async () => {
	const jar = await cookies();
	const token = jar.get('bench-manifest')?.value;
	const sample = jar.get('bench-sample')?.value;
	const startedAt = performance.timeOrigin + performance.now();
	const manifestURL = token
		? `/api/c15t/manifest?cold=${encodeURIComponent(token)}`
		: '/api/c15t/manifest';
	const state = await resolveConsent({
		backendURL: '/api/bench-consent',
		manifestURL,
		reportSessions: false,
		waitUntil: (task) => after(() => task),
	});
	if (sample) {
		recordTiming(sample, {
			hasPolicy: Boolean(
				(state as { initialPolicyResolution?: unknown }).initialPolicyResolution
			),
			resolvedAt: performance.timeOrigin + performance.now(),
			startedAt,
		});
	}
	return state;
};
