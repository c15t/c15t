/**
 * Showing the operator what a migration will do, and asking before it does it.
 *
 * Replaces `migrator-result.ts` and `orm-result.ts`. The second of those is
 * gone entirely: it existed because three of 2.x's five adapters had no
 * migrator, so the command wrote a schema file and left the operator to apply
 * it. Every engine migrates now, so there is one path.
 *
 * The confirmation stays. This runs against production databases, and the
 * plan is worth reading before it is applied.
 */

import type { MigrateReport } from '@c15t/backend';
import * as p from '@clack/prompts';

import type { CliContext } from '~/context/types';

/** Prints what the migration found and intends to do. */
export function describePlan(context: CliContext, report: MigrateReport): void {
	const { logger } = context;

	logger.info(`Database shape: ${report.shape._tag}`);

	if (report.adoption.length > 0) {
		logger.message(
			`${report.adoption.length} step(s) to reach the 2.0.0 baseline:`
		);
		for (const step of report.adoption) {
			logger.message(`  • ${step}`);
		}
	}

	if (report.pending.length > 0) {
		logger.message(`${report.pending.length} migration(s) to apply:`);
		for (const migration of report.pending) {
			logger.message(`  • ${migration}`);
		}
	}

	if (report.retained.length > 0) {
		// Adoption is add-only, so a 1.x database keeps columns 2.0.0 dropped —
		// `consent.status`, `consentRecord`, and so on. Those hold real consent
		// history, and the operator should know they survived rather than
		// discover it later.
		logger.note(
			[
				'Kept, because migrating never deletes:',
				...report.retained.map((item) => `  • ${item}`),
				'',
				'Drop them yourself once you are satisfied nothing needs them.',
			].join('\n'),
			'Retained'
		);
	}
}

/**
 * Whether there is anything to do.
 *
 * An up-to-date database is the common case on a redeploy, and it should say
 * so and exit rather than prompt.
 */
export const isUpToDate = (report: MigrateReport): boolean =>
	report.adoption.length === 0 && report.pending.length === 0;

/**
 * Asks whether to apply the plan.
 *
 * Defaults to no. The operator has to opt in to writing to their database.
 */
export async function confirmApply(): Promise<boolean> {
	const answer = await p.confirm({
		message: 'Apply this migration?',
		initialValue: false,
	});

	return !p.isCancel(answer) && answer;
}
