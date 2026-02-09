/**
 * Telemetry module for the c15t CLI
 *
 * Provides anonymous usage tracking to help improve the CLI.
 * Respects user preferences and can be disabled via --no-telemetry flag
 * or C15T_TELEMETRY_DISABLED environment variable.
 */

import crypto from 'node:crypto';
import os from 'node:os';
import { PostHog } from 'posthog-node';
import { ENV_VARS } from '../constants';
import type { CliLogger, Telemetry } from '../types';

// --- Event Names ---
export const TelemetryEventName = {
	// CLI Lifecycle
	CLI_INVOKED: 'cli.invoked',
	CLI_COMPLETED: 'cli.completed',
	CLI_EXITED: 'cli.exited',
	CLI_ENVIRONMENT_DETECTED: 'cli.environment_detected',

	// Commands
	COMMAND_EXECUTED: 'command.executed',
	COMMAND_SUCCEEDED: 'command.succeeded',
	COMMAND_FAILED: 'command.failed',
	COMMAND_UNKNOWN: 'command.unknown',

	// UI
	INTERACTIVE_MENU_OPENED: 'ui.menu.opened',
	INTERACTIVE_MENU_EXITED: 'ui.menu.exited',

	// Auth
	AUTH_LOGIN_STARTED: 'auth.login.started',
	AUTH_LOGIN_SUCCEEDED: 'auth.login.succeeded',
	AUTH_LOGIN_FAILED: 'auth.login.failed',
	AUTH_LOGOUT: 'auth.logout',

	// Config
	CONFIG_LOADED: 'config.loaded',
	CONFIG_ERROR: 'config.error',
	CONFIG_UPDATED: 'config.updated',

	// Help/Version
	HELP_DISPLAYED: 'help.displayed',
	VERSION_DISPLAYED: 'version.displayed',

	// Onboarding
	ONBOARDING_STARTED: 'onboarding.started',
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

	// Instances
	INSTANCES_LISTED: 'instances.listed',
	INSTANCE_SELECTED: 'instance.selected',
	INSTANCE_CREATED: 'instance.created',

	// Errors
	ERROR_OCCURRED: 'error.occurred',

	// Migrations
	MIGRATION_STARTED: 'migration.started',
	MIGRATION_PLANNED: 'migration.planned',
	MIGRATION_EXECUTED: 'migration.executed',
	MIGRATION_COMPLETED: 'migration.completed',
	MIGRATION_FAILED: 'migration.failed',

	// Generate
	GENERATE_STARTED: 'generate.started',
	GENERATE_COMPLETED: 'generate.completed',
	GENERATE_FAILED: 'generate.failed',

	// Self-host
	SELF_HOST_STARTED: 'self-host.started',
	SELF_HOST_COMPLETED: 'self-host.completed',
	SELF_HOST_FAILED: 'self-host.failed',
} as const;

export type TelemetryEventNameType =
	(typeof TelemetryEventName)[keyof typeof TelemetryEventName];

// --- Options ---
export interface TelemetryOptions {
	/** Custom PostHog client instance */
	client?: PostHog;
	/** Disable telemetry */
	disabled?: boolean;
	/** Enable debug mode */
	debug?: boolean;
	/** Default properties for all events */
	defaultProperties?: Record<string, string | number | boolean>;
	/** Logger instance */
	logger?: CliLogger;
}

// --- Telemetry Implementation ---
class TelemetryImpl implements Telemetry {
	private client: PostHog | null = null;
	private disabled: boolean;
	private defaultProperties: Record<string, string | number | boolean>;
	private distinctId: string;
	private apiKey = 'phc_ViY5LtTmh4kqoumXZB2olPFoTz4AbbDfrogNgFi1MH3';
	private debug: boolean;
	private logger?: CliLogger;

	constructor(options?: TelemetryOptions) {
		// Check if telemetry is disabled via environment
		const envDisabled =
			process.env[ENV_VARS.TELEMETRY_DISABLED] === '1' ||
			process.env[ENV_VARS.TELEMETRY_DISABLED]?.toLowerCase() === 'true';

		const hasValidApiKey = !!(this.apiKey && this.apiKey.trim() !== '');

		this.disabled = options?.disabled ?? envDisabled ?? !hasValidApiKey;
		this.defaultProperties = options?.defaultProperties ?? {};
		this.logger = options?.logger;
		this.debug = options?.debug ?? false;
		this.distinctId = this.generateAnonymousId();

		if (!this.disabled) {
			try {
				this.initClient(options?.client);
			} catch (error) {
				this.disabled = true;
				this.logDebug('Telemetry disabled due to initialization error:', error);
			}
		}
	}

