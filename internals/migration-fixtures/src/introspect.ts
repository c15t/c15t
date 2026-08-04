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

/**
 * An index or unique constraint.
 *
 * Names are captured but should not be compared across engines — each engine
 * generates its own for implicit primary key and unique indexes. Compare on
 * `(table, columns, isUnique)` instead; that is the part that describes
 * behaviour.
 */
export interface CapturedIndex {
	readonly table: string;
	readonly name: string;
	/** In index order, not alphabetical — column order is significant. */
	readonly columns: readonly string[];
	readonly isUnique: boolean;
	readonly isPrimary: boolean;
}

export interface CapturedForeignKey {
	readonly table: string;
	readonly columns: readonly string[];
	readonly referencedTable: string;
	readonly referencedColumns: readonly string[];
}

export interface CapturedShape {
	readonly shape: string;
	readonly engine: string;
	readonly versions: readonly string[];
	readonly era: string;
	/** Contents of `c15t_settings` if the release wrote one, else null. */
	readonly settings: Record<string, unknown> | null;
	readonly tables: readonly CapturedTable[];
	/**
	 * Indexes and unique constraints. Without these, "the shapes are identical"
	 * only ever meant "the columns are identical" — the migrator has to
	 * converge constraints too, so they are part of the contract.
	 */
	readonly indexes: readonly CapturedIndex[];
	readonly foreignKeys: readonly CapturedForeignKey[];
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

  const { indexes, foreignKeys } = await constraints(db, tables);

  return { settings, tables, indexes, foreignKeys, ddl };
}

