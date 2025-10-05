import { analyticsHealthCheck } from './health.handler';
import { processAnalyticsEvents } from './process.handler';
import { getScriptsHandler } from './scripts.handler';

export const analyticsHandlers = {
	process: processAnalyticsEvents,
	health: analyticsHealthCheck,
	scripts: getScriptsHandler,
};

export type { EventFilter, EventProcessorConfig } from './event-processor';
// Export EventProcessor for use in other modules
export { EventProcessor } from './event-processor';
