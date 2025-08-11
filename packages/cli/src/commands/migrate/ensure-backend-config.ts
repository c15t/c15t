import fs from 'node:fs/promises';
import path from 'node:path';
import type * as adapters from '@c15t/backend/v2/pkgs/db-adapters';
import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';

type AdapterKey = keyof typeof adapters;

type KysleyProviders = Parameters<typeof adapters.kyselyAdapter>[0]['provider'];
type DrizzleProviders = Parameters<
	typeof adapters.drizzleAdapter
>[0]['provider'];
type PrismaProviders = Parameters<typeof adapters.prismaAdapter>[0]['provider'];
type TypeormProviders = Parameters<
	typeof adapters.typeormAdapter
>[0]['provider'];

const ADAPTER_LABELS: Record<AdapterKey, string> = {
	kyselyAdapter: 'kysely',
	drizzleAdapter: 'drizzle',
	prismaAdapter: 'prisma',
	typeormAdapter: 'typeorm',
	mongoAdapter: 'mongo',
};

type ProviderOption<ProviderUnion extends string> = {
	label: string;
	value: ProviderUnion;
};

const PROVIDERS_BY_ADAPTER: {
	kyselyAdapter: ProviderOption<KysleyProviders>[];
	drizzleAdapter: ProviderOption<DrizzleProviders>[];
	prismaAdapter: ProviderOption<PrismaProviders>[];
	typeormAdapter: ProviderOption<TypeormProviders>[];
	mongoAdapter: ProviderOption<'mongodb'>[];
} = {
	kyselyAdapter: [
		{ label: 'PostgreSQL', value: 'postgresql' },
		{ label: 'MySQL', value: 'mysql' },
		{ label: 'SQLite', value: 'sqlite' },
		{ label: 'CockroachDB', value: 'cockroachdb' },
		{ label: 'Microsoft SQL Server', value: 'mssql' },
	],
	drizzleAdapter: [
		{ label: 'PostgreSQL', value: 'postgresql' },
		{ label: 'MySQL', value: 'mysql' },
		{ label: 'SQLite', value: 'sqlite' },
	],
	prismaAdapter: [
		{ label: 'PostgreSQL', value: 'postgresql' },
		{ label: 'MySQL', value: 'mysql' },
		{ label: 'SQLite', value: 'sqlite' },
		{ label: 'MongoDB', value: 'mongodb' },
	],
	typeormAdapter: [
		{ label: 'PostgreSQL', value: 'postgresql' },
		{ label: 'MySQL', value: 'mysql' },
		{ label: 'SQLite', value: 'sqlite' },
		{ label: 'SQL Server', value: 'mssql' },
	],
	mongoAdapter: [{ label: 'MongoDB', value: 'mongodb' }],
};

type ConnectionInput = {
	useEnv: boolean;
	envVar?: string;
	value?: string;
	sqliteFile?: string;
};

type ProviderFor<Adapter extends AdapterKey> = Adapter extends 'kyselyAdapter'
	? KysleyProviders
	: Adapter extends 'drizzleAdapter'
		? DrizzleProviders
		: Adapter extends 'prismaAdapter'
			? PrismaProviders
			: Adapter extends 'typeormAdapter'
				? TypeormProviders
				: Adapter extends 'mongoAdapter'
					? 'mongodb'
					: never;

class Cancelled extends Error {
	stage: string;
	constructor(stage: string) {
		super('Operation cancelled.');
		this.stage = stage;
	}
}

const CONFIG_BUILDERS: {
	[K in AdapterKey]: (
		provider: ProviderFor<K>,
		connection: ConnectionInput
	) => string;
} = {
	kyselyAdapter: (provider) => {
		return `kyselyAdapter({ provider: '${provider}', db })`;
	},
	drizzleAdapter: (provider) => {
		return `drizzleAdapter({ provider: '${provider}', db })`;
	},
	prismaAdapter: (provider) => {
		return `prismaAdapter({ provider: '${provider}', prisma })`;
	},
	typeormAdapter: (provider) => {
		return `typeormAdapter({ provider: '${provider}', source })`;
	},
	mongoAdapter: () => {
		return 'mongoAdapter({ client })';
	},
};

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

function buildDatabaseConfig<A extends AdapterKey>(
	adapter: A,
	provider: ProviderFor<A>,
	connection: ConnectionInput
): string {
	const builder = CONFIG_BUILDERS[adapter] as (
		provider: ProviderFor<A>,
		connection: ConnectionInput
	) => string;
	return builder(provider, connection);
}

