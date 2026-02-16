/**
 * Prompts actor for the generate state machine
 *
 * Wraps @clack/prompts for use as XState actors with proper cancellation handling.
 */

import * as p from '@clack/prompts';
import { fromCallback, fromPromise } from 'xstate';
import { getDevToolsOption } from '~/commands/generate/options/shared/dev-tools';
import { getSSROption } from '~/commands/generate/options/shared/ssr';
import type { StorageMode } from '~/constants';
import type { CliContext } from '~/context/types';
import type { ExpandedTheme, GenerateMachineContext, UIStyle } from '../types';

/**
 * Check if a value is a cancel symbol
 */
function isCancel(value: unknown): value is symbol {
	return p.isCancel(value);
}

/**
 * Cancelled error for prompts
 */
export class PromptCancelledError extends Error {
	constructor(stage: string) {
		super(`Prompt cancelled at stage: ${stage}`);
		this.name = 'PromptCancelledError';
	}
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
	const result = await p.select<string | symbol | undefined>({
		message: 'How would you like to store consent decisions?',
		initialValue: input.initialMode ?? 'c15t',
		options: [
			{
				value: 'c15t',
				label: 'Hosted c15t (consent.io)',
				hint: 'Recommended: Fully managed service',
			},
			{
				value: 'offline',
				label: 'Offline Mode',
				hint: 'Store in browser, no backend needed',
			},
			{
				value: 'self-hosted',
				label: 'Self-Hosted',
				hint: 'Run your own c15t backend',
			},
			{
				value: 'custom',
				label: 'Custom Implementation',
				hint: 'Full control over storage logic',
			},
		],
	});

	if (isCancel(result)) {
		throw new PromptCancelledError('mode_selection');
	}

	return { mode: result as StorageMode };
});

// --- Account Creation Prompt (c15t mode) ---

export interface AccountCreationInput {
	cliContext: CliContext;
}

export interface AccountCreationOutput {
	needsAccount: boolean;
	browserOpened: boolean;
}

export const accountCreationActor = fromPromise<
	AccountCreationOutput,
	AccountCreationInput
>(async ({ input }) => {
	const { cliContext } = input;

	const needsAccount = await p.confirm({
		message: 'Do you need to create a consent.io account?',
		initialValue: true,
	});

	if (isCancel(needsAccount)) {
		throw new PromptCancelledError('account_creation');
	}

	if (!needsAccount) {
		return { needsAccount: false, browserOpened: false };
	}

	p.note(
		`We'll open your browser to create a consent.io account and set up your instance.\nFollow these steps:\n1. Sign up for a consent.io account\n2. Create a new instance in the dashboard\n3. Configure your trusted origins (domains that can connect)\n4. Copy the provided backendURL (e.g., https://your-instance.c15t.dev)`,
		'consent.io Setup'
	);

	const shouldOpen = await p.confirm({
		message: 'Open browser to sign up for consent.io?',
		initialValue: true,
	});

	if (isCancel(shouldOpen)) {
		throw new PromptCancelledError('browser_open');
	}

	let browserOpened = false;
	if (shouldOpen) {
		try {
			const open = (await import('open')).default;
			await open('https://consent.io/dashboard/register?ref=cli');
			browserOpened = true;

			const enterPressed = await p.text({
				message:
					'Press Enter once you have created your instance and have the backendURL',
			});

			if (isCancel(enterPressed)) {
				throw new PromptCancelledError('url_input_wait');
			}
		} catch (error) {
			if (error instanceof PromptCancelledError) {
				throw error;
			}
			cliContext.logger.warn(
				'Failed to open browser automatically. Please visit https://consent.io/dashboard/register manually.'
			);
		}
	}

	return { needsAccount: true, browserOpened };
});

// --- Backend URL Prompt ---

export interface BackendURLInput {
	initialURL?: string;
	isC15tMode: boolean;
}

export interface BackendURLOutput {
	url: string;
}

