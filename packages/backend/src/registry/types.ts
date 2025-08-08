import type { createLogger } from '@doubletie/logger';
import type { InferFumaDB } from 'fumadb';
import type { DB } from '~/schema';

export interface Registry {
	db: InferFumaDB<typeof DB>['abstract'];
	ctx: {
		logger: ReturnType<typeof createLogger>;
	};
}
