import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '../../context/types';
import { formatLogMessage } from '../../utils/logger';
import { generateBackendConfigContent } from '../templates/backend';
import { generateClientConfigContent } from '../templates/config';

/**
 * Result of self-hosted mode setup
 */
export interface SelfHostedModeResult {
	clientConfigContent: string;
	backendConfigContent: string | null;
	dependencies: string[];
	adapterChoice: string;
}

/**
 * Handles the setup process for self-hosted mode
 *
 * @param context - CLI context
 * @param projectRoot - Project root directory
 * @param spinner - Spinner for loading indicators
 * @param handleCancel - Function to handle prompt cancellations
 * @returns Configuration data for the self-hosted mode
 */
export async function setupSelfHostedMode(
	context: CliContext,
	projectRoot: string,
	spinner: ReturnType<typeof p.spinner>,
	handleCancel?: (value: unknown) => boolean
): Promise<SelfHostedModeResult> {
	const { logger, cwd } = context;
	let spinnerActive = false;
	let backendConfigContent: string | null = null;

	// Add backend dependency
	const dependencies = ['@c15t/backend'];

	// Ask if user wants to set up backend configuration
	const setupBackendSelection = await p.confirm({
		message: 'Set up the backend configuration now?',
		initialValue: true,
	});

	if (handleCancel?.(setupBackendSelection)) {
		throw new Error('Setup cancelled');
	}

	const setupBackend = setupBackendSelection as boolean;
	let adapterChoice = 'memory';

	if (setupBackend) {
		// Choose database adapter
		const adapterSelection = await p.select<string | symbol>({
			message: 'Choose a database adapter:',
			initialValue: 'kysely-sqlite',
			options: [
				{
					value: 'kysely-sqlite',
					label: 'Kysely (SQLite)',
					hint: 'Simple setups/local dev',
				},
				{
					value: 'kysely-postgres',
					label: 'Kysely (PostgreSQL)',
					hint: 'Production',
				},
				{
					value: 'memory',
					label: 'Memory',
					hint: 'Testing/development only',
				},
			],
		});

		if (handleCancel?.(adapterSelection)) {
			throw new Error('Setup cancelled');
		}

		adapterChoice = adapterSelection as string;

		let connectionString: string | undefined;
		let dbPath: string | undefined;

		// Get connection details based on adapter
		if (adapterChoice === 'kysely-postgres') {
			const connectionStringSelection = await p.text({
				message: 'Enter PostgreSQL connection string:',
				placeholder: 'postgresql://user:pass@host:port/db',
			});

			if (handleCancel?.(connectionStringSelection)) {
				throw new Error('Setup cancelled');
			}

			// Validate connection string
			if (!connectionStringSelection || connectionStringSelection === '') {
				logger.error('A valid PostgreSQL connection string is required');
				throw new Error('A valid PostgreSQL connection string is required');
			}

			connectionString = connectionStringSelection as string;
		} else if (adapterChoice === 'kysely-sqlite') {
			const dbPathSelection = await p.text({
				message: 'Enter path for SQLite database file:',
				placeholder: './db.sqlite',
				initialValue: './db.sqlite',
			});

			if (handleCancel?.(dbPathSelection)) {
				throw new Error('Setup cancelled');
			}

			// Validate database path
			if (!dbPathSelection || dbPathSelection === '') {
				logger.error('A valid database path is required');
				throw new Error('A valid database path is required');
			}

			dbPath = dbPathSelection as string;
		}

		// Generate and write backend config
		backendConfigContent = generateBackendConfigContent(
			adapterChoice,
			connectionString,
			dbPath
		);

		const backendConfigPath = path.join(projectRoot, 'c15t.backend.ts');

		spinner.start('Creating backend configuration file...');
		spinnerActive = true;
		await fs.writeFile(backendConfigPath, backendConfigContent);
		spinner.stop(
			formatLogMessage(
				'info',
				`Backend configuration created: ${color.cyan(path.relative(cwd, backendConfigPath))}`
			)
		);
		spinnerActive = false;
	}

	// Generate client config (always uses c15t mode with default path)
	const clientConfigContent = generateClientConfigContent(
		'c15t',
		'/api/c15t',
		false
	);

	const configPath = path.join(projectRoot, 'c15t.config.ts');

	spinner.start('Creating client configuration file...');
	spinnerActive = true;
	await fs.writeFile(configPath, clientConfigContent);
	spinner.stop(
		formatLogMessage(
			'info',
			`Client configuration created: ${color.cyan(path.relative(cwd, configPath))}`
		)
	);
	spinnerActive = false;

	return {
		clientConfigContent,
		backendConfigContent,
		dependencies,
		adapterChoice,
	};
}
