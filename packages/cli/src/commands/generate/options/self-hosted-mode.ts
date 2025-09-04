import * as p from '@clack/prompts';
import type { CliContext } from '../../../context/types';
import { migrate } from '../../self-host/migrate';
import { ensureBackendConfig } from '../../self-host/migrate/ensure-backend-config';
import type { BaseOptions, BaseResult } from './types';
import { installDependencies } from './utils/dependencies';
import { generateFiles } from './utils/generate-files';
import { getSharedFrontendOptions } from './utils/shared-frontend';
export interface SelfHostModeResult extends BaseResult {
	backendURL: string | undefined;
	usingEnvFile: boolean;
	proxyNextjs?: boolean;
	createBackendConfig: boolean;
	runMigrations: boolean;
}

interface SelfHostModeOptions extends BaseOptions {
	context: CliContext;
	spinner: ReturnType<typeof p.spinner>;
	initialBackendURL?: string;
	handleCancel?: (value: unknown) => boolean;
}

export async function setupSelfHostedMode({
	context,
	spinner,
	handleCancel,
}: SelfHostModeOptions): Promise<SelfHostModeResult> {
	const dependenciesToAdd: string[] = [context.framework.pkg, '@c15t/backend'];

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
		const config = await ensureBackendConfig(context);

		dependenciesToAdd.push(...(config?.dependencies ?? []));
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
		context,
		handleCancel,
	});

	await generateFiles({
		context,
		mode: 'c15t',
		backendURL: backendURL as string,
		spinner,
		useEnvFile,
		proxyNextjs,
	});

	const { ranInstall, installDepsConfirmed } = await installDependencies({
		context,
		dependenciesToAdd,
		handleCancel,
	});

	const runMigrations = await p.confirm({
		message: 'Would you like to run migrations?',
		initialValue: true,
	});

	if (handleCancel?.(runMigrations)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'self_hosted_run_migrations_setup',
		});
	}

	if (runMigrations) {
		await migrate(context);
	}

	return {
		backendURL: backendURL as string,
		usingEnvFile: useEnvFile ?? false,
		proxyNextjs,
		createBackendConfig: createBackendConfig as boolean,
		installDepsConfirmed,
		ranInstall,
		runMigrations: runMigrations as boolean,
	};
}
