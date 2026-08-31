/**
 * Finding, or creating, `c15t-backend.config.ts`.
 *
 * This replaces a 481-line adapter picker, and the shrinkage is the point
 * rather than a tidy-up. c15t 2.x asked which of five ORM adapters you used,
 * then which provider that adapter supported, then assembled a matching
 * `adapter:` expression and worked out the packages to install. Three of those
 * five adapters had no working migrator at the end of it, so the command
 * printed schema code at you to apply yourself.
 *
 * 3.0 connects to the database directly. There is one question worth asking —
 * which engine — and the answer is one of three. All three migrate.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import * as p from '@clack/prompts';

import type { CliContext } from '~/context/types';

class Cancelled extends Error {
	stage: string;
	constructor(stage: string) {
		super('Operation cancelled.');
		this.stage = stage;
	}
}

export const CONFIG_FILENAME = 'c15t-backend.config.ts';

/** The engines c15t supports, and what each needs to connect. */
export const DIALECTS = {
	mysql: {
		driver: '@effect/sql-mysql2',
		envVar: 'DATABASE_URL',
		field: 'url',
		label: 'MySQL',
		placeholder: 'mysql://user:password@localhost:3306/c15t',
	},
	postgres: {
		driver: '@effect/sql-pg',
		envVar: 'DATABASE_URL',
		field: 'url',
		label: 'PostgreSQL',
		placeholder: 'postgres://user:password@localhost:5432/c15t',
	},
	sqlite: {
		driver: '@effect/sql-sqlite-node',
		envVar: 'DATABASE_PATH',
		field: 'filename',
		label: 'SQLite',
		placeholder: './c15t.db',
	},
} as const;

export type Dialect = keyof typeof DIALECTS;

interface PromptDependencies {
	select: typeof p.select;
	isCancel: typeof p.isCancel;
}

const defaultPromptDependencies: PromptDependencies = {
	isCancel: p.isCancel,
	select: p.select,
};

export const pathExists = async function pathExists(
	filePath: string
): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
};

/**
 * The generated config file.
 *
 * The connection is read from the environment rather than written into a file
 * that lands in version control — a database URL carries credentials. The 2.x
 * templates did the same, for the same reason.
 */
export const buildConfig = function buildConfig(dialect: Dialect): string {
	const { envVar, placeholder, field } = DIALECTS[dialect];

	// Postgres is the only engine that needs an isolation option: MySQL scopes
	// by database and SQLite by file, both of which the connection already
	// names. Commented rather than omitted so it is discoverable by whoever
	// shares a database with another application.
	const scoping =
		dialect === 'postgres'
			? "\n\t\t// Keep c15t's tables out of `public`, if you share this database:\n\t\t// schema: 'c15t',"
			: '';

	return `import { defineConfig } from '@c15t/backend';

export default defineConfig({
	database: {
		dialect: '${dialect}',
		// e.g. ${placeholder}
		${field}: process.env.${envVar} ?? '',${scoping}
	},
});
`;
};

const promptDialect = async function promptDialect(
	dependencies: PromptDependencies = defaultPromptDependencies
): Promise<Dialect> {
	const selected = await dependencies.select({
		message: 'Which database?',
		options: (Object.keys(DIALECTS) as Dialect[]).map((dialect) => ({
			label: DIALECTS[dialect].label,
			value: dialect,
		})),
	});

	if (dependencies.isCancel(selected)) {
		throw new Cancelled('dialect_select');
	}
	return selected;
};

export interface EnsuredConfig {
	readonly path: string;
	/** Driver packages to install. Empty when the config already existed. */
	readonly dependencies: string[];
}

/**
 * Returns the path to the backend config, creating one if there is none.
 *
 * @returns `null` when the operator cancels.
 */
export const ensureBackendConfig = async function ensureBackendConfig(
	context: CliContext,
	dependencies: PromptDependencies = defaultPromptDependencies
): Promise<EnsuredConfig | null> {
	const { cwd, logger } = context;
	const targetPath = path.join(cwd, CONFIG_FILENAME);

	if (await pathExists(targetPath)) {
		logger.debug(`Backend config already exists at ${targetPath}`);
		// Nothing to install: whatever an existing config needs is already a
		// dependency, or it would never have loaded.
		return { dependencies: [], path: targetPath };
	}

	try {
		const dialect = await promptDialect(dependencies);
		await fs.writeFile(targetPath, buildConfig(dialect), 'utf8');
		logger.success(`Created ${path.relative(cwd, targetPath)}`);

		const { envVar } = DIALECTS[dialect];
		logger.note(
			`Remember to set ${envVar} in your environment or .env file.`,
			'Environment'
		);

		return { dependencies: [DIALECTS[dialect].driver], path: targetPath };
	} catch (err) {
		if (err instanceof Cancelled) {
			return context.error.handleCancel('Operation cancelled.', {
				command: 'ensure-backend-config',
				stage: err.stage,
			});
		}
		throw err;
	}
};
