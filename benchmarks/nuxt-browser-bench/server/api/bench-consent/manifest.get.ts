import {
	applyBenchConsentLatency,
	benchConsentManifestResponse,
} from './fixture';

export default defineEventHandler(async (event) => {
	await applyBenchConsentLatency();

	setHeader(
		event,
		'cache-control',
		'public, s-maxage=300, stale-while-revalidate=86400'
	);
	setHeader(event, 'etag', '"nuxt-browser-bench-manifest"');
	return benchConsentManifestResponse;
});
