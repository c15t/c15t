/**
 * Regenerates the committed database fixtures by installing published
 * `@c15t/backend` releases into throwaway workspaces and running each one's
 * own migrator against a blank database.
 *
 * The releases are installed on demand rather than declared as dependencies:
 * generation is rare, the old releases drag native drivers and a MongoDB
 * client behind them, and nobody running `bun install` in this repo should
 * pay for a tool they will not run.
 *
 *   bun run generate                                    # every in-process shape
 *   bun run generate --engine sqlite
 *   bun run generate --shape legacy-upgraded
 *   bun run generate --engine mysql --mysql-url mysql://root:c15t@127.0.0.1:3399/c15t
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectionSource, ENGINES, engineByName } from './engines';
import type { Engine } from './engines';
import { introspectSource } from './introspect';
import { DATABASE_FIXTURES, fixtureByName } from './shapes';
import type { DatabaseFixture } from './shapes';

const FIXTURES_DIR = join(
	dirname(dirname(fileURLToPath(import.meta.url))),
	'fixtures'
);

interface Args {
	fixtures: readonly DatabaseFixture[];
	engines: readonly Engine[];
	mysqlUrl: string | undefined;
	allowAnyDatabase: boolean;
	keepWorkspace: boolean;
}

const parseArgs = function parseArgs(argv: readonly string[]): Args {
	const flag = (name: string): string | undefined => {
		const index = argv.indexOf(`--${name}`);
		return index === -1 ? undefined : argv[index + 1];
	};

	const fixtureName = flag('shape');
	const engineName = flag('engine');
	const mysqlUrl = flag('mysql-url');
	// The fixture run drops every table in the MySQL database it is given, so a
	// name that does not look disposable is refused unless this is passed.
	const allowAnyDatabase = process.argv.includes('--allow-any-database');

	const engines = engineName
		? [engineByName(engineName)]
		: // oxlint-disable-next-line no-inline-comments -- Preserve declaration order, interface shape, and public compatibility.
			// MySQL needs Docker, so it is opt-in via --engine mysql rather than
			// something a bare `bun run generate` silently fails on.
			ENGINES.filter((engine) => !engine.needsDocker);

	return {
		allowAnyDatabase,
		engines,
		fixtures: fixtureName ? [fixtureByName(fixtureName)] : DATABASE_FIXTURES,
		keepWorkspace: argv.includes('--keep-workspace'),
		mysqlUrl,
	};
};

/**
 * The kysely range a published release declares. 2.x declares none (it reaches
 * kysely through fumadb), so fall back to the last range that was declared
 * explicitly.
 */
/**
 * The driver versions fixtures are captured with.
 *
 * Pinned rather than `latest`, because these decide the physical `dataType`
 * strings the fixtures record. On `latest`, regenerating after a driver release
 * moves the fixtures with no c15t release having changed — which destroys the
 * only property they are for: a fixture diff means a c15t database shape really changed.
 * A `latest` driver can also resolve to something the pinned kysely below
 * cannot work with, breaking generation outright.
 *
 * Set to what `latest` resolved to when this was introduced, so pinning was a
 * no-op at the time rather than a silent recapture. Bump deliberately, and
 * expect to review the fixture diff that comes with it.
 */
const DRIVER_VERSIONS: Record<string, string> = {
	'@electric-sql/pglite': '0.5.4',
	'better-sqlite3': '13.0.2',
	'kysely-pglite': '0.6.1',
	mysql2: '3.23.2',
};

const KYSELY_FALLBACK = '^0.28.15';

const kyselyRangeFor = async function kyselyRangeFor(
	version: string
): Promise<string> {
	const response = await fetch(
		`https://registry.npmjs.org/@c15t%2Fbackend/${version}`
	);
	if (!response.ok) {
		return KYSELY_FALLBACK;
	}
	const manifest = (await response.json()) as {
		dependencies?: Record<string, string>;
		peerDependencies?: Record<string, string>;
	};
	return (
		manifest.dependencies?.kysely ??
		manifest.peerDependencies?.kysely ??
		KYSELY_FALLBACK
	);
};

/** npm alias for a release, safe to use as a JS identifier prefix. */
const aliasFor = function aliasFor(version: string): string {
	return `c15t_${version.replaceAll('.', '_')}`;
};