export const backendURLActor = fromPromise<BackendURLOutput, BackendURLInput>(
	async ({ input }) => {
		const { initialURL, isC15tMode } = input;

		const placeholder = isC15tMode
			? 'https://your-instance.c15t.dev'
			: 'https://your-backend.example.com/api/c15t';

		const result = await p.text({
			message: isC15tMode
				? 'Enter your consent.io instance URL:'
				: 'Enter your self-hosted backend URL:',
			placeholder,
			initialValue: initialURL,
			validate: (value) => {
				if (!value || value === '') {
					return 'URL is required';
				}
				try {
					const url = new URL(value);
					if (isC15tMode && !url.hostname.endsWith('.c15t.dev')) {
						return 'Please enter a valid *.c15t.dev URL';
					}
				} catch {
					return 'Please enter a valid URL';
				}
			},
		});

		if (isCancel(result)) {
			throw new PromptCancelledError('backend_url');
		}

		return { url: result as string };
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
		message:
			'Store the backendURL in a .env file? (Recommended, URL is public)',
		initialValue: true,
	});

	if (isCancel(useEnvFile)) {
		throw new PromptCancelledError('env_file');
	}

	// Next.js proxy prompt (only for Next.js projects)
	let proxyNextjs = false;
	if (cliContext.framework.pkg === '@c15t/nextjs') {
		cliContext.logger.info(
			'Learn more about Next.js Rewrites: https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites'
		);

		const proxyResult = await p.confirm({
			message:
				'Proxy requests to your instance with Next.js Rewrites? (Recommended)',
			initialValue: true,
		});

		if (isCancel(proxyResult)) {
			throw new PromptCancelledError('proxy_nextjs');
		}

		proxyNextjs = proxyResult as boolean;
	}

	return {
		useEnvFile: useEnvFile as boolean,
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

		const styleResult = await p.select({
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
		});

		if (isCancel(styleResult)) {
			throw new PromptCancelledError('ui_style');
		}

		uiStyle = styleResult as UIStyle;

		// Theme prompt (both prebuilt and expanded)
		const themeResult = await p.select({
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
		});

		if (isCancel(themeResult)) {
			throw new PromptCancelledError('expanded_theme');
		}

		expandedTheme = themeResult as ExpandedTheme;
	}

	// React: UI style + theme (no SSR)
	if (pkg === '@c15t/react') {
		cliContext.logger.info(
			'Choose how you want your consent UI components generated.'
		);

		const styleResult = await p.select({
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
		});

		if (isCancel(styleResult)) {
			throw new PromptCancelledError('ui_style');
		}

		uiStyle = styleResult as UIStyle;

		// Theme prompt (both prebuilt and expanded)
		const reactThemeResult = await p.select({
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
		});

		if (isCancel(reactThemeResult)) {
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

	const addScripts = await p.confirm({
		message: 'Add @c15t/scripts for third-party script management?',
		initialValue: true,
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

	const selected = await p.multiselect({
		message: 'Which scripts do you want to add?',
		options: AVAILABLE_SCRIPTS.map((s) => ({
			value: s.value,
			label: s.label,
			hint: s.hint,
		})),
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
		message: `Install dependencies (${depList}) with ${packageManager}?`,
		initialValue: true,
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
		message:
			'Install c15t agent skills for AI-assisted development? (Claude, Cursor, etc.)',
		initialValue: true,
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
				pnpm: 'pnpm dlx',
				yarn: 'yarn dlx',
				npm: 'npx',
			};
			const execCommand = execCommands[pmName] ?? 'npx';
			const [cmd, ...baseArgs] = execCommand.split(' ');

			cliContext.logger.info('Installing c15t agent skills...');

			const child = spawn(cmd!, [...baseArgs, 'skills', 'add', 'c15t/skills'], {
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

		const result = await p.confirm({
			message: 'Would you like to star c15t on GitHub now?',
			initialValue: true,
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
