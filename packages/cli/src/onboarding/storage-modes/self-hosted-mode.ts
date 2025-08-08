import * as p from '@clack/prompts';
import type { AvailablePackages } from '~/context/framework-detection';
import type { CliContext } from '../../context/types';
import { generateFiles } from '../generate-files';
export interface SelfHostModeResult {
	backendURL: string | undefined;
	usingEnvFile: boolean;
	proxyNextjs?: boolean;
}

interface SelfHostModeOptions {
	context: CliContext;
	projectRoot: string;
	spinner: ReturnType<typeof p.spinner>;
	packageName: AvailablePackages;
	initialBackendURL?: string;
	handleCancel?: (value: unknown) => boolean;
}

/**

/**
 * Handles the setup process for self-hosted mode
 *
 * @param context - CLI context
 * @param projectRoot - Project root directory
 * @param spinner - Spinner for loading indicators
 * @param handleCancel - Function to handle prompt cancellations
 * @returns Configuration data for the self-hosted mode
 */
export async function setupSelfHostedMode({
	context,
	projectRoot,
	spinner,
	packageName,
	handleCancel,
}: SelfHostModeOptions): Promise<SelfHostModeResult> {
	const backendURL = await p.text({
		message: 'Enter the backend URL:',
		initialValue: 'http://localhost:3000',
	});

	if (handleCancel?.(backendURL)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'self_hosted_backend_url_setup',
		});
	}

	const useEnvFileSelection = await p.confirm({
		message:
			'Store the backendURL in a .env file? (Recommended, URL is public)',
		initialValue: true,
	});

	if (handleCancel?.(useEnvFileSelection)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'self_hosted_env_file_setup',
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
				stage: 'self_hosted_proxy_nextjs_setup',
			});
		}

		proxyNextjs = proxyNextjsSelection as boolean;
	}

	await generateFiles({
		context,
		projectRoot,
		mode: 'c15t',
		pkg: packageName,
		backendURL: backendURL as string,
		spinner,
		useEnvFile,
		proxyNextjs,
	});

	return {
		backendURL: backendURL as string,
		usingEnvFile: useEnvFile,
		proxyNextjs,
	};
}
