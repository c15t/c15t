import os from 'node:os';
import path from 'node:path';
import type { Telemetry, TelemetryOptions } from 'hexbus';
import { ENV_VARS, PATHS, URLS } from '../constants';

export const TelemetryEventName = {
	// CLI Lifecycle events
	CLI_INVOKED: 'cli.invoked',
	CLI_COMPLETED: 'cli.completed',
	CLI_EXITED: 'cli.exited',
	CLI_ENVIRONMENT_DETECTED: 'cli.environment_detected',

	// Command events
	COMMAND_EXECUTED: 'command.executed',
	COMMAND_SUCCEEDED: 'command.succeeded',
	COMMAND_FAILED: 'command.failed',
	COMMAND_UNKNOWN: 'command.unknown',

	// UI events
	INTERACTIVE_MENU_OPENED: 'ui.menu.opened',
	INTERACTIVE_MENU_EXITED: 'ui.menu.exited',

	// Config events
	CONFIG_LOADED: 'config.loaded',
	CONFIG_ERROR: 'config.error',
	CONFIG_UPDATED: 'config.updated',

	// Help and version events
	HELP_DISPLAYED: 'help.displayed',
	VERSION_DISPLAYED: 'version.displayed',

	// Onboarding events
	ONBOARDING_STARTED: 'onboarding.started',
	ONBOARDING_STAGE: 'onboarding.stage',
	ONBOARDING_COMPLETED: 'onboarding.completed',
	ONBOARDING_EXITED: 'onboarding.exited',
	ONBOARDING_STORAGE_MODE_SELECTED: 'onboarding.storage_mode_selected',
	ONBOARDING_C15T_MODE_CONFIGURED: 'onboarding.c15t_mode_configured',
	ONBOARDING_OFFLINE_MODE_CONFIGURED: 'onboarding.offline_mode_configured',
	ONBOARDING_SELF_HOSTED_CONFIGURED: 'onboarding.self_hosted_configured',
	ONBOARDING_CUSTOM_MODE_CONFIGURED: 'onboarding.custom_mode_configured',
	ONBOARDING_DEPENDENCIES_CHOICE: 'onboarding.dependencies_choice',
	ONBOARDING_DEPENDENCIES_INSTALLED: 'onboarding.dependencies_installed',
	ONBOARDING_GITHUB_STAR: 'onboarding.github_star',

	// Auth events
	AUTH_LOGIN_STARTED: 'auth.login.started',
	AUTH_LOGIN_SUCCEEDED: 'auth.login.succeeded',
	AUTH_LOGIN_FAILED: 'auth.login.failed',
	AUTH_LOGOUT: 'auth.logout',

	// Hosted project events
	PROJECTS_LISTED: 'projects.listed',
	PROJECT_SELECTED: 'project.selected',
	PROJECT_CREATED: 'project.created',

	// Error events
	ERROR_OCCURRED: 'error.occurred',

	// Migration events
	MIGRATION_STARTED: 'migration.started',
	MIGRATION_PLANNED: 'migration.planned',
	MIGRATION_EXECUTED: 'migration.executed',
	MIGRATION_COMPLETED: 'migration.completed',
	MIGRATION_FAILED: 'migration.failed',

	// Generate events
	GENERATE_STARTED: 'generate.started',
	GENERATE_COMPLETED: 'generate.completed',
	GENERATE_FAILED: 'generate.failed',

	// Self-host events
	SELF_HOST_STARTED: 'self-host.started',
	SELF_HOST_COMPLETED: 'self-host.completed',
	SELF_HOST_FAILED: 'self-host.failed',

	// State machine events
	CLI_STATE_TRANSITION: 'cli.state.transition',
	CLI_STATE_ERROR: 'cli.state.error',
	CLI_STATE_CANCELLED: 'cli.state.cancelled',
	CLI_STATE_COMPLETE: 'cli.state.complete',
} as const;

export type TelemetryEventName =
	(typeof TelemetryEventName)[keyof typeof TelemetryEventName];

export const HEXBUS_EVENT_NAME_ALIASES: Record<string, TelemetryEventName> = {
	cli_completed: TelemetryEventName.CLI_COMPLETED,
	cli_environment_detected: TelemetryEventName.CLI_ENVIRONMENT_DETECTED,
	cli_invoked: TelemetryEventName.CLI_INVOKED,
	command_failed: TelemetryEventName.COMMAND_FAILED,
	command_invoked: TelemetryEventName.COMMAND_EXECUTED,
	command_succeeded: TelemetryEventName.COMMAND_SUCCEEDED,
	command_unknown: TelemetryEventName.COMMAND_UNKNOWN,
	error_occurred: TelemetryEventName.ERROR_OCCURRED,
	help_displayed: TelemetryEventName.HELP_DISPLAYED,
	interactive_menu_exited: TelemetryEventName.INTERACTIVE_MENU_EXITED,
	interactive_menu_opened: TelemetryEventName.INTERACTIVE_MENU_OPENED,
	version_displayed: TelemetryEventName.VERSION_DISPLAYED,
};

export interface C15TTelemetryOptions {
	disabled?: boolean;
	debug?: boolean;
	defaultProperties?: Record<string, unknown>;
	endpoint?: string;
	fetch?: typeof fetch;
	headers?: Record<string, string>;
}

function buildHeaders(
	overrides?: Record<string, string>
): Record<string, string> {
	const writeKey = process.env[ENV_VARS.TELEMETRY_WRITE_KEY];
	const orgId = process.env[ENV_VARS.TELEMETRY_ORG_ID];

	return {
		...(writeKey ? { Authorization: `Bearer ${writeKey}` } : {}),
		...(orgId ? { 'X-Axiom-Org-Id': orgId } : {}),
		...overrides,
	};
}

export function createC15TTelemetryOptions(
	options: C15TTelemetryOptions = {}
): TelemetryOptions {
	const envDisabled =
		process.env[ENV_VARS.TELEMETRY_DISABLED] === '1' ||
		process.env[ENV_VARS.TELEMETRY_DISABLED]?.toLowerCase() === 'true';

	return {
		appName: 'c15t',
		debug: options.debug,
		defaultProperties: options.defaultProperties,
		disabled: options.disabled ?? envDisabled,
		endpoint:
			options.endpoint ??
			process.env[ENV_VARS.TELEMETRY_ENDPOINT] ??
			URLS.TELEMETRY,
		envVarPrefix: 'C15T',
		eventNameMap: HEXBUS_EVENT_NAME_ALIASES,
		fetch: options.fetch,
		headers: buildHeaders(options.headers),
		queueFileName: PATHS.TELEMETRY_QUEUE_FILE,
		source: 'c15t-cli',
		stateFileName: PATHS.TELEMETRY_STATE_FILE,
		storageDir: path.join(os.homedir(), PATHS.CONFIG_DIR),
	};
}

export type { Telemetry };
