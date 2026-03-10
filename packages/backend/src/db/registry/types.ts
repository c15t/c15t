import type { createLogger } from '@c15t/logger';
import type { InferFumaDB } from 'fumadb';
import type { LatestDB } from '~/db/schema';

export interface Registry {
	db: ReturnType<InferFumaDB<typeof LatestDB>['orm']>;
	ctx: {
		logger: ReturnType<typeof createLogger>;
	};
}
