import * as p from '@clack/prompts';
import type { AvailablePackages } from '~/context/framework-detection';
import type { CliContext } from '../../../../context/types';
import { ensureBackendConfig } from '../../../migrate/ensure-backend-config';
import { generateFiles } from '../generate-files';
import { getSharedFrontendOptions } from './utils/shared-frontend';
export interface SelfHostModeResult {
	backendURL: string | undefined;
	usingEnvFile: boolean;
	proxyNextjs?: boolean;
	createBackendConfig: boolean;
}

interface SelfHostModeOptions {
	context: CliContext;
	projectRoot: string;
	spinner: ReturnType<typeof p.spinner>;
	packageName: AvailablePackages;
	initialBackendURL?: string;
	handleCancel?: (value: unknown) => boolean;
}

export async function setupSelfHostedMode({
	context,
	projectRoot,
	spinner,
	packageName,
	handleCancel,
}: SelfHostModeOptions): Promise<SelfHostModeResult> {
	const createBackendConfig = await p.confirm({
		message: 'Would you like to create a backend config file?',
		initialValue: true,
	});

	if (handleCancel?.(createBackendConfig)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'self_hosted_backend_config_setup',
		});
	}

	if (createBackendConfig) {
		await ensureBackendConfig(context);
	}

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

	const { useEnvFile, proxyNextjs } = await getSharedFrontendOptions({
		backendURL: backendURL as string,
		packageName,
		context,
		handleCancel,
	});

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
		usingEnvFile: useEnvFile ?? false,
		proxyNextjs,
		createBackendConfig: createBackendConfig as boolean,
	};
}
