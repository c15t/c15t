/**
 * Prompts actor for the generate state machine
 *
 * Wraps @clack/prompts for use as XState actors with proper cancellation handling.
 */

import {
	BUILT_IN_INTEGRATION_CATEGORIES,
	builtInScriptIntegrations,
} from '@c15t/scripts/registry';
import * as p from '@clack/prompts';
import { fromPromise } from 'xstate';

import {
	formatUserCode,
	getAuthState,
	getControlPlaneBaseUrl,
	getVerificationUrl,
	initiateDeviceFlow,
	pollForToken,
	setSelectedInstanceId,
	storeTokens,
} from '~/auth';
import { getDevToolsOption } from '~/commands/generate/options/shared/dev-tools';
import { getSSROption } from '~/commands/generate/options/shared/ssr';
import { ENV_VARS } from '~/constants';
import type { StorageMode } from '~/constants';
import type { CliContext } from '~/context/types';
import { createControlPlaneClientFromConfig } from '~/control-plane';
import type {
	ControlPlaneOrganization,
	ControlPlaneRegion,
} from '~/control-plane';
import { CliError } from '~/core/errors';
import { color } from '~/core/logger';
import type { Instance } from '~/types';
import { createTaskSpinner } from '~/utils/spinner';
import { validateInstanceName } from '~/utils/validation';

import type { ExpandedTheme, UIStyle } from '../types';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

/**
 * Check if a value is a cancel symbol
 */
const isCancel = function isCancel(value: unknown): value is symbol {
	return p.isCancel(value);
};

/**
 * Cancelled error for prompts
 */
export class PromptCancelledError extends Error {
	constructor(stage: string) {
		super(`Prompt cancelled at stage: ${stage}`);
		this.name = 'PromptCancelledError';
	}
}

const formatInstanceLabel = function formatInstanceLabel(
	instance: Instance
): string {
	if (instance.organizationSlug) {
		return `${instance.organizationSlug}/${instance.name}`;
	}
	return instance.name;
};

const formatInstanceRegion = function formatInstanceRegion(
	instance: Instance
): string {
	return `(${instance.region ?? 'unknown'})`;
};

const isV2ModeEnabled = function isV2ModeEnabled(): boolean {
	return process.env[ENV_VARS.V2] === '1';
};

// --- Mode Selection Prompt ---

export interface ModeSelectionInput {
	initialMode?: StorageMode;
}

export interface ModeSelectionOutput {
	mode: StorageMode;
}

export const modeSelectionActor = fromPromise<
	ModeSelectionOutput,
	ModeSelectionInput
>(async ({ input }) => {
	let { initialMode } = input;
	if (initialMode === 'c15t' || initialMode === 'self-hosted') {
		initialMode = 'hosted';
	}
	if (initialMode === undefined) {
		initialMode = 'hosted';
	}

	const result = await p.select<string | symbol | undefined>({
		initialValue: initialMode,
		message: 'How would you like to store consent decisions?',
		options: [
			{
				hint: 'inth.com or self-hosted backend URL',

				label: 'Hosted',
				value: 'hosted',
			},
			{
				hint: 'Store in browser, no backend needed',

				label: 'Offline',
				value: 'offline',
			},
			{
				hint: 'Full control over storage logic',

				label: 'Custom',
				value: 'custom',
			},
		],
	});

	if (isCancel(result)) {
		throw new PromptCancelledError('mode_selection');
	}

	return { mode: result as StorageMode };
});

// --- Hosted Mode Prompt ---

type HostedProvider = 'inth.com' | 'self-hosted';
type ConsentSetupMethod = 'sign-in' | 'manual-url';

export interface HostedModeInput {
	cliContext: CliContext;
	initialURL?: string;
	preselectedProvider?: HostedProvider | null;
}

export interface HostedModeOutput {
	url: string;
	provider: HostedProvider;
}

const promptBackendURL = async function promptBackendURL(input: {
	message: string;
	placeholder: string;
	initialURL?: string;
	stage: string;
}): Promise<string> {
	const result = await p.text({
		initialValue: input.initialURL,
		message: input.message,
		placeholder: input.placeholder,
		validate: (value) => {
			if (!value || value.trim() === '') {
				return 'URL is required';
			}

			try {
				String(new URL(value));
			} catch {
				return 'Please enter a valid URL';
			}

			return undefined;
		},
	});

	if (isCancel(result)) {
		throw new PromptCancelledError(input.stage);
	}

	return result as string;
};

