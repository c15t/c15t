/**
 * Experiment reads: per-arm choice counts for `GET /experiments/:id/summary`.
 *
 * Everything here groups on the columns `4-experiment-attribution` added —
 * `experimentId`, `experimentVariant` — plus `consentAction` and `uiSource`,
 * which the baseline already had. None of it reads `metadata`: JSON path
 * syntax differs on every engine c15t supports, which is why the attribution
 * was projected onto columns in the first place.
 *
 * ## What this counts
 *
 * Choices, and only choices. A consent row exists when a subject acted; an
 * impression that led nowhere and a dismissed opt-out notice never reach the
 * backend. So this can say how many subjects chose what under each arm, but
 * not what fraction of the subjects who *saw* an arm did — that ratio needs
 * `experiment.reportTo` on the client, which sends impressions to the host's
 * analytics. The docs guide spells out the comparison.
 *
 * ## The median
 *
 * There is no portable `percentile_cont`: Postgres has it, MySQL does not,
 * SQLite does not. So `timeToDecisionMs` is read per arm, ordered, and the
 * median is taken in JavaScript. The read is capped at
 * `MEDIAN_SAMPLE_LIMIT` rows per arm — an experiment with more choices than
 * that has a median the first 50 000 sorted values already pin down to well
 * within the precision anyone reads a banner metric at, and an unbounded
 * scan is not something an API-key holder should be able to trigger.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import type { SqlError, Statement } from 'effect/unstable/sql';

import { tenantScope } from '../db/tenant';
import type { Tenant } from '../db/tenant';
import { encoder } from '../db/values';

/**
 * Rows of `timeToDecisionMs` read per arm for the median.
 *
 * Ordered ascending and truncated, so past the cap the median is over the
 * lowest values only. Documented on the route; a caller who needs an exact
 * figure over a larger arm narrows the window with `from` and `to`.
 */
export const MEDIAN_SAMPLE_LIMIT = 50_000;

/** Key used for rows whose `consentAction` or `uiSource` is null. */
const UNKNOWN = 'unknown';

export interface ExperimentFilters {
	/** Inclusive lower bound on `givenAt`. */
	readonly from?: Date;
	/** Inclusive upper bound on `givenAt`. */
	readonly to?: Date;
	/** Restrict to consents recorded against this domain name. */
	readonly domain?: string;
}

export interface VariantSummary {
	readonly variant: string;
	readonly choices: number;
	readonly byAction: Record<string, number>;
	readonly bySurface: Record<string, number>;
	readonly medianTimeToDecisionMs: number | null;
}

interface CountRow {
	readonly variant: string;
	readonly bucket: string | null;
	readonly total: number | string;
}

/**
 * The `where` clause every query here shares: this experiment, this tenant,
 * and whatever window and domain the caller asked for.
 */
const scope = Effect.fn('experiment.scope')(function* scope(
	experimentId: string,
	filters: ExperimentFilters
): Generator<
	Effect.Effect<unknown, never, SqlClient.SqlClient | Tenant>,
	Statement.Fragment
> {
	const sql = yield* SqlClient.SqlClient;
	const encode = yield* encoder;
	const tenant = yield* tenantScope('c');

	const clauses: Statement.Fragment[] = [
		sql`${sql('c.experimentId')} = ${experimentId}`,
		sql`${sql('c.experimentVariant')} is not null`,
		tenant,
	];
	if (filters.from !== undefined) {
		clauses.push(sql`${sql('c.givenAt')} >= ${encode(filters.from)}`);
	}
	if (filters.to !== undefined) {
		clauses.push(sql`${sql('c.givenAt')} <= ${encode(filters.to)}`);
	}
	if (filters.domain !== undefined) {
		// Through the domain table rather than a join: the count queries group
		// on consent columns only, and a subquery keeps them that way. Domains
		// are tenant-scoped too, so a name another tenant registered does not
		// match here.
		const domainTenant = yield* tenantScope('d');
		clauses.push(sql`${sql('c.domainId')} in (
			select ${sql('d.id')} from ${sql('domain')} as ${sql('d')}
			where ${sql('d.name')} = ${filters.domain} and ${domainTenant}
		)`);
	}
	return sql.and(clauses);
});

const countBy = Effect.fn('experiment.countBy')(function* countBy(
	column: 'consentAction' | 'uiSource',
	where: Statement.Fragment
) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<CountRow>`
		select ${sql('c.experimentVariant')} as ${sql('variant')},
			${sql(`c.${column}`)} as ${sql('bucket')},
			count(*) as ${sql('total')}
		from ${sql('consent')} as ${sql('c')}
		where ${where}
		group by ${sql('c.experimentVariant')}, ${sql(`c.${column}`)}
	`;
	const byVariant = new Map<string, Record<string, number>>();
	for (const row of rows) {
		const buckets = byVariant.get(row.variant) ?? {};
		buckets[row.bucket ?? UNKNOWN] = Number(row.total);
		byVariant.set(row.variant, buckets);
	}
	return byVariant;
});

const medianOf = (sorted: readonly number[]): number | null => {
	if (sorted.length === 0) {
		return null;
	}
	const middle = Math.floor(sorted.length / 2);
	const upper = sorted[middle];
	const lower = sorted[middle - 1];
	if (upper === undefined) {
		return null;
	}
	return sorted.length % 2 === 1 || lower === undefined
		? upper
		: (lower + upper) / 2;
};

const medianTimeToDecision = Effect.fn('experiment.median')(
	function* medianTimeToDecision(variant: string, where: Statement.Fragment) {
		const sql = yield* SqlClient.SqlClient;
		const rows = yield* sql<{ ms: number | string }>`
			select ${sql('c.timeToDecisionMs')} as ${sql('ms')}
			from ${sql('consent')} as ${sql('c')}
			where ${where}
				and ${sql('c.experimentVariant')} = ${variant}
				and ${sql('c.timeToDecisionMs')} is not null
			order by ${sql('c.timeToDecisionMs')} asc
			limit ${MEDIAN_SAMPLE_LIMIT}
		`;
		return medianOf(rows.map((row) => Number(row.ms)));
	}
);

/**
 * Per-arm choice counts for one experiment.
 *
 * Arms are discovered from the data: an arm nobody has chosen under is
 * absent, and an experiment id no consent carries yields an empty list
 * rather than a failure — from the backend's side those are the same fact.
 */
export const summarizeExperiment = Effect.fn('experiment.summarize')(
	function* summarizeExperiment(
		experimentId: string,
		filters: ExperimentFilters = {}
	): Generator<
		Effect.Effect<unknown, SqlError.SqlError, SqlClient.SqlClient | Tenant>,
		readonly VariantSummary[]
	> {
		const where = yield* scope(experimentId, filters);
		const byAction = yield* countBy('consentAction', where);
		const bySurface = yield* countBy('uiSource', where);

		const variants = [...byAction.keys()].sort();
		const summaries: VariantSummary[] = [];
		for (const variant of variants) {
			const actions = byAction.get(variant) ?? {};
			summaries.push({
				byAction: actions,
				bySurface: bySurface.get(variant) ?? {},
				choices: Object.values(actions).reduce((sum, n) => sum + n, 0),
				medianTimeToDecisionMs: yield* medianTimeToDecision(variant, where),
				variant,
			});
		}
		return summaries;
	}
);
