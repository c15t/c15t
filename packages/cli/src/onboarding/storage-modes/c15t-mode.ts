import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import open from 'open';
import color from 'picocolors';
import type { CliContext } from '../../context/types';
import { formatLogMessage } from '../../utils/logger';
import {
	generateClientConfigContent,
	generateEnvFileContent,
} from '../templates';

/**
 * Result of c15t mode setup
 */
export interface C15TModeResult {
	clientConfigContent: string;
	backendURL: string;
	usingEnvFile: boolean;
}

/**
 * Handles the setup process for the Hosted c15t (consent.io) mode
 *
 * @param context - CLI context
 * @param projectRoot - Project root directory
 * @param spinner - Spinner for loading indicators
 * @param initialBackendURL - Initial backend URL if available
 * @param handleCancel - Function to handle prompt cancellations
 * @returns Configuration data for the c15t mode
 */
export async function setupC15tMode(
	context: CliContext,
	projectRoot: string,
	spinner: ReturnType<typeof p.spinner>,
	initialBackendURL?: string,
	handleCancel?: (value: unknown) => boolean
): Promise<C15TModeResult> {
	const { logger, cwd } = context;
	let spinnerActive = false;

	// Ask if the user needs a consent.io account
	const needsAccount = await p.confirm({
		message: 'Do you need to create a consent.io account?',
		initialValue: true,
	});

	if (handleCancel?.(needsAccount)) {
		throw new Error('Setup cancelled');
	}

	// Guide the user through account creation if needed
	if (needsAccount) {
		p.note(
			`We'll open your browser to create a consent.io account and set up your instance.\nFollow these steps:\n1. Sign up for a consent.io account\n2. Create a new instance in the dashboard\n3. Configure your trusted origins (domains that can connect)\n4. Copy the provided backendURL (e.g., https://your-instance.c15t.dev)`,
			'consent.io Setup'
		);
		const shouldOpen = await p.confirm({
			message: 'Open browser to sign up for consent.io?',
			initialValue: true,
		});

		if (handleCancel?.(shouldOpen)) {
			throw new Error('Setup cancelled');
		}

		if (shouldOpen) {
			try {
				await open('https://app.consent.io/register?ref=cli');
				const enterPressed = await p.text({
					message:
						'Press Enter once you have created your instance and have the backendURL',
				});

				if (handleCancel?.(enterPressed)) {
					throw new Error('Setup cancelled');
				}
			} catch (error) {
				logger.warn(
					'Failed to open browser automatically. Please visit https://app.consent.io/register manually.'
				);
			}
		}
	}

	// Get the backend URL
	const backendURLSelection = await p.text({
		message: 'Enter your consent.io instance URL:',
		placeholder: 'https://your-instance.c15t.dev',
		initialValue: initialBackendURL,
		validate: (value) => {
			if (!value || value === '') {
				return 'URL is required';
			}
			try {
				const url = new URL(value);
				if (!url.hostname.endsWith('.c15t.dev')) {
					return 'Please enter a valid *.c15t.dev URL';
				}
			} catch {
				return 'Please enter a valid URL';
			}
		},
	});

	if (handleCancel?.(backendURLSelection)) {
		throw new Error('Setup cancelled');
	}

	// Ensure we don't proceed with empty strings
	if (!backendURLSelection || backendURLSelection === '') {
		logger.error('A valid consent.io URL is required');
		throw new Error('A valid consent.io URL is required');
	}

	const backendURL = backendURLSelection as string;

	// Ask if the URL should be stored in .env file
	const useEnvFileSelection = await p.confirm({
		message:
			'Store the backendURL in a .env file? (Recommended, URL is public)',
		initialValue: true,
	});

	if (handleCancel?.(useEnvFileSelection)) {
		throw new Error('Setup cancelled');
	}

	const useEnvFile = useEnvFileSelection as boolean;

	// Generate client config
	const clientConfigContent = generateClientConfigContent(
		'c15t',
		backendURL,
		undefined,
		useEnvFile
	);

	const configPath = path.join(projectRoot, 'c15t.config.ts');

	// Write the client config
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

	// Create env files if needed
	if (useEnvFile) {
		const envPath = path.join(projectRoot, '.env.local');
		const envExamplePath = path.join(projectRoot, '.env.example');

		spinner.start('Creating environment files...');
		spinnerActive = true;

		const envContent = generateEnvFileContent(backendURL);
		await fs.writeFile(envPath, envContent);
		logger.info(
			`   - Created environment file: ${color.cyan(path.relative(cwd, envPath))}`
		);

		const envExampleContent =
			'# c15t Configuration\nNEXT_PUBLIC_C15T_URL=https://your-instance.c15t.dev\n';
		await fs.writeFile(envExamplePath, envExampleContent);
		logger.info(
			`   - Created example env file: ${color.cyan(path.relative(cwd, envExamplePath))}`
		);

		spinner.stop(formatLogMessage('info', 'Environment files created.'));
		spinnerActive = false;
	}

	return {
		clientConfigContent,
		backendURL,
		usingEnvFile: useEnvFile,
	};
}