const runConsentLogin = async function runConsentLogin(
	cliContext: CliContext
): Promise<void> {
	const baseUrl = getControlPlaneBaseUrl();
	const authState = await getAuthState();
	let useExistingSession = false;

	if (authState.isLoggedIn && !authState.isExpired) {
		const keepCurrentSession = await p.confirm({
			initialValue: true,
			message: 'You are already signed in. Use your existing session?',
		});

		if (isCancel(keepCurrentSession)) {
			throw new PromptCancelledError('consent_existing_session');
		}

		if (keepCurrentSession) {
			useExistingSession = true;
		}
	}

	if (useExistingSession) {
		return;
	}

	const deviceSpinner = createTaskSpinner('Requesting device code...');
	deviceSpinner.start();

	try {
		const deviceCode = await initiateDeviceFlow(baseUrl);
		deviceSpinner.success('Device code received');

		const userCode = formatUserCode(deviceCode.user_code);
		const verificationUrl = getVerificationUrl(deviceCode);

		cliContext.logger.message('');
		cliContext.logger.note(
			`Your code: ${color.bold(color.cyan(userCode))}\n\n` +
				`This code will expire in ${Math.floor(deviceCode.expires_in / 60)} minutes.`,
			'Verification Code'
		);
		cliContext.logger.message('');
		cliContext.logger.message(
			`Open this URL to continue: ${color.underline(verificationUrl)}`
		);
		cliContext.logger.message('');

		const shouldOpen = await p.confirm({
			initialValue: true,
			message: 'Open the verification page in your browser?',
		});

		if (isCancel(shouldOpen)) {
			throw new PromptCancelledError('consent_open_verification');
		}

		if (shouldOpen) {
			try {
				const open = (await import('open')).default;
				await open(verificationUrl);
			} catch {
				cliContext.logger.warn(
					`Could not open browser automatically. Visit ${verificationUrl} manually.`
				);
			}
		}

		const authSpinner = createTaskSpinner('Waiting for authorization...');
		authSpinner.start();

		try {
			const token = await pollForToken(
				baseUrl,
				deviceCode.device_code,
				deviceCode.interval,
				deviceCode.expires_in
			);
			authSpinner.success('Authorization received');

			await storeTokens(token.access_token, {
				expiresIn: token.expires_in,
				refreshToken: token.refresh_token,
			});
		} catch (error) {
			authSpinner.error('Authorization failed');
			throw error;
		}
	} catch (error) {
		deviceSpinner.stop();
		throw error;
	}
};

const createInstanceInteractively = async function createInstanceInteractively(
	client: NonNullable<
		Awaited<ReturnType<typeof createControlPlaneClientFromConfig>>
	>,
	cliContext: CliContext
): Promise<Instance> {
	const preloadSpinner = createTaskSpinner(
		'Loading organizations and regions...'
	);
	preloadSpinner.start();

	let organizations: ControlPlaneOrganization[];
	let regions: ControlPlaneRegion[];
	try {
		[organizations, regions] = await Promise.all([
			client.listOrganizations(),
			client.listRegions(),
		]);
	} finally {
		preloadSpinner.stop();
	}

	if (organizations.length === 0) {
		throw new CliError('API_ERROR', {
			details: 'No organizations available for this account',
		});
	}

	if (regions.length === 0) {
		throw new CliError('API_ERROR', {
			details: 'No provisioning regions available',
		});
	}

	const orgSelection = await p.select<string | symbol>({
		initialValue: organizations[0]?.organizationSlug,
		message: 'Select organization:',
		options: organizations.map((org: ControlPlaneOrganization) => ({
			hint: `${org.organizationSlug} • ${org.role}`,
			label: org.organizationName,
			value: org.organizationSlug,
		})),
	});

	if (isCancel(orgSelection)) {
		throw new PromptCancelledError('project_create_org_slug');
	}

	const v2Regions = regions.filter(
		(region: ControlPlaneRegion) => region.family === 'v2'
	);
	if (v2Regions.length === 0) {
		throw new CliError('API_ERROR', {
			details: 'No v2 provisioning regions available',
		});
	}

	const regionSelection = await p.select<string | symbol>({
		initialValue: v2Regions.find((region) => region.id === 'us-east-1')?.id,
		message: 'Select V2 region:',
		options: v2Regions.map((region: ControlPlaneRegion) => ({
			hint: region.label,
			label: region.id,
			value: region.id,
		})),
	});

	if (isCancel(regionSelection)) {
		throw new PromptCancelledError('project_create_region');
	}

	const slugInput = await p.text({
		message: 'New project slug:',
		placeholder: 'my-app',
		validate: (value) => validateInstanceName(value?.trim() ?? ''),
	});

	if (isCancel(slugInput)) {
		throw new PromptCancelledError('project_create_name');
	}

	const slug = slugInput.trim();
	const createSpinner = createTaskSpinner(`Creating project "${slug}"...`);
	createSpinner.start();

	try {
		const instance = await client.createInstance({
			config: {
				organizationSlug: orgSelection,
				region: regionSelection,
			},
			name: slug,
		});
		createSpinner.success('Project created');
		cliContext.logger.info(
			'Created as a v2 development project. Enable production mode in the dashboard when you are ready.'
		);
		return instance;
	} catch (error) {
		createSpinner.error('Failed to create project');
		throw error;
	}
};

