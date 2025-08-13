import * as p from '@clack/prompts';
import type { AvailablePackages } from '~/context/framework-detection';
import type { CliContext } from '~/context/types';

interface SharedFrontendOptions {
	backendURL: string | undefined;
	packageName: AvailablePackages;
	context: CliContext;
	handleCancel?: (value: unknown) => boolean;
}

interface SharedFrontendResult {
	proxyNextjs?: boolean;
	useEnvFile?: boolean;
}

export async function getSharedFrontendOptions({
	backendURL,
	packageName,
	context,
	handleCancel,
}: SharedFrontendOptions): Promise<SharedFrontendResult> {
	let useEnvFile = false;
	let proxyNextjs: boolean | undefined;

	if (!backendURL) {
		return {
			proxyNextjs: undefined,
			useEnvFile: undefined,
		};
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

	useEnvFile = useEnvFileSelection as boolean;

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

	return {
		proxyNextjs,
		useEnvFile,
	};
}
