import crypto from 'node:crypto';
import os from 'node:os';
import type { Logger } from '@doubletie/logger';
import { PostHog } from 'posthog-node';
import type { LogLevel } from './logger';

// Environment variable for disabling telemetry
const TELEMETRY_DISABLED_ENV = 'C15T_TELEMETRY_DISABLED';

// Event type definitions for better typing and consistency
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
} as const;

export type TelemetryEventName =
	(typeof TelemetryEventName)[keyof typeof TelemetryEventName];

export interface TelemetryOptions {
	/**
	 * Custom PostHog instance to use instead of the default
	 */
	client?: PostHog;

	/**
	 * Whether telemetry should be disabled
	 */
	disabled?: boolean;

	/**
	 * Default properties to add to all telemetry events
	 */
	defaultProperties?: Record<string, string | number | boolean>;

	/**
	 * Logger instance to use for logging telemetry events
	 */
	logger?: Logger;
}

/**
 * Manages telemetry for the CLI
 *
 * The Telemetry class provides methods to track CLI usage and errors
 * in a privacy-preserving way.
 */
export class Telemetry {
	private client: PostHog | null = null;
	private disabled: boolean;
	private defaultProperties: Record<string, string | number | boolean>;
	private distinctId: string;
	private apiKey = 'phc_ViY5LtTmh4kqoumXZB2olPFoTz4AbbDfrogNgFi1MH3';
	private debug = false;
	private logger: Logger | undefined;

	/**
	 * Creates a new telemetry instance
	 *
	 * @param options - Configuration options for telemetry
	 */
	constructor(options?: TelemetryOptions) {
		// Check if telemetry is disabled via environment variable
		const envDisabled =
			process.env[TELEMETRY_DISABLED_ENV] === '1' ||
			process.env[TELEMETRY_DISABLED_ENV]?.toLowerCase() === 'true';

		// Check if we have a valid API key
		const hasValidApiKey = !!(this.apiKey && this.apiKey.trim() !== '');

		// Initialize state based on options or defaults
		// Disable telemetry if explicitly disabled or if no API key is available
		this.disabled = options?.disabled ?? envDisabled ?? !hasValidApiKey;
		this.defaultProperties = options?.defaultProperties ?? {};
		this.logger = options?.logger;

		// Generate a stable anonymous ID based on machine info
		// We're not collecting any personal info here
		this.distinctId = this.generateAnonymousId();

		if (!this.disabled) {
			this.initClient(options?.client);
		} else if (!hasValidApiKey) {
			this.logDebug('Telemetry disabled: No API key provided');
		}
	}

	/**
	 * Track a telemetry event synchronously
	 *
	 * This method ensures the event is sent before returning
	 *
	 * @param eventName - The event name to track
	 * @param properties - Properties to include with the event
	 */
	trackEventSync(
		eventName: TelemetryEventName,
		properties: Record<string, string | number | boolean | undefined> = {}
	): void {
		if (this.disabled || !this.client) {
			if (this.debug) {
				this.logDebug('Telemetry disabled or client not initialized');
			}
			return;
		}

		// Filter out any sensitive data and undefined values from properties
		const safeProperties: Record<string, string | number | boolean> = {};

		// Copy only non-sensitive properties and filter out undefined values
		for (const [key, value] of Object.entries(properties)) {
			if (key !== 'config' && value !== undefined) {
				safeProperties[key] = value;
			}
		}

		if (this.debug) {
			this.logDebug(`Sending telemetry event: ${eventName}`);
		}

		try {
			// Fall back to regular capture with immediate flush
			this.client.capture({
				distinctId: this.distinctId,
				event: eventName,
				properties: {
					...this.defaultProperties,
					...safeProperties,
					timestamp: new Date().toISOString(),
				},
			});

			// Force a flush and wait a bit to ensure it completes
			this.client.flush();

			// Log debug info
			if (this.debug) {
				this.logDebug(`Flushed telemetry event: ${eventName}`);
			}
		} catch (error) {
			if (this.debug) {
				this.logDebug(`Error sending telemetry: ${error}`);
			}
		}
	}

	/**
	 * Track a telemetry event
	 *
	 * @param eventName - The event name to track
	 * @param properties - Properties to include with the event
	 */
	trackEvent(
		eventName: TelemetryEventName,
		properties: Record<string, string | number | boolean | undefined> = {}
	): void {
		// Just delegate to the sync version for reliability
		this.trackEventSync(eventName, properties);
	}

	/**
	 * Track a command execution
	 *
	 * @param command - The command being executed
	 * @param args - Command arguments
	 * @param flags - Command flags
	 */
	trackCommand(
		command: string,
		args: string[] = [],
		flags: Record<string, string | number | boolean | undefined> = {}
	): void {
		if (this.disabled || !this.client) {
			return;
		}

		// Process flags to filter out sensitive or undefined values
		const safeFlags: Record<string, string | number | boolean> = {};
		for (const [key, value] of Object.entries(flags)) {
			if (key !== 'config' && value !== undefined) {
				safeFlags[key] = value;
			}
		}

		this.trackEvent(TelemetryEventName.COMMAND_EXECUTED, {
			command,
			args: args.join(' '),
			// Pass flags as a stringified object to avoid type error
			flagsData: JSON.stringify(safeFlags),
		});
	}

