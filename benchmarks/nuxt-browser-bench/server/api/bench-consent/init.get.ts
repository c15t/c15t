import { applyBenchConsentLatency, benchConsentInitResponse } from './fixture';

export default defineEventHandler(async (event) => {
	await applyBenchConsentLatency();

	setHeader(event, 'cache-control', 'no-store');
	return benchConsentInitResponse;
});
