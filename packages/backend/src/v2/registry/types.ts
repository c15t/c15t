import type { createLogger } from '@doubletie/logger';
import type { InferFumaDB } from 'fumadb';
import type { DB } from '~/v2/schema';

export interface Registry {
	db: ReturnType<InferFumaDB<typeof DB>['orm']>;
	ctx: {
		logger: ReturnType<typeof createLogger>;
	};
}