function buildKyselyPrelude(
	provider: ProviderFor<'kyselyAdapter'>,
	connection: ConnectionInput
): { imports: string; prelude: string } {
	const connExpr = connection.useEnv
		? `process.env.${connection.envVar || 'DATABASE_URL'}!`
		: `"${connection.value || ''}"`;
	if (provider === 'postgresql' || provider === 'cockroachdb') {
		return {
			imports:
				"import { Kysely, PostgresDialect } from 'kysely';\nimport { Pool } from 'pg';",
			prelude: `const db = new Kysely({\n\tdialect: new PostgresDialect({\n\t\tpool: new Pool({ connectionString: ${connExpr} }),\n\t}),\n});`,
		};
	}
	if (provider === 'mysql') {
		return {
			imports:
				"import { Kysely, MysqlDialect } from 'kysely';\nimport mysql from 'mysql2/promise';",
			prelude: `const db = new Kysely({\n\tdialect: new MysqlDialect({\n\t\tpool: mysql.createPool(${connExpr}),\n\t}),\n});`,
		};
	}
	if (provider === 'mssql') {
		return {
			imports:
				"import { Kysely, MssqlDialect } from 'kysely';\nimport mssql from 'mssql';",
			prelude: `const db = new Kysely({\n\tdialect: new MssqlDialect({\n\t\tpool: new mssql.ConnectionPool(${connExpr}),\n\t}),\n});`,
		};
	}
	return { imports: '', prelude: '' };
}

function buildSqliteKyselyPrelude(file: string): {
	imports: string;
	prelude: string;
} {
	return {
		imports:
			"import { Kysely, SqliteDialect } from 'kysely';\nimport Database from 'better-sqlite3';",
		prelude: `const db = new Kysely({\n\tdialect: new SqliteDialect({\n\t\tdatabase: new Database("${file}"),\n\t}),\n});`,
	};
}

function buildDrizzlePrelude(
	provider: ProviderFor<'drizzleAdapter'>,
	connection: ConnectionInput
): { imports: string; prelude: string } {
	const connExpr = connection.useEnv
		? `process.env.${connection.envVar || 'DATABASE_URL'}!`
		: `"${connection.value || ''}"`;
	if (provider === 'postgresql') {
		return {
			imports:
				"import { drizzle } from 'drizzle-orm/node-postgres';\nimport { Pool } from 'pg';",
			prelude: `const db = drizzle(new Pool({ connectionString: ${connExpr} }));`,
		};
	}
	if (provider === 'mysql') {
		return {
			imports:
				"import { drizzle } from 'drizzle-orm/mysql2';\nimport mysql from 'mysql2/promise';",
			prelude: `const db = drizzle(await mysql.createConnection(${connExpr}));`,
		};
	}
	if (provider === 'sqlite') {
		const file = connection.sqliteFile || './db.sqlite';
		return {
			imports:
				"import { drizzle } from 'drizzle-orm/better-sqlite3';\nimport Database from 'better-sqlite3';",
			prelude: `const db = drizzle(new Database("${file}"));`,
		};
	}
	return { imports: '', prelude: '' };
}

function buildPrismaPrelude(
	_provider: ProviderFor<'prismaAdapter'>,
	_connection: ConnectionInput
): { imports: string; prelude: string } {
	return {
		imports: "import { PrismaClient } from '@prisma/client';",
		prelude: 'const prisma = new PrismaClient();',
	};
}

function buildTypeormPrelude(
	provider: ProviderFor<'typeormAdapter'>,
	connection: ConnectionInput
): { imports: string; prelude: string } {
	const connExpr = connection.useEnv
		? `process.env.${connection.envVar || 'DATABASE_URL'}!`
		: `"${connection.value || ''}"`;
	if (provider === 'sqlite') {
		const file = connection.sqliteFile || './db.sqlite';
		return {
			imports: "import { DataSource } from 'typeorm';",
			prelude: `const source = new DataSource({ type: 'sqlite', database: "${file}" });`,
		};
	}
	const typeMap: Record<string, string> = {
		postgresql: 'postgres',
		mysql: 'mysql',
		mssql: 'mssql',
	};
	return {
		imports: "import { DataSource } from 'typeorm';",
		prelude: `const source = new DataSource({ type: '${typeMap[String(provider)]}', url: ${connExpr} });`,
	};
}

function buildMongoPrelude(connection: ConnectionInput): {
	imports: string;
	prelude: string;
} {
	const urlExpr = connection.useEnv
		? `process.env.${connection.envVar || 'MONGODB_URI'}!`
		: `"${connection.value || ''}"`;
	return {
		imports: "import { MongoClient } from 'mongodb';",
		prelude: `const client = new MongoClient(${urlExpr});`,
	};
}

