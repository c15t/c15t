import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';
import { getScriptsToAdd } from '../shared/scripts';

interface SharedFrontendOptions {
	backendURL: string | undefined;
	context: CliContext;
	handleCancel?: (value: unknown) => boolean;
}

interface SharedFrontendResult {
	proxyNextjs?: boolean;
	useEnvFile?: boolean;
	dependenciesToAdd: string[];
}

export async function getSharedFrontendOptions({
	backendURL,
	context,
	handleCancel,
}: SharedFrontendOptions): Promise<SharedFrontendResult> {
	let useEnvFile = false;
	let proxyNextjs: boolean | undefined;

	if (!backendURL) {
		return {
			proxyNextjs: undefined,
			useEnvFile: undefined,
			dependenciesToAdd: [],
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

	if (context.framework.pkg === '@c15t/nextjs') {
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

	const addScriptsSelection = await getScriptsToAdd({ context, handleCancel });

	const dependenciesToAdd: string[] = [context.framework.pkg];

	if (addScriptsSelection) {
		dependenciesToAdd.push('@c15t/scripts');
	}

	return {
		proxyNextjs,
		useEnvFile,
		dependenciesToAdd,
	};
}
