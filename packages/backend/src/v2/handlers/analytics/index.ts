import { analyticsHealthCheck } from './health.handler';
import { processAnalyticsEvents } from './process.handler';

export const analyticsHandlers = {
	process: processAnalyticsEvents,
	health: analyticsHealthCheck,
};

export type { EventFilter, EventProcessorConfig } from './event-processor';
// Export EventProcessor for use in other modules
export { EventProcessor } from './event-processor';