const selectOrCreateInstance = async function selectOrCreateInstance(
	cliContext: CliContext
): Promise<Instance> {
	const baseUrl = getControlPlaneBaseUrl();
	const listSpinner = createTaskSpinner('Fetching your inth.com projects...');
	listSpinner.start();

	const client = await createControlPlaneClientFromConfig(baseUrl);
	if (!client) {
		listSpinner.stop();
		throw new CliError('AUTH_NOT_LOGGED_IN');
	}

	try {
		const instances = await client.listInstances();
		listSpinner.stop();

		if (instances.length === 0) {
			cliContext.logger.info(
				'No projects found. Creating a new project for this local project.'
			);
			return await createInstanceInteractively(client, cliContext);
		}

		const selectedId = await p.select<string | symbol>({
			message: 'Select a project to use:',
			options: [
				...instances.map((instance) => ({
					hint: formatInstanceRegion(instance),
					label: formatInstanceLabel(instance),
					value: instance.id,
				})),
				{
					hint: 'Provision a new inth.com project now',
					label: 'Create new project',
					value: '__create__',
				},
			],
		});

		if (isCancel(selectedId)) {
			throw new PromptCancelledError('project_select');
		}

		if (selectedId === '__create__') {
			return await createInstanceInteractively(client, cliContext);
		}

		const selected = instances.find((instance) => instance.id === selectedId);
		if (!selected) {
			throw new CliError('INSTANCE_NOT_FOUND');
		}

		return selected;
	} catch (error) {
		listSpinner.stop();
		throw error;
	} finally {
		await client.close();
	}
};

export const hostedModeActor = fromPromise<HostedModeOutput, HostedModeInput>(
	async ({ input }) => {
		const { cliContext, initialURL, preselectedProvider } = input;
		let provider = preselectedProvider ?? null;

		if (!provider) {
			const providerSelection = await p.select<HostedProvider | symbol>({
				initialValue: 'inth.com',
				message: 'Choose your hosted backend option:',
				options: [
					{
						hint: 'Managed infrastucture',
						label: 'inth.com (Recommended)',
						value: 'inth.com',
					},
					{
						hint: 'Use your own deployed c15t backend',
						label: 'Self-hosted',
						value: 'self-hosted',
					},
				],
			});

			if (isCancel(providerSelection)) {
				throw new PromptCancelledError('hosted_provider');
			}

			provider = providerSelection;
		}

		if (provider === 'self-hosted') {
			const url = await promptBackendURL({
				initialURL,
				message: 'Enter your self-hosted backend URL:',
				placeholder: 'https://your-backend.example.com/api/c15t',
				stage: 'self_hosted_backend_url',
			});

			return { provider, url };
		}

		if (!isV2ModeEnabled()) {
			const url = await promptBackendURL({
				initialURL,
				message: 'Enter your inth.com project URL:',
				placeholder: 'https://your-project.inth.app',
				stage: 'consent_manual_url',
			});
			return { provider: 'inth.com', url };
		}

		const setupMethod = await p.select<ConsentSetupMethod | symbol>({
			initialValue: 'sign-in',
			message: 'How do you want to configure inth.com?',
			options: [
				{
					hint: 'List existing projects or create a new one',
					label: 'Sign in and pick a project',
					value: 'sign-in',
				},
				{
					hint: 'Use an existing backend URL',
					label: 'Enter project URL manually',
					value: 'manual-url',
				},
			],
		});

		if (isCancel(setupMethod)) {
			throw new PromptCancelledError('consent_setup_method');
		}

		if (setupMethod === 'manual-url') {
			const url = await promptBackendURL({
				initialURL,
				message: 'Enter your inth.com project URL:',
				placeholder: 'https://your-project.inth.app',
				stage: 'consent_manual_url',
			});
			return { provider: 'inth.com', url };
		}

		await runConsentLogin(cliContext);
		const instance = await selectOrCreateInstance(cliContext);

		await setSelectedInstanceId(instance.id);
		cliContext.logger.info(
			`Using project ${color.cyan(instance.name)} (${color.dim(instance.id)})`
		);

		return {
			provider: 'inth.com',
			url: instance.url,
		};
	}
);

