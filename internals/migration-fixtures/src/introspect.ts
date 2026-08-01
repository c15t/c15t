/**
 * Captured shape of a database after a published c15t release migrated it.
 *
 * The JSON is the contract that migration tests assert against: it is
 * engine-normalised and deterministically ordered, so a diff means the shape
 * really changed rather than that a driver reordered its output. Raw DDL is
 * captured alongside it where the engine offers it cheaply, purely so a human
 * reviewing a fixture change can read what actually happened.
 */

export interface CapturedColumn {
	readonly name: string;
	readonly dataType: string;
	readonly isNullable: boolean;
	readonly isAutoIncrementing: boolean;
	readonly hasDefaultValue: boolean;
}

export interface CapturedTable {
	readonly name: string;
	readonly columns: readonly CapturedColumn[];
}

export interface CapturedShape {
	readonly shape: string;
	readonly engine: string;
	readonly versions: readonly string[];
	readonly era: string;
	/** Contents of `c15t_settings` if the release wrote one, else null. */
	readonly settings: Record<string, unknown> | null;
	readonly tables: readonly CapturedTable[];
	/** Engine-native DDL, keyed by object name. Empty where unavailable. */
	readonly ddl: Record<string, string>;
}

/**
 * Source for the capture step, evaluated inside the throwaway workspace.
 *
 * Emitted as source for the same reason as the connection: the workspace has
 * its own kysely, and the introspection API must come from the same copy that
 * built the connection.
 */
export function introspectSource(engine: string): string {
	return `
const RAW_DDL_QUERY = ${JSON.stringify(rawDdlQuery(engine))};

export async function capture(db) {
  const tables = (await db.introspection.getTables())
    .filter((table) => !table.isView)
    .map((table) => ({
      name: table.name,
      columns: [...table.columns]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((column) => ({
          name: column.name,
          dataType: column.dataType,
          isNullable: column.isNullable,
          isAutoIncrementing: column.isAutoIncrementing,
          hasDefaultValue: column.hasDefaultValue,
        })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // fumadb's version marker. Observed as 'private_c15t_settings' on 2.1.0, but
  // matched by suffix so a prefix change in any release still resolves.
  // Legacy releases never create it, so its absence is part of the fixture.
  let settings = null;
  const settingsTable = tables.find((table) =>
    /(^|_)c15t_settings$/.test(table.name)
  );
  if (settingsTable) {
    const { sql } = await import('kysely');
    const result = await sql
      .raw(\`select * from "\${settingsTable.name}"\`)
      .execute(db);
    // fumadb stores JSON documents (notably 'name-variants', the physical
    // per-dialect names) as escaped strings. Parse them so a fixture diff is
    // reviewable instead of one enormous quoted line.
    settings = {
      table: settingsTable.name,
      rows: result.rows.map((row) => {
        if (typeof row.value !== 'string') return row;
        try {
          return { ...row, value: JSON.parse(row.value) };
        } catch {
          return row;
        }
      }),
    };
  }

  const ddl = {};
  if (RAW_DDL_QUERY) {
    const { sql } = await import('kysely');
    if (${JSON.stringify(engine)} === 'mysql') {
      for (const table of tables) {
        const result = await sql.raw(\`show create table \\\`\${table.name}\\\`\`).execute(db);
        const row = result.rows[0] ?? {};
        ddl[table.name] = row['Create Table'] ?? row['Create View'] ?? '';
      }
    } else {
      const result = await sql.raw(RAW_DDL_QUERY).execute(db);
      for (const row of result.rows) {
        if (row.sql) ddl[row.name] = row.sql;
      }
    }
  }

  return { settings, tables, ddl };
}
`;
}

function rawDdlQuery(engine: string): string | null {
	switch (engine) {
		case 'sqlite':
			return 'select name, sql from sqlite_master where sql is not null order by name';
		case 'mysql':
			// Handled per-table by the emitted source; a non-null value just
			// switches raw DDL capture on.
			return 'show tables';
		default:
			// Postgres has no cheap single-statement DDL dump without pg_dump.
			// The normalised JSON carries the contract for that engine.
			return null;
	}
}