	trackEvent(
		eventName: string,
		properties: Record<string, string | number | boolean | undefined> = {}
	): void {
		if (this.disabled || !this.client) {
			if (this.debug) {
				this.logDebug(`Event skipped (${eventName}): Telemetry disabled`);
			}
			return;
		}

		try {
			// Filter out sensitive and undefined values
			const safeProperties = this.filterProperties(properties);

			if (this.debug) {
				this.logDebug(`Sending event: ${eventName}`);
			}

			this.client.capture({
				distinctId: this.distinctId,
				event: eventName,
				properties: {
					...this.defaultProperties,
					...safeProperties,
					timestamp: new Date().toISOString(),
				},
			});

			this.client.flush();
		} catch (error) {
			if (this.debug) {
				this.logDebug(`Error sending event ${eventName}:`, error);
			}
		}
	}

	trackCommand(
		command: string,
		args: string[] = [],
		flags: Record<string, string | number | boolean | undefined> = {}
	): void {
		if (this.disabled || !this.client) {
			return;
		}

		const safeFlags = this.filterProperties(flags);

		this.trackEvent(TelemetryEventName.COMMAND_EXECUTED, {
			command,
			args: args.join(' '),
			flagsData: JSON.stringify(safeFlags),
		});
	}

	trackError(error: Error, command?: string): void {
		if (this.disabled || !this.client) {
			return;
		}

		this.trackEvent(TelemetryEventName.ERROR_OCCURRED, {
			command,
			error: error.message,
			errorName: error.name,
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
		});
	}

	flushSync(): void {
		if (this.disabled || !this.client) {
			return;
		}

		try {
			this.client.flush();
			if (this.debug) {
				this.logDebug('Manually flushed telemetry events');
			}
		} catch (error) {
			if (this.debug) {
				this.logDebug('Error flushing telemetry:', error);
			}
		}
	}

	async shutdown(): Promise<void> {
		if (this.client) {
			await this.client.shutdown();
			this.client = null;
		}
	}

	isDisabled(): boolean {
		return this.disabled;
	}

	disable(): void {
		this.disabled = true;
	}

	enable(): void {
		this.disabled = false;
		if (!this.client) {
			this.initClient();
		}
	}

	setLogger(logger: CliLogger): void {
		this.logger = logger;
	}

	private filterProperties(
		properties: Record<string, string | number | boolean | undefined>
	): Record<string, string | number | boolean> {
		const safe: Record<string, string | number | boolean> = {};

		for (const [key, value] of Object.entries(properties)) {
			// Filter out sensitive keys and undefined values
			if (
				key !== 'config' &&
				key !== 'token' &&
				key !== 'password' &&
				value !== undefined
			) {
				safe[key] = value;
			}
		}

		return safe;
	}

	private initClient(customClient?: PostHog): void {
		if (customClient) {
			this.client = customClient;
			if (this.debug) {
				this.logDebug('Using custom PostHog client');
			}
			return;
		}

		if (!this.apiKey || this.apiKey.trim() === '') {
			this.disabled = true;
			this.logDebug('Telemetry disabled: No API key');
			return;
		}

		try {
			this.client = new PostHog(this.apiKey, {
				host: 'https://eu.i.posthog.com',
				flushInterval: 0,
				flushAt: 1,
				requestTimeout: 3000,
			});

			if (this.debug) {
				this.logDebug('PostHog client initialized');
			}
		} catch (error) {
			this.disabled = true;
			this.logDebug('Telemetry initialization failed:', error);

			// Try fallback initialization
			try {
				this.client = new PostHog(this.apiKey);
				this.disabled = false;
				if (this.debug) {
					this.logDebug('PostHog client initialized (fallback)');
				}
			} catch (fallbackError) {
				this.logDebug('Fallback initialization failed:', fallbackError);
			}
		}
	}

	private generateAnonymousId(): string {
		return crypto
			.createHash('sha256')
			.update(os.hostname() + os.platform() + os.arch() + os.totalmem())
			.digest('hex');
	}

	private logDebug(message: string, ...args: unknown[]): void {
		if (this.logger) {
			this.logger.debug(message, ...args);
		} else if (this.debug) {
			console.debug(message, ...args);
		}
	}
}

// --- Factory ---

/**
 * Create a telemetry instance
 */
export function createTelemetry(options?: TelemetryOptions): Telemetry {
	return new TelemetryImpl(options);
}

/**
 * Create a disabled telemetry instance (for testing)
 */
export function createDisabledTelemetry(): Telemetry {
	return new TelemetryImpl({ disabled: true });
}
