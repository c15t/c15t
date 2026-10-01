import type {
	ExperimentSummaryOutput,
	ExperimentSummaryQuery,
} from '@c15t/schema/types';

import type { FetcherContext } from '../fetcher';
import { fetcher } from '../fetcher';
import type { FetchOptions, ResponseContext } from '../types';

/**
 * API endpoint path for experiments
 */
export const EXPERIMENTS_PATH = '/experiments';

/**
 * Summarise a banner experiment: choices per arm by action and surface,
 * with the median time to decision. Requires an API key.
 *
 * Counts choices only. Impressions never reach the backend, so compute
 * opt-in rates from the client-side `experiment.reportTo` events.
 *
 * @param context - Fetcher context
 * @param id - Experiment id, as configured on the client
 * @param query - Optional `from`, `to` (ISO dates) and `domain` filters
 * @param options - Optional fetch options
 * @returns Per-arm summary
 */
export const summarizeExperiment = function summarizeExperiment(
	context: FetcherContext,
	id: string,
	query?: ExperimentSummaryQuery,
	options?: FetchOptions<ExperimentSummaryOutput, never, ExperimentSummaryQuery>
): Promise<ResponseContext<ExperimentSummaryOutput>> {
	return fetcher<ExperimentSummaryOutput, never, ExperimentSummaryQuery>(
		context,
		`${EXPERIMENTS_PATH}/${encodeURIComponent(id)}/summary`,
		{
			method: 'GET',
			query,
			...options,
		}
	);
};
