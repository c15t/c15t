#!/usr/bin/env node

/**
 * c15t CLI - Consent Management Made Easy
 *
 * Main entry point for the CLI. Handles:
 * - Command routing
 * - Context creation
 * - Telemetry
 * - Help/version display
 */

import { readFileSync } from 'node:fs';
import 'dotenv/config';
import {
	color,
	type CliCommand as HexbusCliCommand,
	type PackageInfo as HexbusPackageInfo,
	parseCliArgs,
	runCli,
} from 'hexbus';
import open from 'open';
import {
	authStatusCommand,
	loginCommand,
	logoutCommand,
} from './commands/auth';
import { codemodsCommand } from './commands/codemods';
import { generate, generateCommand } from './commands/generate';
import { instancesAliasCommand, projectsCommand } from './commands/instances';
import { selfHostCommand } from './commands/self-host';
import { installSkills } from './commands/skills';

// Import from new v2 modules
import { URLS } from './constants';

// Import context creator and types
import { createCliContext } from './context/creator';
import { globalFlags } from './context/parser';
import type {
	AvailablePackages,
	CliCommand,
	CliContext,
} from './context/types';
import { formatLogMessage } from './utils/logger';
import { createC15TTelemetryOptions } from './utils/telemetry';

/**
 * CLI package metadata read from `@c15t/cli`'s package manifest.
 *
 * @property name - The package name string.
 * @property version - The package semver string.
 */
interface CliPackageInfo extends HexbusPackageInfo {
	name: string;
	version: string;
}

/**
 * Reads package metadata for the running `@c15t/cli` package.
 *
 * Reads the package manifest adjacent to the built CLI entry point and returns
 * the package name/version used by Hexbus for help and version output. Missing,
 * unreadable, or malformed package data falls back to `@c15t/cli` and
 * `unknown`; missing individual fields fall back independently.
 *
 * @returns The resolved CLI package metadata.
 */
function readOwnPackageInfo(): CliPackageInfo {
	try {
		const packageJsonUrl = new URL('../package.json', import.meta.url);
		const content = readFileSync(packageJsonUrl, 'utf-8');
		const parsed = JSON.parse(content) as Record<string, unknown>;
		let name = '@c15t/cli';
		if (typeof parsed.name === 'string') {
			name = parsed.name;
		}
		let version = 'unknown';
		if (typeof parsed.version === 'string') {
			version = parsed.version;
		}
		return {
			name,
			version,
		};
	} catch (error) {
		console.warn(
			'Failed to read/parse package.json for `@c15t/cli`; using fallback package metadata.',
			error
		);
		return {
			name: '@c15t/cli',
			version: 'unknown',
		};
	}
}

// Define commands (using types from context)
const commands: CliCommand[] = [
	{
		name: 'setup',
		label: 'Setup (Recommended)',
		hint: 'Set up c15t in your project',
		description: 'Set up c15t in your project.',
		action: (context) => generate(context),
	},
	generateCommand,
	codemodsCommand,
	{
		name: 'skills',
		label: 'Skills',
		hint: 'Install c15t agent skills for AI tooling',
		description:
			'Install c15t skills for AI-assisted development (Claude, Cursor, etc.)',
		action: (context) => installSkills(context),
	},
	{
		name: 'docs',
		label: 'Docs',
		hint: 'Open c15t documentation',
		description: 'Open the c15t documentation in your browser.',
		action: async (context) => {
			const { logger } = context;
			await open(`${URLS.DOCS}?ref=cli`);
			logger.success('Documentation opened in your browser.');
		},
	},
	{
		name: 'changelog',
		label: 'Changelog',
		hint: 'Open the latest releases and changes',
		description: 'Open the c15t changelog in your browser.',
		action: async (context) => {
			const { logger } = context;
			await open(URLS.CHANGELOG);
			logger.success('Changelog opened in your browser.');
		},
	},
	{
		...selfHostCommand,
	},
	{
		name: 'github',
		label: 'GitHub',
		hint: 'Star us on GitHub',
		description: 'Open our GitHub repository to give us a star.',
		action: async (context) => {
			const { logger } = context;

			// Show the same messaging as in onboarding.ts
			logger.note(
				`We're building c15t as an ${color.bold('open source')} project to make consent management more accessible.\nIf you find this useful, we'd really appreciate a GitHub star - it helps others discover the project!`,
				'Star Us on GitHub'
			);

			await open(URLS.GITHUB);
			logger.success('Thank you for your support!');
		},
	},
	projectsCommand,
	instancesAliasCommand,
	loginCommand,
	logoutCommand,
	authStatusCommand,
];