function buildFileContent(
	adapter: AdapterKey,
	provider: string,
	dbConfig: string,
	connection: ConnectionInput
): string {
	const importAdapter = `import { ${adapter} } from '@c15t/backend/v2/pkgs/db-adapters';`;
	let extras = { imports: '', prelude: '' };
	if (adapter === 'kyselyAdapter') {
		if (provider === 'sqlite') {
			const file = connection.sqliteFile || './db.sqlite';
			extras = buildSqliteKyselyPrelude(file);
		} else {
			extras = buildKyselyPrelude(
				provider as ProviderFor<'kyselyAdapter'>,
				connection
			);
		}
	} else if (adapter === 'drizzleAdapter') {
		extras = buildDrizzlePrelude(
			provider as ProviderFor<'drizzleAdapter'>,
			connection
		);
	} else if (adapter === 'prismaAdapter') {
		extras = buildPrismaPrelude(
			provider as ProviderFor<'prismaAdapter'>,
			connection
		);
	} else if (adapter === 'typeormAdapter') {
		extras = buildTypeormPrelude(
			provider as ProviderFor<'typeormAdapter'>,
			connection
		);
	} else if (adapter === 'mongoAdapter') {
		extras = buildMongoPrelude(connection);
	}
	return `import { defineConfig } from '@c15t/backend/v2';
${importAdapter}
${extras.imports ? `${extras.imports}\n` : ''}
${extras.prelude ? `${extras.prelude}\n` : ''}
export default defineConfig({
	adapter: ${dbConfig},
});
`;
}

async function promptSelectAdapter(): Promise<AdapterKey> {
	const selection = (await p.select({
		message: 'Select database adapter:',
		options: (Object.keys(ADAPTER_LABELS) as AdapterKey[]).map((key) => ({
			value: key,
			label: ADAPTER_LABELS[key],
		})),
	})) as AdapterKey | symbol;
	if (p.isCancel(selection)) {
		throw new Cancelled('adapter_select');
	}
	return selection as AdapterKey;
}

async function promptSelectProvider<A extends AdapterKey>(
	adapter: A
): Promise<ProviderFor<A>> {
	const providers = PROVIDERS_BY_ADAPTER[adapter];
	if (providers.length === 0) {
		throw new Error('No providers available for selected adapter');
	}
	if (providers.length === 1) {
		const [first] = providers;
		return (first as (typeof providers)[number]).value as ProviderFor<A>;
	}
	const selection = await p.select({
		message: 'Select database provider:',
		options: providers.map((opt) => ({ value: opt.value, label: opt.label })),
	});
	if (p.isCancel(selection)) {
		throw new Cancelled('provider_select');
	}
	return selection as ProviderFor<A>;
}

async function promptConnection<A extends AdapterKey>(
	adapter: A,
	provider: ProviderFor<A>
): Promise<ConnectionInput> {
	const connection: ConnectionInput = { useEnv: true };
	if (provider === 'sqlite') {
		const sqliteFile = await p.text({
			message: 'SQLite file path:',
			initialValue: './db.sqlite',
		});
		if (p.isCancel(sqliteFile)) {
			throw new Cancelled('sqlite_path');
		}
		connection.sqliteFile = String(sqliteFile);
		return connection;
	}

	const useEnv = await p.confirm({
		message: 'Store connection string in an environment variable?',
		initialValue: true,
	});
	if (p.isCancel(useEnv)) {
		throw new Cancelled('use_env_confirm');
	}
	connection.useEnv = Boolean(useEnv);

	if (connection.useEnv) {
		const defaultVar =
			adapter === 'mongoAdapter' ? 'MONGODB_URI' : 'DATABASE_URL';
		const envVarName = await p.text({
			message: 'Env var name for connection string:',
			initialValue: defaultVar,
		});
		if (p.isCancel(envVarName)) {
			throw new Cancelled('env_var_name');
		}
		connection.envVar = String(envVarName);
		return connection;
	}

	const placeholder =
		adapter === 'mongoAdapter'
			? 'mongodb+srv://user:pass@host/db'
			: 'postgresql://user:pass@host:5432/db';
	const connectionString = await p.text({
		message: 'Connection string:',
		placeholder,
	});
	if (p.isCancel(connectionString)) {
		throw new Cancelled('connection_string');
	}
	connection.value = String(connectionString);
	return connection;
}

export async function ensureBackendConfig(
	context: CliContext
): Promise<string | null> {
	const { cwd, logger } = context;
	const targetPath = path.join(cwd, 'c15t-backend.config.ts');

	if (await pathExists(targetPath)) {
		logger.debug(`Backend config already exists at ${targetPath}`);
		return targetPath;
	}

	try {
		const adapter = await promptSelectAdapter();
		const provider = await promptSelectProvider(adapter);
		const connection = await promptConnection(adapter, provider);

		const dbConfig = buildDatabaseConfig(adapter, provider, connection);
		const fileContent = buildFileContent(
			adapter,
			String(provider),
			dbConfig,
			connection
		);

		await fs.writeFile(targetPath, fileContent, 'utf8');
		context.logger.success(`Created ${path.relative(cwd, targetPath)}`);

		if (provider !== 'sqlite' && connection.useEnv && connection.envVar) {
			context.logger.note(
				`Remember to set ${connection.envVar} in your environment or .env file.`,
				'Environment'
			);
		}

		return targetPath;
	} catch (err) {
		if (err instanceof Cancelled) {
			return context.error.handleCancel('Operation cancelled.', {
				command: 'ensure-backend-config',
				stage: err.stage,
			});
		}
		throw err;
	}
}
