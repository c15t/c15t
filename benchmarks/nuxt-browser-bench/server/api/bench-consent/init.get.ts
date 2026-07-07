import {
	applyBenchConsentLatency,
	benchConsentInitResponse,
	recordBenchConsentFixtureExecution,
	recordBenchConsentVersionHeader,
} from './fixture';

export default defineEventHandler(async (event) => {
	recordBenchConsentFixtureExecution('init');
	recordBenchConsentVersionHeader(
		'init',
		getRequestHeader(event, 'x-c15t-version')
	);
	await applyBenchConsentLatency();

	setHeader(event, 'cache-control', 'no-store');
	return benchConsentInitResponse;
});
