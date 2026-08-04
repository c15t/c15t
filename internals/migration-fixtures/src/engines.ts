/**
 * The three SQL engines c15t supports, and what each needs in order to be
 * driven by a published package inside a throwaway workspace.
 *
 * sqlite and postgres run in-process. MySQL needs a real server, so fixtures
 * for it are generated locally against Docker and the dumps are committed —
 * CI verifies against the committed dumps rather than standing up a database
 * (RFC §7 keeps Docker off CI's critical path).
 */

export type EngineName = 'sqlite' | 'postgres' | 'mysql';

export interface Engine {
	readonly name: EngineName;
	/** Packages the throwaway workspace needs on top of the c15t release. */
	readonly deps: readonly string[];
	/**
	 * `type` for the legacy kysely adapter's `DatabaseConfiguration`, and
	 * `provider` for the fumadb kysely adapter. They disagree on spelling, so
	 * both are recorded.
	 */
	readonly legacyType: string;
	readonly fumadbProvider: string;
	/** Whether generating this engine's fixtures needs Docker. */
	readonly needsDocker: boolean;
}

export const ENGINES: readonly Engine[] = [
	{
		name: 'sqlite',
		deps: ['kysely', 'better-sqlite3'],
		legacyType: 'sqlite',
		fumadbProvider: 'sqlite',
		needsDocker: false,
	},
	{
		name: 'postgres',
		deps: ['kysely', '@electric-sql/pglite', 'kysely-pglite'],
		legacyType: 'postgres',
		fumadbProvider: 'postgresql',
		needsDocker: false,
	},
	{
		name: 'mysql',
		deps: ['kysely', 'mysql2'],
		legacyType: 'mysql',
		fumadbProvider: 'mysql',
		needsDocker: true,
	},
] as const;

export function engineByName(name: string): Engine {
	const engine = ENGINES.find((candidate) => candidate.name === name);
	if (!engine) {
		const known = ENGINES.map((candidate) => candidate.name).join(', ');
		throw new Error(`Unknown engine "${name}". Known engines: ${known}`);
	}
	return engine;
}

/**
 * Source for the Kysely instance the driver script runs against, evaluated
 * inside the throwaway workspace where the engine's drivers are installed.
 *
 * Emitted as source rather than imported because each throwaway workspace has
 * its own copy of kysely — sharing an instance across installs would risk
 * dual-package hazards between the generator and the release under test.
 */
/**
 * Names that read as a scratch database rather than someone's data.
 *
 * Deliberately narrow. The documented container uses `c15t`, and anything else
 * has to be opted into — a generous pattern would defeat the point, because
 * the failure this guards against is a plausible-looking URL.
 */
const DISPOSABLE = /^(c15t|c15t[_-].*|.*[_-](fixture|fixtures|test|tmp))$/i;

/**
 * Refuses to reset a database that does not look disposable.
 *
 * The generated MySQL harness drops every table it finds. Postgres and SQLite
 * cannot hit this — they get a fresh in-process database per run — so the check
 * lives with the one engine that talks to a server the operator supplied.
 */
export function assertDisposable(url: string, allowAnyDatabase: boolean): void {
	const name = new URL(url).pathname.replace(/^\//, '');

	if (name === '') {
		throw new Error(
			`--mysql-url has no database name (${url}). Point it at a throwaway ` +
				'database; the fixture run drops every table it finds.'
		);
	}

	if (allowAnyDatabase || DISPOSABLE.test(name)) {
		return;
	}

	throw new Error(
		`Refusing to reset MySQL database "${name}": the fixture run drops every ` +
			'table in it, and that name does not look like a throwaway.\n' +
			'  Use a disposable database (for example "c15t", "c15t_fixtures" or ' +
			'anything ending in _test), or pass --allow-any-database if you are ' +
			'certain.'
	);
}

export function connectionSource(
	engine: Engine,
	mysqlUrl: string | undefined,
	allowAnyDatabase = false
): string {
	switch (engine.name) {
		case 'sqlite':
			return `
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

const database = new Database(':memory:');
export const db = new Kysely({ dialect: new SqliteDialect({ database }) });
export const teardown = async () => { await db.destroy(); };
`;
		case 'postgres':
			return `
import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';

const pglite = await KyselyPGlite.create();
export const db = new Kysely({ dialect: pglite.dialect });
export const teardown = async () => { await db.destroy(); };
`;
		case 'mysql': {
			if (!mysqlUrl) {
				throw new Error(
					'MySQL fixtures need a server. Pass --mysql-url, or start one with:\n' +
						'  docker run --rm -d -p 3399:3306 -e MYSQL_ROOT_PASSWORD=c15t -e MYSQL_DATABASE=c15t --name c15t-fixtures mysql:8\n' +
						'  bun run generate --engine mysql --mysql-url mysql://root:c15t@127.0.0.1:3399/c15t'
				);
			}
			// Unlike sqlite and postgres, which get a fresh in-process database per
			// run, MySQL is a shared server. Every shape must start from a blank
			// schema or it captures whatever the previous shape left behind — and
			// a dirty database changes the migration path, not just the result.
			//
			// That reset drops every table it finds, so the URL had better name a
			// throwaway. Checked here rather than trusted: `--mysql-url` is a
			// string on a command line, and the cost of getting it wrong is
			// someone's database rather than a failed run. The name must look
			// disposable, or the operator has to say so explicitly.
			assertDisposable(mysqlUrl, allowAnyDatabase);
			return `
import { Kysely, MysqlDialect, sql } from 'kysely';
import { createPool } from 'mysql2';

const pool = createPool(${JSON.stringify(mysqlUrl)});
export const db = new Kysely({ dialect: new MysqlDialect({ pool }) });

const existing = await db.introspection.getTables();
if (existing.length > 0) {
  await sql\`set foreign_key_checks = 0\`.execute(db);
  for (const table of existing) {
    await sql.raw(\`drop table if exists \\\`\${table.name}\\\`\`).execute(db);
  }
  await sql\`set foreign_key_checks = 1\`.execute(db);
}

export const teardown = async () => { await db.destroy(); };
`;
		}
	}
}