// --- Backend Options Prompt ---

export interface BackendOptionsInput {
	cliContext: CliContext;
	backendURL: string;
}

export interface BackendOptionsOutput {
	useEnvFile: boolean;
	proxyNextjs: boolean;
}

export const backendOptionsActor = fromPromise<
	BackendOptionsOutput,
	BackendOptionsInput
>(async ({ input }) => {
	const { cliContext } = input;

	// Env file prompt
	const useEnvFile = await p.confirm({
		initialValue: true,
		message:
			'Store the backendURL in a .env file? (Recommended, URL is public)',
	});

	if (isCancel(useEnvFile)) {
		throw new PromptCancelledError('env_file');
	}

	// Next.js proxy prompt (only for Next.js projects)
	let proxyNextjs = false;
	if (cliContext.framework.pkg === 'c15t/next') {
		cliContext.logger.info(
			'Learn more about Next.js Rewrites: https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites'
		);

		const proxyResult = await p.confirm({
			initialValue: true,
			message:
				'Proxy requests to your project with Next.js Rewrites? (Recommended)',
		});

		if (isCancel(proxyResult)) {
			throw new PromptCancelledError('proxy_nextjs');
		}

		proxyNextjs = proxyResult as boolean;
	}

	return {
		proxyNextjs,
		useEnvFile: useEnvFile as boolean,
	};
});

// --- Frontend UI Options Prompt ---

export interface FrontendOptionsInput {
	cliContext: CliContext;
	hasBackend: boolean;
}

export interface FrontendOptionsOutput {
	enableSSR?: boolean;
	enableDevTools?: boolean;
	uiStyle: UIStyle;
	expandedTheme?: ExpandedTheme;
}

export const frontendOptionsActor = fromPromise<
	FrontendOptionsOutput,
	FrontendOptionsInput
