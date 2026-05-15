/**
 * Prompts actor for the generate state machine
 *
 * Wraps Hexbus prompts for use as XState actors with proper cancellation handling.
 */

import {
	promptConfirm,
	promptMultiselect,
	promptSelect,
	promptText,
} from 'hexbus';
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
import { ENV_VARS, type StorageMode } from '~/constants';
import type { CliContext } from '~/context/types';
import {
	type ControlPlaneOrganization,
	type ControlPlaneRegion,
	createControlPlaneClientFromConfig,
} from '~/control-plane';
import { CliError } from '~/core/errors';
import { color } from '~/core/logger';
import type { Instance } from '~/types';
import { createTaskSpinner } from '~/utils/spinner';
import { validateInstanceName } from '~/utils/validation';
import type { ExpandedTheme, UIStyle } from '../types';

/**
 * Cancelled error for prompts
 */
export class PromptCancelledError extends Error {
	constructor(stage: string) {
		super(`Prompt cancelled at stage: ${stage}`);
		this.name = 'PromptCancelledError';
	}
}

function formatInstanceLabel(instance: Instance): string {
	if (instance.organizationSlug) {
		return `${instance.organizationSlug}/${instance.name}`;
	}
	return instance.name;
}

function formatInstanceRegion(instance: Instance): string {
	return `(${instance.region ?? 'unknown'})`;
}

function isV2ModeEnabled(): boolean {
	return process.env[ENV_VARS.V2] === '1';
}

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
	let initialMode = input.initialMode;
	if (initialMode === 'c15t' || initialMode === 'self-hosted') {
		initialMode = 'hosted';
	}
	if (initialMode === undefined) {
		initialMode = 'hosted';
	}

	const result = await promptSelect({
		cancel: 'silent',
		message: 'How would you like to store consent decisions?',
		initialValue: initialMode,
		options: [
			{
				value: 'hosted',
				label: 'Hosted',
				hint: 'inth.com or self-hosted backend URL',
			},
			{
				value: 'offline',
				label: 'Offline',
				hint: 'Store in browser, no backend needed',
			},
			{
				value: 'custom',
				label: 'Custom',
				hint: 'Full control over storage logic',
			},
		],
		stage: 'mode_selection',
	});

	if (result === undefined) {
		throw new PromptCancelledError('mode_selection');
	}

	return { mode: result as StorageMode };
});

// --- Hosted Mode Prompt ---

type HostedProvider = 'inth.com' | 'self-hosted';

export interface HostedModeInput {
	cliContext: CliContext;
	initialURL?: string;
	preselectedProvider?: HostedProvider | null;
}

export interface HostedModeOutput {
	url: string;
	provider: HostedProvider;
}

async function promptBackendURL(input: {
	message: string;
	placeholder: string;
	initialURL?: string;
	stage: string;
}): Promise<string> {
	const result = await promptText({
		cancel: 'silent',
		message: input.message,
		placeholder: input.placeholder,
		initialValue: input.initialURL,
		validate: (value) => {
			if (!value || value.trim() === '') {
				return 'URL is required';
			}

			try {
				new URL(value);
			} catch {
				return 'Please enter a valid URL';
			}

			return undefined;
		},
		stage: input.stage,
	});

	if (result === undefined) {
		throw new PromptCancelledError(input.stage);
	}

	return result;
}

async function runConsentLogin(cliContext: CliContext): Promise<void> {
	const baseUrl = getControlPlaneBaseUrl();
	const authState = await getAuthState();
	let useExistingSession = false;

	if (authState.isLoggedIn && !authState.isExpired) {
		const keepCurrentSession = await promptConfirm({
			cancel: 'silent',
			message: 'You are already signed in. Use your existing session?',
			initialValue: true,
			stage: 'consent_existing_session',
			telemetry: cliContext.telemetry,
		});

		if (keepCurrentSession === undefined) {
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

		const shouldOpen = await promptConfirm({
			cancel: 'silent',
			message: 'Open the verification page in your browser?',
			initialValue: true,
			stage: 'consent_open_verification',
			telemetry: cliContext.telemetry,
		});

		if (shouldOpen === undefined) {
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
				refreshToken: token.refresh_token,
				expiresIn: token.expires_in,
			});
		} catch (error) {
			authSpinner.error('Authorization failed');
			throw error;
		}
	} catch (error) {
		deviceSpinner.stop();
		throw error;
	}
}

