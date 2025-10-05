import { analyticsHealthCheck } from './health.handler';
import { processAnalyticsEvents } from './process.handler';

export const analyticsHandlers = {
	process: processAnalyticsEvents,
	health: analyticsHealthCheck,
};