>(async ({ input }) => {
	const { cliContext, hasBackend } = input;
	const { pkg } = cliContext.framework;

	let enableSSR: boolean | undefined;
	let enableDevTools = false;
	let uiStyle: UIStyle = 'prebuilt';
	let expandedTheme: ExpandedTheme | undefined;

	// Next.js: SSR (only with backend + App Router) + UI style + theme
	if (pkg === 'c15t/next') {
		// SSR only makes sense when there's a backend and App Router
		if (hasBackend) {
			const { existsSync } = await import('node:fs');
			const { join } = await import('node:path');
			const { projectRoot } = cliContext;
			const isAppRouter = [
				'app/layout.tsx',
				'src/app/layout.tsx',
				'app/layout.ts',
				'src/app/layout.ts',
			].some((pLocal) => existsSync(join(projectRoot, pLocal)));

			if (isAppRouter) {
				enableSSR = await getSSROption({
					context: cliContext,
					onCancel: () => {
						throw new PromptCancelledError('ssr_option');
					},
				});
			}
		}

		// UI style prompt
		cliContext.logger.info(
			'Choose how you want your consent UI components generated.'
		);
		cliContext.logger.info(
			'Learn more: https://c15t.com/docs/frameworks/next/styling/overview'
		);

		const styleResult = await p.select({
			initialValue: 'prebuilt' as UIStyle,
			message: 'UI component style:',
			options: [
				{
					hint: 'Ready-to-use components',
					label: 'Prebuilt (Recommended)',
					value: 'prebuilt',
				},
				{
					hint: 'Full customization control',
					label: 'Compound components',
					value: 'expanded',
				},
			],
		});

		if (isCancel(styleResult)) {
			throw new PromptCancelledError('ui_style');
		}

		uiStyle = styleResult as UIStyle;

		// Theme prompt (both prebuilt and expanded)
		const themeResult = await p.select({
			initialValue: 'none' as ExpandedTheme,
			message: 'Theme preset:',
			options: [
				{
					hint: 'No preset styling',
					label: 'None',
					value: 'none',
				},
				{
					hint: 'Clean light theme',
					label: 'Minimal',
					value: 'minimal',
				},
				{
					hint: 'High contrast dark mode',
					label: 'Dark',
					value: 'dark',
				},
				{
					hint: 'Uses Tailwind utility classes',
					label: 'Tailwind',
					value: 'tailwind',
				},
			],
		});

		if (isCancel(themeResult)) {
			throw new PromptCancelledError('expanded_theme');
		}

		expandedTheme = themeResult as ExpandedTheme;
	}

	// React: UI style + theme (no SSR)
	if (pkg === 'c15t/react') {
		cliContext.logger.info(
			'Choose how you want your consent UI components generated.'
		);

		const styleResult = await p.select({
			initialValue: 'prebuilt' as UIStyle,
			message: 'UI component style:',
			options: [
				{
					hint: 'Ready-to-use components',
					label: 'Prebuilt (Recommended)',
					value: 'prebuilt',
				},
				{
					hint: 'Full customization control',
					label: 'Compound components',
					value: 'expanded',
				},
			],
		});

		if (isCancel(styleResult)) {
			throw new PromptCancelledError('ui_style');
		}

		uiStyle = styleResult as UIStyle;

		// Theme prompt (both prebuilt and expanded)
		const reactThemeResult = await p.select({
			initialValue: 'none' as ExpandedTheme,
			message: 'Theme preset:',
			options: [
				{
					hint: 'No preset styling',
					label: 'None',
					value: 'none',
				},
				{
					hint: 'Clean light theme',
					label: 'Minimal',
					value: 'minimal',
				},
				{
					hint: 'High contrast dark mode',
					label: 'Dark',
					value: 'dark',
				},
				{
					hint: 'Uses Tailwind utility classes',
					label: 'Tailwind',
					value: 'tailwind',
				},
			],
		});

		if (isCancel(reactThemeResult)) {
			throw new PromptCancelledError('expanded_theme');
		}

		expandedTheme = reactThemeResult as ExpandedTheme;
	}

	if (pkg === 'c15t/react' || pkg === 'c15t/next') {
		enableDevTools = await getDevToolsOption({
			context: cliContext,
			onCancel: () => {
				throw new PromptCancelledError('dev_tools_option');
			},
		});
	}

	return {
		enableDevTools,
		enableSSR,
		expandedTheme,
		uiStyle,
	};
});

// --- Scripts Option Prompt ---

/**
 * Available scripts from @c15t/scripts package
 */
export const AVAILABLE_SCRIPTS = BUILT_IN_INTEGRATION_CATEGORIES.flatMap(
	(category) =>
		builtInScriptIntegrations
			.filter((integration) => integration.integrationCategory === category.key)
			.map((integration) => ({
				hint: integration.hint,
				label: integration.label,
				value: integration.packageSubpath,
			}))
);

export type AvailableScript = (typeof AVAILABLE_SCRIPTS)[number]['value'];
type AvailableScriptPromptOptions = Parameters<
	typeof p.multiselect<string>
>[0]['options'];

export interface ScriptsOptionInput {
	cliContext: CliContext;
}

export interface ScriptsOptionOutput {
	addScripts: boolean;
	selectedScripts: AvailableScript[];
}

export const scriptsOptionActor = fromPromise<
	ScriptsOptionOutput,
	ScriptsOptionInput
