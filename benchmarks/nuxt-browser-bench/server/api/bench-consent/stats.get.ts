import { getBenchConsentFixtureCounts } from './fixture';

export default defineEventHandler((event) => {
	setHeader(event, 'cache-control', 'no-store');
	return getBenchConsentFixtureCounts();
});