async function createInstanceInteractively(
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

	const orgSelection = await promptSelect({
		cancel: 'silent',
		message: 'Select organization:',
		options: organizations.map((org: ControlPlaneOrganization) => ({
			value: org.organizationSlug,
			label: org.organizationName,
			hint: `${org.organizationSlug} • ${org.role}`,
		})),
		initialValue: organizations[0]?.organizationSlug,
		stage: 'project_create_org_slug',
		telemetry: cliContext.telemetry,
	});

	if (orgSelection === undefined) {
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

	const regionSelection = await promptSelect({
		cancel: 'silent',
		message: 'Select V2 region:',
		options: v2Regions.map((region: ControlPlaneRegion) => ({
			value: region.id,
			label: region.id,
			hint: region.label,
		})),
		initialValue: v2Regions.find((region) => region.id === 'us-east-1')?.id,
		stage: 'project_create_region',
		telemetry: cliContext.telemetry,
	});

	if (regionSelection === undefined) {
		throw new PromptCancelledError('project_create_region');
	}

	const slugInput = await promptText({
		cancel: 'silent',
		message: 'New project slug:',
		placeholder: 'my-app',
		validate: (value) => validateInstanceName(value?.trim() ?? ''),
		stage: 'project_create_name',
		telemetry: cliContext.telemetry,
	});

	if (slugInput === undefined) {
		throw new PromptCancelledError('project_create_name');
	}

	const slug = slugInput.trim();
	const createSpinner = createTaskSpinner(`Creating project "${slug}"...`);
	createSpinner.start();

	try {
		const instance = await client.createInstance({
			name: slug,
			config: {
				organizationSlug: orgSelection,
				region: regionSelection,
			},
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
}

async function selectOrCreateInstance(
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

		const selectedId = await promptSelect({
			cancel: 'silent',
			message: 'Select a project to use:',
			options: [
				...instances.map((instance) => ({
					value: instance.id,
					label: formatInstanceLabel(instance),
					hint: formatInstanceRegion(instance),
				})),
				{
					value: '__create__',
					label: 'Create new project',
					hint: 'Provision a new inth.com project now',
				},
			],
			stage: 'project_select',
			telemetry: cliContext.telemetry,
		});

		if (selectedId === undefined) {
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
}

export const hostedModeActor = fromPromise<HostedModeOutput, HostedModeInput>(
	async ({ input }) => {
		const { cliContext, initialURL, preselectedProvider } = input;
		let provider = preselectedProvider ?? null;

		if (!provider) {
			const providerSelection = await promptSelect({
				cancel: 'silent',
				message: 'Choose your hosted backend option:',
				options: [
					{
						value: 'inth.com',
						label: 'inth.com (Recommended)',
						hint: 'Managed infrastucture',
					},
					{
						value: 'self-hosted',
						label: 'Self-hosted',
						hint: 'Use your own deployed c15t backend',
					},
				],
				initialValue: 'inth.com',
				stage: 'hosted_provider',
				telemetry: cliContext.telemetry,
			});

			if (providerSelection === undefined) {
				throw new PromptCancelledError('hosted_provider');
			}

			provider = providerSelection;
		}

		if (provider === 'self-hosted') {
			const url = await promptBackendURL({
				message: 'Enter your self-hosted backend URL:',
				placeholder: 'https://your-backend.example.com/api/c15t',
				initialURL,
				stage: 'self_hosted_backend_url',
			});

			return { url, provider };
		}

		if (!isV2ModeEnabled()) {
			const url = await promptBackendURL({
				message: 'Enter your inth.com project URL:',
				placeholder: 'https://your-project.inth.app',
				initialURL,
				stage: 'consent_manual_url',
			});
			return { url, provider: 'inth.com' };
		}

		const setupMethod = await promptSelect({
			cancel: 'silent',
			message: 'How do you want to configure inth.com?',
			options: [
				{
					value: 'sign-in',
					label: 'Sign in and pick a project',
					hint: 'List existing projects or create a new one',
				},
				{
					value: 'manual-url',
					label: 'Enter project URL manually',
					hint: 'Use an existing backend URL',
				},
			],
			initialValue: 'sign-in',
			stage: 'consent_setup_method',
			telemetry: cliContext.telemetry,
		});

		if (setupMethod === undefined) {
			throw new PromptCancelledError('consent_setup_method');
		}

		if (setupMethod === 'manual-url') {
			const url = await promptBackendURL({
				message: 'Enter your inth.com project URL:',
				placeholder: 'https://your-project.inth.app',
				initialURL,
				stage: 'consent_manual_url',
			});
			return { url, provider: 'inth.com' };
		}

		await runConsentLogin(cliContext);
		const instance = await selectOrCreateInstance(cliContext);

		await setSelectedInstanceId(instance.id);
		cliContext.logger.info(
			`Using project ${color.cyan(instance.name)} (${color.dim(instance.id)})`
		);

		return {
			url: instance.url,
			provider: 'inth.com',
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
	const useEnvFile = await promptConfirm({
		cancel: 'silent',
		message:
			'Store the backendURL in a .env file? (Recommended, URL is public)',
		initialValue: true,
		stage: 'env_file',
		telemetry: cliContext.telemetry,
	});

	if (useEnvFile === undefined) {
		throw new PromptCancelledError('env_file');
	}

	// Next.js proxy prompt (only for Next.js projects)
	let proxyNextjs = false;
	if (cliContext.framework.pkg === '@c15t/nextjs') {
		cliContext.logger.info(
			'Learn more about Next.js Rewrites: https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites'
		);

		const proxyResult = await promptConfirm({
			cancel: 'silent',
			message:
				'Proxy requests to your project with Next.js Rewrites? (Recommended)',
			initialValue: true,
			stage: 'proxy_nextjs',
			telemetry: cliContext.telemetry,
		});

		if (proxyResult === undefined) {
			throw new PromptCancelledError('proxy_nextjs');
		}

		proxyNextjs = proxyResult;
	}

	return {
		useEnvFile,
		proxyNextjs,
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
	const pkg = cliContext.framework.pkg;

	let enableSSR: boolean | undefined;
	let enableDevTools = false;
	let uiStyle: UIStyle = 'prebuilt';
	let expandedTheme: ExpandedTheme | undefined;

	// Next.js: SSR (only with backend + App Router) + UI style + theme
	if (pkg === '@c15t/nextjs') {
		// SSR only makes sense when there's a backend and App Router
		if (hasBackend) {
			const { existsSync } = await import('node:fs');
			const { join } = await import('node:path');
			const projectRoot = cliContext.projectRoot;
			const isAppRouter = [
				'app/layout.tsx',
				'src/app/layout.tsx',
				'app/layout.ts',
				'src/app/layout.ts',
			].some((p) => existsSync(join(projectRoot, p)));

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
			'Learn more: https://c15t.com/docs/frameworks/nextjs/customization'
		);

		const styleResult = await promptSelect({
			cancel: 'silent',
			message: 'UI component style:',
			options: [
				{
					value: 'prebuilt',
					label: 'Prebuilt (Recommended)',
					hint: 'Ready-to-use components',
				},
				{
					value: 'expanded',
					label: 'Compound components',
					hint: 'Full customization control',
				},
			],
			initialValue: 'prebuilt' as UIStyle,
			stage: 'ui_style',
			telemetry: cliContext.telemetry,
		});

		if (styleResult === undefined) {
			throw new PromptCancelledError('ui_style');
		}

		uiStyle = styleResult as UIStyle;

		// Theme prompt (both prebuilt and expanded)
		const themeResult = await promptSelect({
			cancel: 'silent',
			message: 'Theme preset:',
			options: [
				{
					value: 'none',
					label: 'None',
					hint: 'No preset styling',
				},
				{
					value: 'minimal',
					label: 'Minimal',
					hint: 'Clean light theme',
				},
				{
					value: 'dark',
					label: 'Dark',
					hint: 'High contrast dark mode',
				},
				{
					value: 'tailwind',
					label: 'Tailwind',
					hint: 'Uses Tailwind utility classes',
				},
			],
			initialValue: 'none' as ExpandedTheme,
			stage: 'expanded_theme',
			telemetry: cliContext.telemetry,
		});

		if (themeResult === undefined) {
			throw new PromptCancelledError('expanded_theme');
		}

		expandedTheme = themeResult as ExpandedTheme;
	}

	// React: UI style + theme (no SSR)
	if (pkg === '@c15t/react') {
		cliContext.logger.info(
			'Choose how you want your consent UI components generated.'
		);

		const styleResult = await promptSelect({
			cancel: 'silent',
			message: 'UI component style:',
			options: [
				{
					value: 'prebuilt',
					label: 'Prebuilt (Recommended)',
					hint: 'Ready-to-use components',
				},
				{
					value: 'expanded',
					label: 'Compound components',
					hint: 'Full customization control',
				},
			],
			initialValue: 'prebuilt' as UIStyle,
			stage: 'ui_style',
			telemetry: cliContext.telemetry,
		});

		if (styleResult === undefined) {
			throw new PromptCancelledError('ui_style');
		}

		uiStyle = styleResult as UIStyle;

		// Theme prompt (both prebuilt and expanded)
		const reactThemeResult = await promptSelect({
			cancel: 'silent',
			message: 'Theme preset:',
			options: [
				{
					value: 'none',
					label: 'None',
					hint: 'No preset styling',
				},
				{
					value: 'minimal',
					label: 'Minimal',
					hint: 'Clean light theme',
				},
				{
					value: 'dark',
					label: 'Dark',
					hint: 'High contrast dark mode',
				},
				{
					value: 'tailwind',
					label: 'Tailwind',
					hint: 'Uses Tailwind utility classes',
				},
			],
			initialValue: 'none' as ExpandedTheme,
			stage: 'expanded_theme',
			telemetry: cliContext.telemetry,
		});

		if (reactThemeResult === undefined) {
			throw new PromptCancelledError('expanded_theme');
		}

		expandedTheme = reactThemeResult as ExpandedTheme;
	}

	if (pkg === 'c15t' || pkg === '@c15t/react' || pkg === '@c15t/nextjs') {
		enableDevTools = await getDevToolsOption({
			context: cliContext,
			onCancel: () => {
				throw new PromptCancelledError('dev_tools_option');
			},
		});
	}

	return {
		enableSSR,
		enableDevTools,
		uiStyle,
		expandedTheme,
	};
});

// --- Scripts Option Prompt ---

/**
 * Available scripts from @c15t/scripts package
 */
export const AVAILABLE_SCRIPTS = [
	{
		value: 'google-tag-manager',
		label: 'Google Tag Manager',
		hint: 'GTM container script',
	},
	{
		value: 'google-tag',
		label: 'Google Tag (gtag.js)',
		hint: 'Google Analytics 4',
	},
	{
		value: 'meta-pixel',
		label: 'Meta Pixel',
		hint: 'Facebook/Instagram tracking',
	},
	{
		value: 'posthog',
		label: 'PostHog',
		hint: 'Product analytics',
	},
	{
		value: 'linkedin-insights',
		label: 'LinkedIn Insight Tag',
		hint: 'LinkedIn conversion tracking',
	},
	{
		value: 'tiktok-pixel',
		label: 'TikTok Pixel',
		hint: 'TikTok ads tracking',
	},
	{
		value: 'x-pixel',
		label: 'X (Twitter) Pixel',
		hint: 'X/Twitter conversion tracking',
	},
	{
		value: 'microsoft-uet',
		label: 'Microsoft UET',
		hint: 'Bing Ads tracking',
	},
	{
		value: 'databuddy',
		label: 'Databuddy',
		hint: 'Data collection',
	},
] as const;

export type AvailableScript = (typeof AVAILABLE_SCRIPTS)[number]['value'];

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

	const addScripts = await promptConfirm({
		cancel: 'silent',
		message: 'Add @c15t/scripts for third-party script management?',
		initialValue: true,
		stage: 'scripts_option',
		telemetry: cliContext.telemetry,
	});

	if (addScripts === undefined) {
		throw new PromptCancelledError('scripts_option');
	}

	if (!addScripts) {
		return {
			addScripts: false,
			selectedScripts: [],
		};
	}

	const selected = await promptMultiselect({
		cancel: 'silent',
		message: 'Which scripts do you want to add?',
		options: AVAILABLE_SCRIPTS.map((s) => ({
			value: s.value,
			label: s.label,
			hint: s.hint,
		})),
		required: false,
		stage: 'scripts_selection',
		telemetry: cliContext.telemetry,
	});

	if (selected === undefined) {
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
	const result = await promptConfirm({
		cancel: 'silent',
		message: `Install dependencies (${depList}) with ${packageManager}?`,
		initialValue: true,
		stage: 'install_confirm',
	});

	if (result === undefined) {
		throw new PromptCancelledError('install_confirm');
	}

	return { confirmed: result };
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

	const result = await promptConfirm({
		cancel: 'silent',
		message:
			'Install c15t agent skills for AI-assisted development? (Claude, Cursor, etc.)',
		initialValue: true,
		stage: 'skills_install',
		telemetry: cliContext.telemetry,
	});

	if (result === undefined) {
		return { installed: false };
	}

	if (result) {
		try {
			const { spawn } = await import('node:child_process');

			const pmName = cliContext.packageManager.name;
			const execCommands: Record<string, string> = {
				bun: 'bunx',
				pnpm: 'pnpm dlx',
				yarn: 'yarn dlx',
				npm: 'npx',
			};
			const execCommand = execCommands[pmName] ?? 'npx';
			const [cmd, ...baseArgs] = execCommand.split(' ');
			if (!cmd) {
				cliContext.logger.warn(
					'Skills installation failed. You can install later with: npx skills add c15t/skills'
				);
				return { installed: false };
			}

			cliContext.logger.info('Installing c15t agent skills...');

			const child = spawn(cmd, [...baseArgs, 'skills', 'add', 'c15t/skills'], {
				cwd: cliContext.projectRoot,
				stdio: 'inherit',
			});

			const exitCode = await new Promise<number | null>((resolve) => {
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

		const result = await promptConfirm({
			cancel: 'silent',
			message: 'Would you like to star c15t on GitHub now?',
			initialValue: true,
			stage: 'github_star',
			telemetry: cliContext.telemetry,
		});

		if (result === undefined) {
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