>(async ({ input }) => {
	const { cliContext } = input;

	cliContext.logger.info(
		'The @c15t/scripts package provides pre-configured third-party scripts with consent management.'
	);

	const addScripts = await p.confirm({
		initialValue: true,
		message: 'Add @c15t/scripts for third-party script management?',
	});

	if (isCancel(addScripts)) {
		throw new PromptCancelledError('scripts_option');
	}

	if (!addScripts) {
		return {
			addScripts: false,
			selectedScripts: [],
		};
	}

	const scriptOptions = AVAILABLE_SCRIPTS.map((script) => ({
		hint: script.hint,
		label: script.label,
		value: script.value,
	})) satisfies AvailableScriptPromptOptions;

	const selected = await p.multiselect<string>({
		message: 'Which scripts do you want to add?',
		options: scriptOptions,
		required: false,
	});

	if (isCancel(selected)) {
		throw new PromptCancelledError('scripts_selection');
	}

	return {
		addScripts: true,
		selectedScripts: selected as AvailableScript[],
	};
});

// --- Install Confirmation Prompt ---

export interface InstallConfirmInput {
	dependencies: string[];
	packageManager: string;
}

export interface InstallConfirmOutput {
	confirmed: boolean;
}

export const installConfirmActor = fromPromise<
	InstallConfirmOutput,
	InstallConfirmInput
>(async ({ input }) => {
	const { dependencies, packageManager } = input;

	const depList = dependencies.join(', ');
	const result = await p.confirm({
		initialValue: true,
		message: `Install dependencies (${depList}) with ${packageManager}?`,
	});

	if (isCancel(result)) {
		throw new PromptCancelledError('install_confirm');
	}

	return { confirmed: result as boolean };
});

// --- Skills Install Prompt ---

export interface SkillsInstallInput {
	cliContext: CliContext;
}

export interface SkillsInstallOutput {
	installed: boolean;
}

export const skillsInstallActor = fromPromise<
	SkillsInstallOutput,
	SkillsInstallInput
>(async ({ input }) => {
	const { cliContext } = input;

	const result = await p.confirm({
		initialValue: true,
		message:
			'Install c15t agent skills for AI-assisted development? (Claude, Cursor, etc.)',
	});

	if (isCancel(result)) {
		return { installed: false };
	}

	if (result) {
		try {
			const { spawn } = await import('node:child_process');

			const pmName = cliContext.packageManager.name;
			const execCommands: Record<string, string> = {
				bun: 'bunx',
				npm: 'npx',
				pnpm: 'pnpm dlx',
				yarn: 'yarn dlx',
			};
			const execCommand = execCommands[pmName] ?? 'npx';
			const [cmd, ...baseArgs] = execCommand.split(' ') as [
				string,
				...string[],
			];

			cliContext.logger.info('Installing c15t agent skills...');

			const child = spawn(cmd, [...baseArgs, 'skills', 'add', 'c15t/skills'], {
				cwd: cliContext.projectRoot,
				stdio: 'inherit',
			});

			const exitCode = await createDeferredPromise<number | null>((resolve) => {
				child.on('exit', (code) => resolve(code));
			});

			if (exitCode === 0) {
				cliContext.logger.success('Agent skills installed successfully!');
				return { installed: true };
			}

			cliContext.logger.warn(
				'Skills installation failed. You can install later with: npx skills add c15t/skills'
			);
			return { installed: false };
		} catch {
			cliContext.logger.warn(
				'Skills installation failed. You can install later with: npx skills add c15t/skills'
			);
			return { installed: false };
		}
	}

	return { installed: false };
});

// --- GitHub Star Prompt ---

export interface GitHubStarInput {
	cliContext: CliContext;
}

export interface GitHubStarOutput {
	opened: boolean;
}

export const githubStarActor = fromPromise<GitHubStarOutput, GitHubStarInput>(
	async ({ input }) => {
		const { cliContext } = input;

		const result = await p.confirm({
			initialValue: true,
			message: 'Would you like to star c15t on GitHub now?',
		});

		if (isCancel(result)) {
			// Don't throw for this optional prompt, just return false
			return { opened: false };
		}

		if (result) {
			try {
				const open = (await import('open')).default;
				await open('https://github.com/c15t/c15t');
				cliContext.logger.success(
					'GitHub repository opened. Thank you for your support!'
				);
				return { opened: true };
			} catch {
				cliContext.logger.info(
					'You can star us later by visiting: https://github.com/c15t/c15t'
				);
				return { opened: false };
			}
		}

		return { opened: false };
	}
);
