import type {
	drizzleAdapter,
	kyselyAdapter,
	mongoAdapter,
	prismaAdapter,
	typeormAdapter,
} from './pkgs/db-adapters';

export type AdapterName = 'kysely' | 'drizzle' | 'prisma' | 'typeorm' | 'mongo';

export type KyselyAdapterProperties = Parameters<typeof kyselyAdapter>[0];
export type DrizzleAdapterProperties = Parameters<typeof drizzleAdapter>[0];
export type PrismaAdapterProperties = Parameters<typeof prismaAdapter>[0];
export type TypeORMAdapterProperties = Parameters<typeof typeormAdapter>[0];
export type MongoAdapterProperties = Parameters<typeof mongoAdapter>[0];

export type AdapterConfigurationMap = {
	readonly [K in AdapterName]: K extends 'kysely'
		? KyselyAdapterProperties
		: K extends 'drizzle'
			? DrizzleAdapterProperties
			: K extends 'prisma'
				? PrismaAdapterProperties
				: K extends 'typeorm'
					? TypeORMAdapterProperties
					: K extends 'mongo'
						? MongoAdapterProperties
						: never;
};

export type AdapterConfiguration<AdapterType extends AdapterName> = {
	readonly adapter: AdapterType;
	readonly options: AdapterConfigurationMap[AdapterType];
};

type AdapterReturnMap = {
	readonly kysely: ReturnType<typeof kyselyAdapter>;
	readonly drizzle: ReturnType<typeof drizzleAdapter>;
	readonly prisma: ReturnType<typeof prismaAdapter>;
	readonly typeorm: ReturnType<typeof typeormAdapter>;
	readonly mongo: ReturnType<typeof mongoAdapter>;
};

export const defineConfig = <AdapterType extends AdapterName>(
	config: AdapterConfiguration<AdapterType>
) => {
	if (config === null || config === undefined) {
		throw new TypeError('Configuration cannot be null or undefined');
	}

	if (!config.adapter) {
		throw new Error('Adapter name must be specified in configuration');
	}

	if (!config.options) {
		throw new Error('Database configuration properties must be provided');
	}

	return config;
};
