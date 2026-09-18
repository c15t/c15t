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
 * SQLite does not. So the median is two queries per arm: the group-by that
 * produces the counts also counts the rows with a `timeToDecisionMs`, and a
 * second query reads the one or two middle rows of that arm's ordered
 * values with `limit … offset …`. The index on
 * `(experimentId, experimentVariant)` finds the arm; the engine sorts the
 * arm's values and returns only the middle. The result is exact for any arm
 * size.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import type { SqlError, Statement } from 'effect/unstable/sql';

import { tenantScope } from '../db/tenant';
import type { Tenant } from '../db/tenant';
import { encoder } from '../db/values';

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

/** One `(variant, action, surface)` group and its counts. */
interface GroupRow {
	readonly variant: string;
	readonly action: string | null;
	readonly surface: string | null;
	/** Rows in the group. */
	readonly total: number | string;
	/** Rows in the group with a `timeToDecisionMs`. */
	readonly timed: number | string;
}

/** Per-arm counts accumulated from the grouped rows. */
interface ArmCounts {
	readonly byAction: Record<string, number>;
	readonly bySurface: Record<string, number>;
	choices: number;
	/** Rows with a `timeToDecisionMs`: the sample size behind the median. */
	timed: number;
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
		// Through the domain table rather than a join: the count query groups
		// on consent columns only, and a subquery keeps it that way. Domains
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

/**
 * One grouped read per experiment: `(variant, action, surface)` with a row
 * count and a count of the rows that carry a decision time. Both breakdowns
 * and the median's sample size fall out of it in memory.
 */
const countArms = Effect.fn('experiment.countArms')(function* countArms(
	where: Statement.Fragment
) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<GroupRow>`
		select ${sql('c.experimentVariant')} as ${sql('variant')},
			${sql('c.consentAction')} as ${sql('action')},
			${sql('c.uiSource')} as ${sql('surface')},
			count(*) as ${sql('total')},
			count(${sql('c.timeToDecisionMs')}) as ${sql('timed')}
		from ${sql('consent')} as ${sql('c')}
		where ${where}
		group by ${sql('c.experimentVariant')}, ${sql('c.consentAction')},
			${sql('c.uiSource')}
	`;
	const arms = new Map<string, ArmCounts>();
	for (const row of rows) {
		const arm = arms.get(row.variant) ?? {
			byAction: {},
			bySurface: {},
			choices: 0,
			timed: 0,
		};
		const total = Number(row.total);
		const action = row.action ?? UNKNOWN;
		const surface = row.surface ?? UNKNOWN;
		arm.byAction[action] = (arm.byAction[action] ?? 0) + total;
		arm.bySurface[surface] = (arm.bySurface[surface] ?? 0) + total;
		arm.choices += total;
		arm.timed += Number(row.timed);
		arms.set(row.variant, arm);
	}
	return arms;
});

/**
 * The exact median of one arm's `timeToDecisionMs`, given how many rows
 * carry one.
 *
 * Reads only the middle of the ordered values: one row when the count is
 * odd, the two either side of the middle when it is even, averaged.
 */
const medianTimeToDecision = Effect.fn('experiment.median')(
	function* medianTimeToDecision(
		variant: string,
		where: Statement.Fragment,
		samples: number
	) {
		if (samples === 0) {
			return null;
		}
		const sql = yield* SqlClient.SqlClient;
		const middle = samples % 2 === 1 ? 1 : 2;
		const offset = Math.floor((samples - 1) / 2);
		// MySQL rejects bound parameters in `limit … offset …` of a prepared
		// statement. Both values derive from a row count we just read, never
		// from input, so they are spliced in as integer literals.
		const rows = yield* sql<{ ms: number | string }>`
			select ${sql('c.timeToDecisionMs')} as ${sql('ms')}
			from ${sql('consent')} as ${sql('c')}
			where ${where}
				and ${sql('c.experimentVariant')} = ${variant}
				and ${sql('c.timeToDecisionMs')} is not null
			order by ${sql('c.timeToDecisionMs')} asc
			limit ${sql.literal(String(middle))} offset ${sql.literal(String(offset))}
		`;
		if (rows.length === 0) {
			return null;
		}
		const sum = rows.reduce((total, row) => total + Number(row.ms), 0);
		return sum / rows.length;
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
		const arms = yield* countArms(where);

		const summaries: VariantSummary[] = [];
		for (const variant of [...arms.keys()].sort()) {
			const arm = arms.get(variant);
			if (arm === undefined) {
				continue;
			}
			summaries.push({
				byAction: arm.byAction,
				bySurface: arm.bySurface,
				choices: arm.choices,
				medianTimeToDecisionMs: yield* medianTimeToDecision(
					variant,
					where,
					arm.timed
				),
				variant,
			});
		}
		return summaries;
	}
);
