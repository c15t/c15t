import * as p from '@clack/prompts';
import open from 'open';
import type { AvailablePackages } from '~/context/framework-detection';
import type { CliContext } from '../../context/types';
import { generateFiles } from '../generate-files';

/**
 * Result of c15t mode setup
 */
export interface C15TModeResult {
	backendURL: string;
	usingEnvFile: boolean;
}

interface C15TModeOptions {
	context: CliContext;
	projectRoot: string;
	spinner: ReturnType<typeof p.spinner>;
	packageName: AvailablePackages;
	initialBackendURL?: string;
	handleCancel?: (value: unknown) => boolean;
}

/**
 * Handles the account creation flow for consent.io
 */
async function handleAccountCreation(
	context: CliContext,
	handleCancel?: (value: unknown) => boolean
): Promise<void> {
	const { logger } = context;

	const needsAccount = await p.confirm({
		message: 'Do you need to create a consent.io account?',
		initialValue: true,
	});

	if (handleCancel?.(needsAccount)) {
		throw new Error('Setup cancelled');
	}

	if (!needsAccount) {
		return;
	}

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
			await open('https://consent.io/dashboard/register?ref=cli');
			const enterPressed = await p.text({
				message:
					'Press Enter once you have created your instance and have the backendURL',
			});

			if (handleCancel?.(enterPressed)) {
				throw new Error('Setup cancelled');
			}
		} catch {
			logger.warn(
				'Failed to open browser automatically. Please visit https://consent.io/dashboard/register manually.'
			);
		}
	}
}

/**
 * Collects and validates the backend URL
 */
async function getBackendURL(
	initialBackendURL: string | undefined,
	handleCancel?: (value: unknown) => boolean
): Promise<string> {
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

	if (!backendURLSelection || backendURLSelection === '') {
		throw new Error('A valid consent.io URL is required');
	}

	return backendURLSelection as string;
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
export async function setupC15tMode({
	context,
	projectRoot,
	spinner,
	packageName,
	initialBackendURL,
	handleCancel,
}: C15TModeOptions): Promise<C15TModeResult> {
	await handleAccountCreation(context, handleCancel);
	const backendURL = await getBackendURL(initialBackendURL, handleCancel);

	const useEnvFileSelection = await p.confirm({
		message:
			'Store the backendURL in a .env file? (Recommended, URL is public)',
		initialValue: true,
	});

	if (handleCancel?.(useEnvFileSelection)) {
		throw new Error('Setup cancelled');
	}

	const useEnvFile = useEnvFileSelection as boolean;

	await generateFiles({
		context,
		projectRoot,
		mode: 'c15t',
		pkg: packageName,
		backendURL,
		spinner,
		useEnvFile,
	});

	return {
		backendURL,
		usingEnvFile: useEnvFile,
	};
}
