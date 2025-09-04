import * as p from '@clack/prompts';
import open from 'open';
import type { CliContext } from '../../../context/types';
import type { BaseOptions, BaseResult } from './types';
import { installDependencies } from './utils/dependencies';
import { generateFiles } from './utils/generate-files';
import { getSharedFrontendOptions } from './utils/shared-frontend';

/**
 * Result of c15t mode setup
 */
export interface C15TModeResult extends BaseResult {
	backendURL: string | undefined;
	usingEnvFile: boolean;
	proxyNextjs?: boolean;
}

interface C15TModeOptions extends BaseOptions {
	context: CliContext;
	initialBackendURL?: string;
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
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'c15t_account_creation',
		});
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
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'c15t_browser_open',
		});
	}

	if (shouldOpen) {
		try {
			await open('https://consent.io/dashboard/register?ref=cli');
			const enterPressed = await p.text({
				message:
					'Press Enter once you have created your instance and have the backendURL',
			});

			if (handleCancel?.(enterPressed)) {
				context.error.handleCancel('Setup cancelled.', {
					command: 'onboarding',
					stage: 'c15t_url_input',
				});
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
	context: CliContext,
	initialBackendURL: string | undefined,
	handleCancel?: (value: unknown) => boolean
): Promise<string | undefined> {
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
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'c15t_url_validation',
		});
	}

	if (!backendURLSelection || backendURLSelection === '') {
		context.error.handleCancel('A valid consent.io URL is required', {
			command: 'onboarding',
			stage: 'c15t_url_validation',
		});
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
	spinner,
	initialBackendURL,
	handleCancel,
}: C15TModeOptions): Promise<C15TModeResult> {
	await handleAccountCreation(context, handleCancel);

	const backendURL = await getBackendURL(
		context,
		initialBackendURL,
		handleCancel
	);

	const { useEnvFile, proxyNextjs } = await getSharedFrontendOptions({
		backendURL: backendURL as string,
		context,
		handleCancel,
	});

	await generateFiles({
		context,
		mode: 'c15t',
		backendURL,
		spinner,
		useEnvFile,
		proxyNextjs,
	});

	const { ranInstall, installDepsConfirmed } = await installDependencies({
		context,
		dependenciesToAdd: [context.framework.pkg],
		handleCancel,
	});

	return {
		backendURL,
		usingEnvFile: useEnvFile ?? false,
		proxyNextjs,
		installDepsConfirmed,
		ranInstall,
	};
}
