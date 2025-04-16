import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getAdapter } from '@c15t/backend/pkgs/db-adapters';
import * as p from '@clack/prompts';
import color from 'picocolors';
import { z } from 'zod';
import { getGenerator } from '../generators';
import { getConfig } from '../utils/get-config';

// Helper function to parse simple key-value args like --key value or -k value
// Returns an object with keys (without -- or -) and their values.
// Flags like -y become { y: true }.
// This is a basic parser and might need improvement for complex cases.
function parseArgs(args: string[]): Record<string, string | boolean> {
	const options: Record<string, string | boolean> = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg) continue;

		if (arg.startsWith('--')) {
			const key = arg.substring(2);
			const nextArg = args[i + 1]; // Get potential value
			// Check if nextArg exists and is not an option itself
			if (nextArg && !nextArg.startsWith('-')) {
				options[key] = nextArg;
				i++; // Skip next arg since it's a value
			} else {
				options[key] = true; // Treat as a flag if no value follows
			}
		} else if (arg.startsWith('-')) {
			const key = arg.substring(1);
			const nextArg = args[i + 1]; // Get potential value
			// Check if nextArg exists and is not an option itself
			if (nextArg && !nextArg.startsWith('-')) {
				options[key] = nextArg;
				i++; // Skip next arg since it's a value
			} else {
				options[key] = true; // Treat as a flag
			}
		}
		// Ignore non-option arguments for now
	}
	return options;
}

function handleCancel() {
	p.cancel('Operation cancelled.');
	process.exit(0); // Exit directly on cancel within a command
}

export async function generate(args: string[]) {
	const parsedArgs = parseArgs(args);

	const optionsSchema = z.object({
		cwd: z.string().default(process.cwd()),
		config: z.string().optional(),
		output: z.string().optional(),
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
		p.outro(`${color.red('Generation failed.')}`);
		return; // Let index.ts handle exit code
	}

	const cwd = path.resolve(options.cwd);
	if (!existsSync(cwd)) {
		p.log.error(`The directory "${cwd}" does not exist.`);
		p.outro(`${color.red('Generation failed.')}`);
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
		p.outro(`${color.red('Generation failed.')}`);
		return;
	}

	let adapter;
	try {
		adapter = await getAdapter(config);
	} catch (e) {
		if (e instanceof Error) {
			p.log.error(e.message);
		} else {
			p.log.error('Failed to initialize database adapter.');
		}
		p.outro(`${color.red('Generation failed.')}`);
		return;
	}

	const s = p.spinner();
	s.start('Preparing schema...');

	let schema;
	try {
		schema = await getGenerator({
			adapter,
			file: options.output,
			options: config,
		});
	} catch (error) {
		s.stop('Schema preparation failed.');
		p.log.error('Failed to prepare schema:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Generation failed.')}`);
		return;
	}

	s.stop('Schema prepared.');

	if (!schema.code) {
		p.log.info('Your schema is already up to date.');
		p.outro('Nothing to generate.');
		return;
	}

	const filePath = options.output || path.join(cwd, schema.fileName);
	const fileExists = existsSync(filePath);
	let proceed = options.y;

	if (fileExists && (schema.append || schema.overwrite)) {
		const action = schema.overwrite ? 'overwrite' : 'append';
		if (!proceed) {
			const confirmed = await p.confirm({
				message: `The file ${color.cyan(
					schema.fileName
				)} already exists. Do you want to ${color.yellow(action)} the schema to the file?`,
				initialValue: false,
			});

			if (p.isCancel(confirmed)) {
				handleCancel();
				return; // Should be unreachable due to process.exit in handleCancel
			}
			proceed = confirmed;
		}

		if (proceed) {
			const spinner = p.spinner();
			spinner.start(
				`${action === 'overwrite' ? 'Overwriting' : 'Appending'} file ${color.cyan(schema.fileName)}...`
			);
			try {
				if (schema.overwrite) {
					await fs.writeFile(filePath, schema.code);
				} else {
					await fs.appendFile(filePath, schema.code);
				}
				spinner.stop(
					`🚀 Schema was ${action === 'overwrite' ? 'overwritten' : 'appended'} successfully!`
				);
				p.outro('Generation complete.');
			} catch (error) {
				spinner.stop('File operation failed.');
				p.log.error(`Failed to ${action} file:`);
				if (error instanceof Error) {
					p.log.message(error.message);
				} else {
					p.log.message(String(error));
				}
				p.outro(`${color.red('Generation failed.')}`);
			}
			return;
		} else {
			p.log.warning('Schema generation aborted by user.');
			p.outro('Generation cancelled.');
			return;
		}
	}

	// If file doesn't exist or no append/overwrite needed
	if (!proceed) {
		const confirmed = await p.confirm({
			message: `Generate the schema to ${color.cyan(schema.fileName)}?`,
			initialValue: true,
		});

		if (p.isCancel(confirmed)) {
			handleCancel();
			return; // Should be unreachable
		}
		proceed = confirmed;
	}

	if (!proceed) {
		p.log.warning('Schema generation aborted by user.');
		p.outro('Generation cancelled.');
		return;
	}

	const spinner = p.spinner();
	spinner.start(`Writing schema to ${color.cyan(schema.fileName)}...`);
	try {
		// Ensure directory exists
		const dir = path.dirname(filePath);
		if (!existsSync(dir)) {
			await fs.mkdir(dir, { recursive: true });
		}

		await fs.writeFile(filePath, schema.code);
		spinner.stop('🚀 Schema was generated successfully!');
		p.outro('Generation complete.');
	} catch (error) {
		spinner.stop('Failed to write schema file.');
		p.log.error('Error writing file:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Generation failed.')}`);
	}
}
