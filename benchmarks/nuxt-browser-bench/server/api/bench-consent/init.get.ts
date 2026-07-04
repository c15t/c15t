import {
	applyBenchConsentLatency,
	benchConsentInitResponse,
	recordBenchConsentFixtureExecution,
} from './fixture';

export default defineEventHandler(async (event) => {
	recordBenchConsentFixtureExecution('init');
	await applyBenchConsentLatency();

	setHeader(event, 'cache-control', 'no-store');
	return benchConsentInitResponse;
});