function isCommandToken(value: string | undefined): value is string {
	return typeof value === 'string' && !value.startsWith('-');
}

function findUnknownCommandName(rawArgs: string[]): string | undefined {
	const parsed = parseCliArgs(
		rawArgs,
		commands as unknown as HexbusCliCommand[],
		globalFlags
	);

	if (!parsed.commandName) {
		const [firstArg] = parsed.commandArgs;
		if (isCommandToken(firstArg)) {
			return firstArg;
		}
		return undefined;
	}

	let command = commands.find((item) => item.name === parsed.commandName);
	let remainingArgs = parsed.commandArgs;

	while (command?.subcommands && command.subcommands.length > 0) {
		const [nextArg] = remainingArgs;
		if (!isCommandToken(nextArg)) {
			return undefined;
		}

		const subcommand = command.subcommands.find(
			(item) => item.name === nextArg
		);
		if (!subcommand) {
			return nextArg;
		}

		command = subcommand;
		remainingArgs = remainingArgs.slice(1);
	}

	return undefined;
}

export async function main() {
	const rawArgs = process.argv.slice(2);
	const cwd = process.cwd();
	const packageInfo = readOwnPackageInfo();

	await runCli<AvailablePackages, CliContext>({
		appName: 'c15t',
		commands,
		context: {
			configName: 'c15t',
			cwd,
			globalFlags,
			interactivePackageManagerDetection: true,
			packageMap: {
				core: 'c15t',
				next: '@c15t/nextjs',
				react: '@c15t/react',
			},
			telemetry: createC15TTelemetryOptions({
				defaultProperties: {
					cliVersion: packageInfo.version,
				},
			}),
		},
		help: {
			docsUrl: URLS.DOCS,
			flags: globalFlags,
		},
		hooks: {
			afterContext: async (context) => {
				const c15tContext = await createCliContext(context);
				const { logger, telemetry } = c15tContext;

				if (!telemetry.isDisabled()) {
					logger.note(
						`c15t collects anonymous usage data to help improve the CLI. 
This data is not personally identifiable and helps us prioritize features.
To disable telemetry, use the ${color.cyan('--no-telemetry')}
flag or set ${color.cyan('C15T_TELEMETRY_DISABLED=1')} in your environment.`,
						`${formatLogMessage('info', 'Telemetry Notice')}`
					);
				}

				return c15tContext;
			},
			beforeCommand: ({ commandNames, context }) => {
				context.logger.debug('Parsed command name:', context.commandName);
				context.logger.debug(
					'Parsed argument count:',
					context.commandArgs.length
				);
				context.logger.debug(
					'Parsed global flag names:',
					Object.keys(context.flags)
				);
				context.logger.debug(
					'Config path flag provided:',
					typeof context.flags.config === 'string'
				);
				context.logger.info(`Executing command: ${commandNames.join(' ')}`);
			},
		},
		intro: {
			figletText: 'c15t',
			tagline: 'Consent management made easy.',
		},
		noCommand: {
			mode: 'interactive',
			selection: {
				exitHint: 'Close the CLI',
				exitLabel: 'Exit',
				exitValue: 'exit',
				message: formatLogMessage(
					'info',
					'Which command would you like to run?'
				),
			},
		},
		packageInfo,
		rawArgs,
	});

	if (findUnknownCommandName(rawArgs) && process.exitCode === undefined) {
		process.exitCode = 1;
	}
}

main();