/** Subpaths each era exposes, relative to the aliased package. */
const eraSubpaths = function eraSubpaths(era: DatabaseFixture['era']): {
	migrator: string;
	schema?: string;
	adapter?: string;
} {
	// oxlint-disable-next-line default-case -- Preserve established branch order and control flow.
	switch (era) {
		case 'legacy':
			return { migrator: 'pkgs/migrations' };
		case 'fumadb-v2-subpath':
			return {
				adapter: 'v2/db/adapters/kysely',
				migrator: 'v2/db/migrator',
				schema: 'v2/db/schema',
			};
		case 'fumadb-root':
			return {
				adapter: 'db/adapters/kysely',
				migrator: 'db/migrator',
				schema: 'db/schema',
			};
	}
};

const driverSource = function driverSource(
	fixture: DatabaseFixture,
	engine: Engine
): string {
	const imports: string[] = [];
	const steps: string[] = [];

	for (const version of fixture.versions) {
		const alias = aliasFor(version);
		const paths = eraSubpaths(fixture.era);

		if (fixture.era === 'legacy') {
			imports.push(
				`import { getMigrations as getMigrations_${alias} } from '${alias}/${paths.migrator}';`
			);
			// The legacy migrator diffs its schema against the live database and
			// applies what is missing, so running it against an already-migrated
			// database is exactly how a real upgrade behaved.
			steps.push(`
  {
    const result = await getMigrations_${alias}({
      appName: 'migration-fixtures',
      secret: '${'0'.repeat(32)}',
      database: { db, type: '${engine.legacyType}' },
    });
    await result.runMigrations();
    applied.push({ version: '${version}', era: '${fixture.era}' });
  }`);
		} else {
			imports.push(
				`import { migrator as migrator_${alias} } from '${alias}/${paths.migrator}';`,
				`import { DB as DB_${alias} } from '${alias}/${paths.schema}';`,
				`import { kyselyAdapter as kyselyAdapter_${alias} } from '${alias}/${paths.adapter}';`
			);
			// migrator() returns a *plan*; nothing touches the database until
			// execute() is called. The CLI does the same (migrator-result.ts:51).
			steps.push(`
  {
    const client = DB_${alias}.client(
      kyselyAdapter_${alias}({ db, provider: '${engine.fumadbProvider}' })
    );
    const plan = await migrator_${alias}({ db: client, schema: 'latest' });
    // getSQL() is best-effort: on MySQL, fumadb's SQL preprocessing throws
    // ("ID columns must not be updated") even where execute() succeeds, so a
    // failure to render SQL must not fail the capture.
    let planSql = '';
    let planSqlError = null;
    try {
      if (typeof plan?.getSQL === 'function') planSql = plan.getSQL();
    } catch (error) {
      planSqlError = error instanceof Error ? error.message : String(error);
    }
    if (typeof plan?.execute !== 'function') {
      throw new Error(
        'migrator() returned no execute(); adapter likely unsupported for migrations'
      );
    }
    await plan.execute();
    applied.push({
      version: '${version}',
      era: '${fixture.era}',
      sql: planSql,
      ...(planSqlError ? { sqlRenderError: planSqlError } : {}),
    });
  }`);
		}
	}

	// Result goes to a file, not stdout: some releases log to stdout during
	// migration (1.8.6's legacy path does), which corrupts a stdout handoff.
	return `${imports.join('\n')}
import { writeFileSync } from 'node:fs';
import { db, teardown } from './connection.mjs';
import { capture } from './introspect.mjs';

const applied = [];

try {
${steps.join('\n')}

  const captured = await capture(db);
  writeFileSync('result.json', JSON.stringify({ applied, ...captured }));
} finally {
  await teardown();
}
`;
};

