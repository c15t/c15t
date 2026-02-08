import path from 'node:path';
import * as p from '@clack/prompts';
import type { CliContext } from '../../../context/types';
import { migrate } from '../../self-host/migrate';
import {
	ensureBackendConfig,
	pathExists,
} from '../../self-host/migrate/ensure-backend-config';
import {
	getBackendOptions,
	getFrontendUIOptions,
	getScriptsToAdd,
} from './shared';
import type { BaseOptions, BaseResult } from './types';
import { installDependencies } from './utils/dependencies';
import { generateFiles } from './utils/generate-files';

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
	const dependenciesToAdd = new Set([context.framework.pkg, '@c15t/backend']);
	const targetPath = path.join(context.cwd, 'c15t-backend.config.ts');

	let createBackendConfig = false;
	if (!(await pathExists(targetPath))) {
		const config = await ensureBackendConfig(context);
		createBackendConfig = true;

		for (const dep of config?.dependencies ?? []) {
			dependenciesToAdd.add(dep);
		}
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

	// Backend options (env file + proxy)
	const { useEnvFile, proxyNextjs } = await getBackendOptions({
		context,
		backendURL: backendURL as string,
		handleCancel,
	});

	// Frontend UI options (SSR + UI style + theme)
	const { enableSSR, enableDevTools, uiStyle, expandedTheme } =
		await getFrontendUIOptions({
			context,
			hasBackend: true,
			handleCancel,
		});

	// Scripts prompt
	const addScripts = await getScriptsToAdd({ context, handleCancel });

	if (addScripts) {
		dependenciesToAdd.add('@c15t/scripts');
	}
	if (enableDevTools) {
		dependenciesToAdd.add('@c15t/dev-tools');
	}

	await generateFiles({
		context,
		mode: 'self-hosted',
		backendURL: backendURL as string,
		spinner,
		useEnvFile,
		proxyNextjs,
		enableSSR,
		enableDevTools,
		uiStyle,
		expandedTheme,
	});

	const { ranInstall, installDepsConfirmed } = await installDependencies({
		context,
		dependenciesToAdd: Array.from(dependenciesToAdd),
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
