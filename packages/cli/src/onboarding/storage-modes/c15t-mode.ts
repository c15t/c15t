import * as p from '@clack/prompts';
import open from 'open';
import type { AvailablePackages } from '~/context/framework-detection';
import type { CliContext } from '../../context/types';
import { generateFiles } from '../generate-files';

/**
 * Result of c15t mode setup
 */
export interface C15TModeResult {
	backendURL: string | undefined;
	usingEnvFile: boolean;
	proxyNextjs?: boolean;
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
	projectRoot,
	spinner,
	packageName,
	initialBackendURL,
	handleCancel,
}: C15TModeOptions): Promise<C15TModeResult> {
	await handleAccountCreation(context, handleCancel);
	const backendURL = await getBackendURL(
		context,
		initialBackendURL,
		handleCancel
	);

	const useEnvFileSelection = await p.confirm({
		message:
			'Store the backendURL in a .env file? (Recommended, URL is public)',
		initialValue: true,
	});

	if (handleCancel?.(useEnvFileSelection)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'c15t_env_file_setup',
		});
	}

	const useEnvFile = useEnvFileSelection as boolean;
	let proxyNextjs: boolean | undefined;

	if (packageName === '@c15t/nextjs') {
		context.logger.info(
			'Learn more about Next.js Rewrites: https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites'
		);

		const proxyNextjsSelection = await p.confirm({
			message:
				'Proxy requests to your instance with Next.js Rewrites? (Recommended)',
			initialValue: true,
		});

		if (handleCancel?.(proxyNextjsSelection)) {
			context.error.handleCancel('Setup cancelled.', {
				command: 'onboarding',
				stage: 'c15t_proxy_nextjs_setup',
			});
		}

		proxyNextjs = proxyNextjsSelection as boolean;
	}

	await generateFiles({
		context,
		projectRoot,
		mode: 'c15t',
		pkg: packageName,
		backendURL,
		spinner,
		useEnvFile,
		proxyNextjs,
	});

	return {
		backendURL,
		usingEnvFile: useEnvFile,
		proxyNextjs,
	};
}
