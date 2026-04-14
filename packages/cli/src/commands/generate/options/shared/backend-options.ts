/**
 * Backend options composer
 * Composes backend-related prompts (env file + proxy) for modes with a backend URL
 */

import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';

interface BackendOptionsInput {
	context: CliContext;
	backendURL: string;
	handleCancel?: (value: unknown) => boolean;
}

interface BackendOptionsResult {
	useEnvFile: boolean;
	proxyNextjs?: boolean;
}

/**
 * Composes backend-related prompts (env file + proxy).
 * Only called for modes that have a backendURL.
 *
 * @param options.context - CLI context
 * @param options.backendURL - The backend URL to configure
 * @param options.handleCancel - Function to handle prompt cancellations
 * @returns Configuration for env file and Next.js proxy
 */
export async function getBackendOptions({
	context,
	backendURL,
	handleCancel,
}: BackendOptionsInput): Promise<BackendOptionsResult> {
	let useEnvFile = false;
	let proxyNextjs: boolean | undefined;

	// Prompt for env file storage
	const useEnvFileSelection = await p.confirm({
		message:
			'Store the backendURL in a .env file? (Recommended, URL is public)',
		initialValue: true,
	});

	if (handleCancel?.(useEnvFileSelection)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'backend_env_file_setup',
		});
	}

	useEnvFile = useEnvFileSelection as boolean;

	// Prompt for Next.js proxy if using Next.js
	if (context.framework.pkg === '@c15t/nextjs') {
		context.logger.info(
			'Learn more about Next.js Rewrites: https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites'
		);

		const proxyNextjsSelection = await p.confirm({
			message:
				'Proxy requests to your project with Next.js Rewrites? (Recommended)',
			initialValue: true,
		});

		if (handleCancel?.(proxyNextjsSelection)) {
			context.error.handleCancel('Setup cancelled.', {
				command: 'onboarding',
				stage: 'backend_proxy_nextjs_setup',
			});
		}

		proxyNextjs = proxyNextjsSelection as boolean;
	}

	return {
		useEnvFile,
		proxyNextjs,
	};
}
