import { createConsentRoute } from '@c15t/nextjs/api';

const getBenchManifestURL = function getBenchManifestURL() {
	const token = process.env.C15T_BENCH_COLD_MANIFEST_TOKEN;
	return token
		? `/api/bench-consent/manifest?cold=${encodeURIComponent(token)}`
		: '/api/bench-consent/manifest';
};

// A fixed route file: the handler reads the route from the last URL segment.
export const { GET } = createConsentRoute({
	manifestURL: getBenchManifestURL(),
});
