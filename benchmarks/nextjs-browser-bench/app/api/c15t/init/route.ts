import { createNextConsentRouteHandlers } from '@c15t/nextjs/v3/api';

function getBenchManifestURL() {
	const token = process.env.C15T_BENCH_COLD_MANIFEST_TOKEN;
	return token
		? `/api/bench-consent/manifest?cold=${encodeURIComponent(token)}`
		: '/api/bench-consent/manifest';
}

const handlers = createNextConsentRouteHandlers({
	manifestURL: getBenchManifestURL(),
});

export const GET = handlers.GET;
