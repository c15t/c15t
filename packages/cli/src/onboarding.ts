import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from './context/types';

// Basic template for the c15t.config.ts file
function generateConfigFileContent(
	adapterChoice: string,
	connectionString: string | undefined,
	filePath: string | undefined
): string {
	let adapterImport = '';
	let adapterConfig = '';

	switch (adapterChoice) {
		case 'kysely-postgres': {
			adapterImport = `import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';\nimport { PostgresDialect } from 'kysely';\nimport { Pool } from 'pg';`;
			adapterConfig = `kyselyAdapter({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: "${connectionString || 'postgresql://user:password@host:port/db'}"
        })
      })
    })`;
			break;
		}
		case 'kysely-sqlite': {
			adapterImport = `import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';\nimport { SqliteDialect } from 'kysely';\nimport Database from 'better-sqlite3';`;
			adapterConfig = `kyselyAdapter({
      dialect: new SqliteDialect({
        database: new Database("${filePath || './db.sqlite'}")
      })
    })`;
			break;
		}
		// Add cases for other adapters (Prisma, Drizzle, MySQL) as needed
		default: {
			// Default to memory adapter
			adapterImport = `import { memoryAdapter } from '@c15t/backend/db/adapters/memory';`;
			adapterConfig = 'memoryAdapter({})';
			break;
		}
	}

	return `// c15t Configuration File
// Generated by c15t CLI onboarding

import { c15tInstance } from '@c15t/backend';
${adapterImport}

// Define your c15t instance
const instance = c15tInstance({
  // Base URL of your application (used for email links, etc.)
  // Example: http://localhost:3000 or https://yourdomain.com
  baseURL: process.env.BASE_URL || 'http://localhost:3000',

  // Database configuration
  database: ${adapterConfig},

  // Add any plugins you need
  plugins: [
    // Example: authPlugin({ secret: 'YOUR_JWT_SECRET' })
  ],

  // Optional: Add custom context accessible in handlers/plugins
  context: {},

  // Optional: Configure trusted origins for CORS
  // trustedOrigins: ['http://localhost:3000'],

  // Optional: Authentication configuration
  // auth: {
  //   secret: process.env.AUTH_SECRET || 'your-very-secret-key', // Use environment variables for secrets
  //   // ... other auth options
  // },
});

export default instance;
`;
}

export async function startOnboarding(context: CliContext) {
	const { logger, cwd } = context;

	logger.info('Starting onboarding process...');

	// Clearer welcome for first-time setup
	p.note(
		`Welcome to c15t! It looks like you don't have a configuration file yet.
Let's get you set up with a basic ${color.cyan('c15t.ts')} file.`,
		'First time setup'
	);
	p.log.message(''); // Spacing for UI clarity

	const results = await p.group(
		{
			adapter: () =>
				p.select({
					message: 'First, choose a database adapter:',
					initialValue: 'kysely-sqlite',
					options: [
						{
							value: 'kysely-sqlite',
							label: 'Kysely (SQLite)',
							hint: 'Recommended for simple setups/local dev',
						},
						{
							value: 'kysely-postgres',
							label: 'Kysely (PostgreSQL)',
							hint: 'Requires PostgreSQL database',
						},
						// { value: 'prisma', label: 'Prisma', hint: 'Requires Prisma setup' },
						// { value: 'drizzle', label: 'Drizzle', hint: 'Requires Drizzle setup' },
						{
							value: 'memory',
							label: 'Memory',
							hint: 'For testing/demos, data is not persisted',
						},
					],
				}),
			connectionString: ({ results }) => {
				if (results.adapter === 'kysely-postgres') {
					return p.text({
						message: 'Enter your PostgreSQL connection string:',
						placeholder: 'postgresql://user:password@host:port/database',
						validate: (value) => {
							if (!value) {
								return 'Connection string is required.';
							}
							if (!value.startsWith('postgresql://')) {
								return 'Must be a valid PostgreSQL connection string.';
							}
						},
					});
				}
			},
			filePath: ({ results }) => {
				if (results.adapter === 'kysely-sqlite') {
					return p.text({
						message: 'Enter the path for your SQLite database file:',
						placeholder: './db.sqlite',
						initialValue: './db.sqlite',
					});
				}
			},
			confirm: () =>
				p.confirm({
					message: 'Create c15t.ts config file in the current directory?',
					initialValue: true,
				}),
		},
		{
			onCancel: () => context.error.handleCancel('Configuration cancelled.'),
		}
	);

	if (!results.confirm) {
		logger.debug('User declined to create config file');
		context.error.handleCancel('Configuration cancelled.');
		return;
	}

	const adapterChoice = results.adapter as string;
	logger.debug(`Selected adapter: ${adapterChoice}`);

	const configContent = generateConfigFileContent(
		adapterChoice,
		results.connectionString as string | undefined,
		results.filePath as string | undefined
	);
	const configFilePath = path.join(cwd, 'c15t.ts');

	logger.debug(`Creating config file at: ${configFilePath}`);

	const s = p.spinner();
	s.start(`Creating ${configFilePath}...`);

	try {
		await fs.writeFile(configFilePath, configContent);
		s.stop(`✅ Configuration file created: ${color.cyan(configFilePath)}`);
		logger.info('Please re-run your previous command to continue');
		logger.success('Onboarding complete');
	} catch (error) {
		s.stop('Failed to create configuration file.');
		logger.error('Failed to write configuration file', error);

		if (error instanceof Error) {
			logger.error(error.message);
		}

		logger.failed('Onboarding failed');
	}
}