const generateOne = async function generateOne(
	fixture: DatabaseFixture,
	engine: Engine,
	args: Args
): Promise<void> {
	process.stderr.write(`  ${fixture.name} / ${engine.name} … `);

	// A combination the release provably cannot produce is recorded as such,
	// so the absent fixture reads as a finding rather than missing coverage.
	const blocker = fixture.unsupported?.[engine.name];
	if (blocker) {
		const outDir = join(FIXTURES_DIR, fixture.name);
		mkdirSync(outDir, { recursive: true });
		const unsupportedSnapshot: Record<string, unknown> = {
			engine: engine.name,
			era: fixture.era,
			unsupported: blocker,
			versions: fixture.versions,
		};
		unsupportedSnapshot['shape'] = fixture.name;
		await writeFile(
			join(outDir, `${engine.name}.unsupported.json`),
			`${JSON.stringify(unsupportedSnapshot, null, '\t')}\n`
		);
		process.stderr.write('unsupported by the release (recorded)\n');
		return;
	}

	const workspace = await mkdtemp(
		join(tmpdir(), `c15t-fixture-${fixture.name}-`)
	);

	try {
		const dependencies: Record<string, string> = {};
		for (const version of fixture.versions) {
			dependencies[aliasFor(version)] = `npm:@c15t/backend@${version}`;
		}
		// Pinned, not `latest`. These drivers decide the `dataType` strings the
		// fixtures capture, so a driver bump would move the fixtures without any
		// c15t release having changed — which is exactly the signal the fixtures
		// exist to give. A `latest` driver can also resolve to something the
		// pinned kysely below cannot work with, breaking generation outright.
		for (const dep of engine.deps) {
			// `kysely` is pinned just below, to the range the release itself was
			// built against — a stronger constraint than a fixed version here.
			if (dep === 'kysely') {
				continue;
			}
			const pinned = DRIVER_VERSIONS[dep];
			if (pinned === undefined) {
				throw new Error(
					`No pinned version for fixture driver "${dep}". Add one to ` +
						'DRIVER_VERSIONS so regeneration stays reproducible.'
				);
			}
			dependencies[dep] = pinned;
		}
		// Use the kysely the release itself was built against rather than
		// `latest`. 0.29 dropped the `Migrator` export that kysely-pglite still
		// imports, and a release should be exercised with its own dependency
		// anyway. For a multi-version chain, the newest release wins — that is
		// what a real deployment that upgraded would have resolved to.
		dependencies.kysely = await kyselyRangeFor(
			fixture.versions[fixture.versions.length - 1] as string
		);

		await writeFile(
			join(workspace, 'package.json'),
			`${JSON.stringify(
				{
					dependencies,
					name: 'fixture-workspace',
					private: true,
					type: 'module',
				},
				null,
				2
			)}\n`
		);
		await writeFile(
			join(workspace, 'connection.mjs'),
			connectionSource(engine, args.mysqlUrl, args.allowAnyDatabase)
		);
		await writeFile(
			join(workspace, 'introspect.mjs'),
			introspectSource(engine.name)
		);
		await writeFile(
			join(workspace, 'driver.mjs'),
			driverSource(fixture, engine)
		);

		const install = spawnSync('bun', ['install', '--no-save'], {
			cwd: workspace,
			encoding: 'utf8',
		});
		if (install.status !== 0) {
			throw new Error(`bun install failed:\n${install.stderr.trim()}`);
		}

		// Node, not Bun: better-sqlite3's NAPI module hard-crashes the Bun
		// runtime (`NAPI FATAL ERROR: Error::New`). Bun still does the install,
		// which is where the speed matters.
		const run = spawnSync('node', ['driver.mjs'], {
			cwd: workspace,
			encoding: 'utf8',
		});
		if (run.status !== 0) {
			throw new Error(`driver failed:\n${run.stderr.trim()}`);
		}

		const captured = JSON.parse(
			await readFile(join(workspace, 'result.json'), 'utf8')
		);
		const capturedFixture = {
			engine: engine.name,
			era: fixture.era,
			rationale: fixture.rationale,
			versions: fixture.versions,
			...captured,
		};
		capturedFixture['shape'] = fixture.name;

		const outDir = join(FIXTURES_DIR, fixture.name);
		mkdirSync(outDir, { recursive: true });
		await writeFile(
			join(outDir, `${engine.name}.json`),
			`${JSON.stringify(capturedFixture, null, '\t')}\n`
		);

		process.stderr.write(
			`${capturedFixture.tables.length} tables${capturedFixture.settings ? ', c15t_settings present' : ''}\n`
		);
	} finally {
		if (args.keepWorkspace) {
			process.stderr.write(`    workspace kept at ${workspace}\n`);
		} else {
			await rm(workspace, { force: true, recursive: true });
		}
	}
};

const args = parseArgs(process.argv.slice(2));
process.stderr.write(
	`Generating ${args.fixtures.length} fixture(s) × ${args.engines.length} engine(s)\n`
);

let failures = 0;
for (const fixture of args.fixtures) {
	for (const engine of args.engines) {
		try {
			// oxlint-disable-next-line no-await-in-loop -- Operations are intentionally serial to preserve order and limit concurrency.
			await generateOne(fixture, engine, args);
		} catch (error) {
			failures += 1;
			process.stderr.write(
				`FAILED\n${error instanceof Error ? error.message : String(error)}\n`
			);
		}
	}
}

if (failures > 0) {
	process.stderr.write(`\n${failures} combination(s) failed\n`);
	process.exit(1);
}