	/**
	 * Track CLI errors
	 *
	 * @param error - The error that occurred
	 * @param command - The command that was being executed when the error occurred
	 */
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

	/**
	 * Set log level for telemetry client
	 *
	 * @param level - The log level to set
	 */
	setLogLevel(level: LogLevel): void {
		if (this.client && level === 'debug') {
			this.debug = true;
			this.client.debug(true);
			this.logDebug('Telemetry debug mode enabled');
		}
	}

	/**
	 * Disable telemetry
	 */
	disable(): void {
		this.disabled = true;
	}

	/**
	 * Enable telemetry
	 */
	enable(): void {
		this.disabled = false;
		if (!this.client) {
			this.initClient();
		}
	}

	/**
	 * Check if telemetry is disabled
	 *
	 * @returns Whether telemetry is disabled
	 */
	isDisabled(): boolean {
		return this.disabled;
	}

	/**
	 * Shutdown telemetry client
	 */
	async shutdown(): Promise<void> {
		if (this.client) {
			await this.client.shutdown();
			this.client = null;
		}
	}

	/**
	 * Set the logger instance to use for logging
	 *
	 * @param logger - The logger instance to use
	 */
	setLogger(logger: Logger): void {
		this.logger = logger;
	}

	/**
	 * Log a debug message using the configured logger or console.debug as fallback
	 *
	 * @param message - The message to log
	 * @param args - Additional arguments to log
	 */
	private logDebug(message: string, ...args: unknown[]): void {
		if (this.logger) {
			this.logger.debug(message, ...args);
		} else {
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.debug(message, ...args);
		}
	}

	/**
	 * Initialize the PostHog client
	 *
	 * @param customClient - Optional custom PostHog client
	 */
	private initClient(customClient?: PostHog): void {
		if (customClient) {
			this.client = customClient;
			if (this.debug) {
				this.logDebug('Using custom PostHog client');
			}
		} else {
			// Skip telemetry initialization if no API key is provided
			if (!this.apiKey || this.apiKey.trim() === '') {
				this.disabled = true;
				this.logDebug('Telemetry disabled: No API key provided');
				return;
			}

			// Capture initialization start time for diagnostics
			const startTime = Date.now();

			try {
				// More robust configuration
				const clientConfig = {
					host: 'https://eu.i.posthog.com',
					flushInterval: 0, // Send events immediately in CLI context
					flushAt: 1, // Flush after a single event
					// PostHog expects project API keys with phc_ prefix
					// Don't set personalApiKey since we're using a project key
					requestTimeout: 3000, // Short timeout for CLI context
				};

				if (this.debug) {
					this.logDebug(
						'Initializing PostHog client with config:',
						JSON.stringify(clientConfig)
					);
				}

				this.client = new PostHog(this.apiKey, clientConfig);

				const initTime = Date.now() - startTime;
				if (this.debug) {
					this.logDebug('PostHog client initialized in', initTime, 'ms');
				}
			} catch (error) {
				// If PostHog initialization fails, disable telemetry
				this.disabled = true;

				// More detailed error logging
				const errorDetails =
					error instanceof Error
						? { message: error.message, name: error.name, stack: error.stack }
						: { rawError: String(error) };

				if (this.debug) {
					this.logDebug(
						'Telemetry disabled due to initialization error:',
						JSON.stringify(errorDetails, null, 2)
					);
				}

				// Try alternative initialization without options as fallback
				try {
					if (this.debug) {
						this.logDebug('Attempting fallback PostHog initialization');
					}
					this.client = new PostHog(this.apiKey);
					this.disabled = false;
					if (this.debug) {
						this.logDebug('PostHog client initialized using fallback method');
					}
				} catch (fallbackError) {
					this.logDebug(
						'Fallback initialization also failed:',
						fallbackError instanceof Error
							? fallbackError.message
							: String(fallbackError)
					);
				}
			}
		}
	}

	/**
	 * Generate an anonymous ID based on machine info
	 *
	 * @returns A hash that uniquely identifies the machine without PII
	 */
	private generateAnonymousId(): string {
		// Create a deterministic but anonymous ID
		// Create a hash of machine information that doesn't contain PII
		const machineId = crypto
			.createHash('sha256')
			.update(os.hostname() + os.platform() + os.arch() + os.totalmem())
			.digest('hex');

		return machineId;
	}

	/**
	 * Force immediate flushing of any pending telemetry events
	 *
	 * This is useful when you need to ensure events are sent before process exit
	 */
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
				this.logDebug(`Error flushing telemetry: ${error}`);
			}
		}
	}
}

/**
 * Creates a telemetry instance with sensible defaults
 *
 * @param options - Configuration options for telemetry
 * @returns A configured telemetry instance
 */
export function createTelemetry(options?: TelemetryOptions): Telemetry {
	return new Telemetry(options);
}