${constraintsSource(engine)}
`;
}

/**
 * Index and foreign-key capture, per engine.
 *
 * There is no portable way to do this — `information_schema` does not describe
 * indexes on SQLite at all, and its foreign-key views disagree between
 * Postgres and MySQL on how composite keys are ordered. Each engine gets the
 * query that is actually correct for it, normalised into the same shape.
 */
function constraintsSource(engine: string): string {
	switch (engine) {
		case 'sqlite':
			return SQLITE_CONSTRAINTS;
		case 'postgres':
			return POSTGRES_CONSTRAINTS;
		case 'mysql':
			return MYSQL_CONSTRAINTS;
		default:
			return 'async function constraints() { return { indexes: [], foreignKeys: [] }; }';
	}
}

const SORT = `
function sortIndexes(rows) {
  return rows.sort((a, b) =>
    a.table.localeCompare(b.table) ||
    a.columns.join(',').localeCompare(b.columns.join(',')) ||
    a.name.localeCompare(b.name)
  );
}
function sortForeignKeys(rows) {
  return rows.sort((a, b) =>
    a.table.localeCompare(b.table) ||
    a.columns.join(',').localeCompare(b.columns.join(','))
  );
}
`;

const SQLITE_CONSTRAINTS = `${SORT}
async function constraints(db, tables) {
  const { sql } = await import('kysely');
  const indexes = [];
  const foreignKeys = [];

  for (const table of tables) {
    // SQLite reports the implicit rowid primary key through index_list only
    // when it is a real index, so PK detection also consults table_info.
    const pk = await sql.raw(\`select name from pragma_table_info('\${table.name}') where pk > 0 order by pk\`).execute(db);
    if (pk.rows.length > 0) {
      indexes.push({
        table: table.name,
        name: 'sqlite_primary_key',
        columns: pk.rows.map((row) => row.name),
        isUnique: true,
        isPrimary: true,
      });
    }

    const list = await sql.raw(\`select name, "unique", origin from pragma_index_list('\${table.name}')\`).execute(db);
    for (const index of list.rows) {
      // origin 'pk' duplicates what table_info already reported.
      if (index.origin === 'pk') continue;
      const info = await sql.raw(\`select name from pragma_index_info('\${index.name}') order by seqno\`).execute(db);
      indexes.push({
        table: table.name,
        name: index.name,
        columns: info.rows.map((row) => row.name),
        isUnique: index.unique === 1 || index.unique === true,
        isPrimary: false,
      });
    }

    const fks = await sql.raw(\`select "table", "from", "to", id, seq from pragma_foreign_key_list('\${table.name}') order by id, seq\`).execute(db);
    const grouped = new Map();
    for (const row of fks.rows) {
      const existing = grouped.get(row.id) ?? {
        table: table.name,
        columns: [],
        referencedTable: row.table,
        referencedColumns: [],
      };
      existing.columns.push(row.from);
      existing.referencedColumns.push(row.to);
      grouped.set(row.id, existing);
    }
    foreignKeys.push(...grouped.values());
  }

  return { indexes: sortIndexes(indexes), foreignKeys: sortForeignKeys(foreignKeys) };
}
`;

const POSTGRES_CONSTRAINTS = `${SORT}
async function constraints(db) {
  const { sql } = await import('kysely');

  const idx = await sql\`
    select
      t.relname as table_name,
      i.relname as index_name,
      ix.indisunique as is_unique,
      ix.indisprimary as is_primary,
      a.attname as column_name,
      k.ord as ordinal
    from pg_class t
    join pg_namespace n on n.oid = t.relnamespace
    join pg_index ix on t.oid = ix.indrelid
    join pg_class i on i.oid = ix.indexrelid
    join unnest(ix.indkey) with ordinality as k(attnum, ord) on true
    join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
    where n.nspname = 'public' and t.relkind = 'r'
    order by t.relname, i.relname, k.ord
  \`.execute(db);

  const byIndex = new Map();
  for (const row of idx.rows) {
    const key = row.table_name + '.' + row.index_name;
    const existing = byIndex.get(key) ?? {
      table: row.table_name,
      name: row.index_name,
      columns: [],
      isUnique: row.is_unique === true,
      isPrimary: row.is_primary === true,
    };
    existing.columns.push(row.column_name);
    byIndex.set(key, existing);
  }

  const fk = await sql\`
    select
      con.conname as name,
      cl.relname as table_name,
      att.attname as column_name,
      fcl.relname as referenced_table,
      fatt.attname as referenced_column,
      k.ord as ordinal
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_class fcl on fcl.oid = con.confrelid
    join unnest(con.conkey) with ordinality as k(attnum, ord) on true
    join unnest(con.confkey) with ordinality as f(attnum, ord) on f.ord = k.ord
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
    join pg_attribute fatt on fatt.attrelid = con.confrelid and fatt.attnum = f.attnum
    where con.contype = 'f'
    order by cl.relname, con.conname, k.ord
  \`.execute(db);

  const byFk = new Map();
  for (const row of fk.rows) {
    const key = row.table_name + '.' + row.name;
    const existing = byFk.get(key) ?? {
      table: row.table_name,
      columns: [],
      referencedTable: row.referenced_table,
      referencedColumns: [],
    };
    existing.columns.push(row.column_name);
    existing.referencedColumns.push(row.referenced_column);
    byFk.set(key, existing);
  }

  return {
    indexes: sortIndexes([...byIndex.values()]),
    foreignKeys: sortForeignKeys([...byFk.values()]),
  };
}
`;

const MYSQL_CONSTRAINTS = `${SORT}
async function constraints(db) {
  const { sql } = await import('kysely');

  const idx = await sql\`
    select table_name, index_name, non_unique, column_name, seq_in_index
    from information_schema.statistics
    where table_schema = database()
    order by table_name, index_name, seq_in_index
  \`.execute(db);

  const byIndex = new Map();
  for (const row of idx.rows) {
    const table = row.table_name ?? row.TABLE_NAME;
    const name = row.index_name ?? row.INDEX_NAME;
    const column = row.column_name ?? row.COLUMN_NAME;
    const nonUnique = row.non_unique ?? row.NON_UNIQUE;
    const key = table + '.' + name;
    const existing = byIndex.get(key) ?? {
      table,
      name,
      columns: [],
      isUnique: Number(nonUnique) === 0,
      isPrimary: name === 'PRIMARY',
    };
    existing.columns.push(column);
    byIndex.set(key, existing);
  }

  const fk = await sql\`
    select table_name, constraint_name, column_name,
           referenced_table_name, referenced_column_name, ordinal_position
    from information_schema.key_column_usage
    where table_schema = database() and referenced_table_name is not null
    order by table_name, constraint_name, ordinal_position
  \`.execute(db);

  const byFk = new Map();
  for (const row of fk.rows) {
    const table = row.table_name ?? row.TABLE_NAME;
    const name = row.constraint_name ?? row.CONSTRAINT_NAME;
    const key = table + '.' + name;
    const existing = byFk.get(key) ?? {
      table,
      columns: [],
      referencedTable: row.referenced_table_name ?? row.REFERENCED_TABLE_NAME,
      referencedColumns: [],
    };
    existing.columns.push(row.column_name ?? row.COLUMN_NAME);
    existing.referencedColumns.push(row.referenced_column_name ?? row.REFERENCED_COLUMN_NAME);
    byFk.set(key, existing);
  }

  return {
    indexes: sortIndexes([...byIndex.values()]),
    foreignKeys: sortForeignKeys([...byFk.values()]),
  };
}
`;

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
