import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAdapter } from '@c15t/backend/pkgs/db-adapters';
import { getMigrations } from '@c15t/backend/pkgs/migrations';
import * as p from '@clack/prompts';
import color from 'picocolors';
import { z } from 'zod';
import { getConfig } from '../utils/get-config';

function parseArgs(args: string[]): Record<string, string | boolean> {
	const options: Record<string, string | boolean> = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg) continue;

		if (arg.startsWith('--')) {
			const key = arg.substring(2);
			const nextArg = args[i + 1];
			if (nextArg && !nextArg.startsWith('-')) {
				options[key] = nextArg;
				i++;
			} else {
				options[key] = true;
			}
		} else if (arg.startsWith('-')) {
			const key = arg.substring(1);
			const nextArg = args[i + 1];
			if (nextArg && !nextArg.startsWith('-')) {
				options[key] = nextArg;
				i++;
			} else {
				options[key] = true;
			}
		}
	}
	return options;
}

function handleCancel() {
	p.cancel('Operation cancelled.');
	process.exit(0);
}

export async function migrate(args: string[]) {
	const parsedArgs = parseArgs(args);

	const optionsSchema = z.object({
		cwd: z.string().default(process.cwd()),
		config: z.string().optional(),
		y: z.boolean().default(false),
	});

	let options: z.infer<typeof optionsSchema>;
	try {
		options = optionsSchema.parse(parsedArgs);
	} catch (error) {
		p.log.error('Invalid options provided.');
		if (error instanceof z.ZodError) {
			error.errors.forEach((err) => {
				p.log.warning(`  ${err.path.join('.')}: ${err.message}`);
			});
		}
		p.outro(`${color.red('Migration failed.')}`);
		return;
	}

	const cwd = path.resolve(options.cwd);
	if (!existsSync(cwd)) {
		p.log.error(`The directory "${cwd}" does not exist.`);
		p.outro(`${color.red('Migration failed.')}`);
		return;
	}

	const config = await getConfig({
		cwd,
		configPath: options.config,
	});
	if (!config) {
		p.log.error(
			'No configuration file found. Add a `c15t.ts` file to your project or pass the path to the configuration file using the `--config` flag.'
		);
		p.outro(`${color.red('Migration failed.')}`);
		return;
	}

	let db;
	try {
		db = await getAdapter(config);
	} catch (e) {
		p.log.error('Failed to initialize database adapter:');
		if (e instanceof Error) {
			p.log.message(e.message);
		} else {
			p.log.message(String(e));
		}
		p.outro(`${color.red('Migration failed.')}`);
		return;
	}

	if (!db || db.id !== 'kysely') {
		if (db?.id === 'prisma') {
			p.log.error(
				'The migrate command only works with the built-in Kysely adapter. For Prisma, run `npx @c15t/cli generate` to create the schema, then use Prisma\'s migrate or push to apply it.'
			);
		} else if (db?.id === 'drizzle') {
			p.log.error(
				'The migrate command only works with the built-in Kysely adapter. For Drizzle, run `npx @c15t/cli generate` to create the schema, then use Drizzle\'s migrate or push to apply it.'
			);
		} else {
			p.log.error(
				"Invalid or unsupported database configuration for migrate. Migrate command only works with built-in Kysely adapter."
			);
		}
		p.outro('Migration aborted.');
		return;
	}

	const s = p.spinner();
	s.start('Preparing migration...');

	let migrationData;
	try {
		migrationData = await getMigrations(config);
	} catch (error) {
		s.stop('Migration preparation failed.');
		p.log.error('Failed to prepare migrations:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Migration failed.')}`);
		return;
	}

	const { toBeAdded, toBeCreated, runMigrations } = migrationData;

	if (!toBeAdded.length && !toBeCreated.length) {
		s.stop('No migrations needed.');
		p.log.success('🚀 Database is already up to date.');
		p.outro('Migration complete.');
		return;
	}

	s.stop('Migration prepared.');
	p.log.info('🔑 The migration will affect the following:');

	for (const table of [...toBeCreated, ...toBeAdded]) {
		const fields = Object.keys(table.fields).join(', ');
		const tableName = table.table;
		p.log.message(`-> ${fields} fields on ${tableName} table.`);
	}

	let shouldMigrate = options.y;
	if (!shouldMigrate) {
		const confirmed = await p.confirm({
			message: 'Are you sure you want to run these migrations?',
			initialValue: false,
		});

		if (p.isCancel(confirmed)) {
			handleCancel();
			return;
		}
		shouldMigrate = confirmed;
	}

	if (!shouldMigrate) {
		p.log.info('Migration cancelled by user.');
		p.outro('Migration cancelled.');
		return;
	}

	s.start('Running migrations...');
	try {
		await runMigrations();
		s.stop('Migrations completed successfully!');
		p.log.success('🚀 Database migrated successfully!');
		p.outro('Migration complete.');
	} catch (error) {
		s.stop('Migration failed.');
		p.log.error('Error running migrations:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Migration failed.')}`);
	}
}
