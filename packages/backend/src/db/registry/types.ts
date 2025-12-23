import type { createLogger } from '@c15t/logger';
import type { InferFumaDB } from 'fumadb';
import type { DB } from '~/db/schema';

export interface Registry {
	db: ReturnType<InferFumaDB<typeof DB>['orm']>;
	ctx: {
		logger: ReturnType<typeof createLogger>;
	};
}
