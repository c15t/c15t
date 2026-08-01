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
import {
	connectionSource,
	ENGINES,
	type Engine,
	engineByName,
} from './engines';
import { introspectSource } from './introspect';
import { SHAPES, type Shape, shapeByName } from './shapes';

const FIXTURES_DIR = join(
	dirname(dirname(fileURLToPath(import.meta.url))),
	'fixtures'
);

interface Args {
	shapes: readonly Shape[];
	engines: readonly Engine[];
	mysqlUrl: string | undefined;
	keepWorkspace: boolean;
}

function parseArgs(argv: readonly string[]): Args {
	const flag = (name: string): string | undefined => {
		const index = argv.indexOf(`--${name}`);
		return index === -1 ? undefined : argv[index + 1];
	};

	const shapeName = flag('shape');
	const engineName = flag('engine');
	const mysqlUrl = flag('mysql-url');

	const engines = engineName
		? [engineByName(engineName)]
		: // MySQL needs Docker, so it is opt-in via --engine mysql rather than
			// something a bare `bun run generate` silently fails on.
			ENGINES.filter((engine) => !engine.needsDocker);

	return {
		shapes: shapeName ? [shapeByName(shapeName)] : SHAPES,
		engines,
		mysqlUrl,
		keepWorkspace: argv.includes('--keep-workspace'),
	};
}

/**
 * The kysely range a published release declares. 2.x declares none (it reaches
 * kysely through fumadb), so fall back to the last range that was declared
 * explicitly.
 */
const KYSELY_FALLBACK = '^0.28.15';

async function kyselyRangeFor(version: string): Promise<string> {
	const response = await fetch(
		`https://registry.npmjs.org/@c15t%2Fbackend/${version}`
	);
	if (!response.ok) return KYSELY_FALLBACK;
	const manifest = (await response.json()) as {
		dependencies?: Record<string, string>;
		peerDependencies?: Record<string, string>;
	};
	return (
		manifest.dependencies?.kysely ??
		manifest.peerDependencies?.kysely ??
		KYSELY_FALLBACK
	);
}

/** npm alias for a release, safe to use as a JS identifier prefix. */
function aliasFor(version: string): string {
	return `c15t_${version.replaceAll('.', '_')}`;
}

/** Subpaths each era exposes, relative to the aliased package. */
function eraSubpaths(era: Shape['era']): {
	migrator: string;
	schema?: string;
	adapter?: string;
} {
	switch (era) {
		case 'legacy':
			return { migrator: 'pkgs/migrations' };
		case 'fumadb-v2-subpath':
			return {
				migrator: 'v2/db/migrator',
				schema: 'v2/db/schema',
				adapter: 'v2/db/adapters/kysely',
			};
		case 'fumadb-root':
			return {
				migrator: 'db/migrator',
				schema: 'db/schema',
				adapter: 'db/adapters/kysely',
			};
	}
}

function driverSource(shape: Shape, engine: Engine): string {
	const imports: string[] = [];
	const steps: string[] = [];

	for (const version of shape.versions) {
		const alias = aliasFor(version);
		const paths = eraSubpaths(shape.era);

		if (shape.era === 'legacy') {
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
    applied.push({ version: '${version}', era: '${shape.era}' });
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
    const planSql = typeof plan?.getSQL === 'function' ? plan.getSQL() : '';
    if (typeof plan?.execute !== 'function') {
      throw new Error(
        'migrator() returned no execute(); adapter likely unsupported for migrations'
      );
    }
    await plan.execute();
    applied.push({ version: '${version}', era: '${shape.era}', sql: planSql });
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
}

async function generateOne(
	shape: Shape,
	engine: Engine,
	args: Args
): Promise<void> {
	const workspace = await mkdtemp(
		join(tmpdir(), `c15t-fixture-${shape.name}-`)
	);
	process.stderr.write(`  ${shape.name} / ${engine.name} … `);

	try {
		const dependencies: Record<string, string> = {};
		for (const version of shape.versions) {
			dependencies[aliasFor(version)] = `npm:@c15t/backend@${version}`;
		}
		for (const dep of engine.deps) {
			dependencies[dep] = 'latest';
		}
		// Use the kysely the release itself was built against rather than
		// `latest`. 0.29 dropped the `Migrator` export that kysely-pglite still
		// imports, and a release should be exercised with its own dependency
		// anyway. For a multi-version chain, the newest release wins — that is
		// what a real deployment that upgraded would have resolved to.
		dependencies.kysely = await kyselyRangeFor(
			shape.versions[shape.versions.length - 1] as string
		);

		await writeFile(
			join(workspace, 'package.json'),
			`${JSON.stringify(
				{
					name: 'fixture-workspace',
					private: true,
					type: 'module',
					dependencies,
				},
				null,
				2
			)}\n`
		);
		await writeFile(
			join(workspace, 'connection.mjs'),
			connectionSource(engine, args.mysqlUrl)
		);
		await writeFile(
			join(workspace, 'introspect.mjs'),
			introspectSource(engine.name)
		);
		await writeFile(join(workspace, 'driver.mjs'), driverSource(shape, engine));

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
		const fixture = {
			shape: shape.name,
			engine: engine.name,
			versions: shape.versions,
			era: shape.era,
			rationale: shape.rationale,
			...captured,
		};

		const outDir = join(FIXTURES_DIR, shape.name);
		mkdirSync(outDir, { recursive: true });
		await writeFile(
			join(outDir, `${engine.name}.json`),
			`${JSON.stringify(fixture, null, '\t')}\n`
		);

		process.stderr.write(
			`${fixture.tables.length} tables${fixture.settings ? ', c15t_settings present' : ''}\n`
		);
	} finally {
		if (args.keepWorkspace) {
			process.stderr.write(`    workspace kept at ${workspace}\n`);
		} else {
			await rm(workspace, { recursive: true, force: true });
		}
	}
}

const args = parseArgs(process.argv.slice(2));
process.stderr.write(
	`Generating ${args.shapes.length} shape(s) × ${args.engines.length} engine(s)\n`
);

let failures = 0;
for (const shape of args.shapes) {
	for (const engine of args.engines) {
		try {
			await generateOne(shape, engine, args);
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
