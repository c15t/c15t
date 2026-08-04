/**
 * `c15t self-host migrate` — bring a database up to the current schema.
 *
 * The 2.x version of this command asked which ORM adapter you used, handed the
 * answer to fumadb, and then took one of two paths: a real migration for
 * Kysely and Mongo, or — for Drizzle, Prisma and TypeORM — writing a schema
 * file for the operator to apply themselves. It also could not migrate MySQL
 * at all, on any adapter.
 *
 * There is one path now. `migrate()` classifies the database, adopts it to the
 * frozen 2.0.0 baseline if it is behind, and applies whatever numbered
 * migrations the ledger has not recorded. Postgres, MySQL and SQLite alike.
 *
 * ## Dry run first, always
 *
 * The plan is computed and shown before anything is written, and applying it
 * needs an explicit yes. This is the one command in the CLI that writes to a
 * production database, and adopting a 1.x schema is not a small change.
 */

import { createMigrator } from '@c15t/backend-next';
import { installDependencies } from '~/commands/generate/options/utils/dependencies';
import { ensureBackendConfig } from '~/commands/self-host/migrate/ensure-backend-config';
import { readDatabaseConfig } from '~/commands/self-host/migrate/read-config';
import {
	confirmApply,
	describePlan,
	isUpToDate,
} from '~/commands/self-host/migrate/report';
import type { CliContext } from '~/context/types';
import { TelemetryEventName } from '~/utils/telemetry';

export async function migrate(context: CliContext) {
	const { logger, telemetry } = context;
	telemetry.trackEvent(TelemetryEventName.MIGRATION_STARTED, {});

	const configResult = await ensureBackendConfig(context);
	if (!configResult?.path) {
		logger.error('No backend config found.');
		return;
	}

	if (configResult.dependencies.length > 0) {
		await installDependencies({
			context,
			dependenciesToAdd: configResult.dependencies,
			autoInstall: true,
		});
	}

	const database = await readDatabaseConfig(context, configResult.path);

	// Disposed at the end: it owns the connection pool, and a CLI process
	// holding one open does not exit.
	const migrator = createMigrator(database);

	try {
		const planned = await migrator.plan();

		if (planned.blocked !== undefined) {
			// Refusing is the correct outcome, not a crash: the database is
			// recognisably c15t but not a shape we have a fixture for, and
			// guessing would rewrite consent records.
			logger.error(planned.blocked);
			telemetry.trackEvent(TelemetryEventName.MIGRATION_FAILED, {
				blocked: true,
			});
			return;
		}

		describePlan(context, planned);
		telemetry.trackEvent(TelemetryEventName.MIGRATION_PLANNED, {
			success: true,
		});

		if (isUpToDate(planned)) {
			logger.success('Database is already up to date.');
			return;
		}

		if (!(await confirmApply())) {
			logger.info('No changes made.');
			telemetry.trackEvent(TelemetryEventName.MIGRATION_FAILED, {
				execute: false,
			});
			return;
		}

		const applied = await migrator.apply();

		logger.success(
			`Migration completed. ${applied.adoption.length} adoption step(s), ` +
				`${applied.pending.length} migration(s).`
		);
		telemetry.trackEvent(TelemetryEventName.MIGRATION_COMPLETED, {
			success: true,
		});
	} finally {
		await migrator.dispose();
	}
}
