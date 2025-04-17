import { PostHog } from 'posthog-node';
import type { LogLevel } from './logger';
import crypto from 'node:crypto';
import os from 'node:os';

// Environment variable for disabling telemetry
const TELEMETRY_DISABLED_ENV = 'C15T_TELEMETRY_DISABLED';

// Event type definitions for better typing and consistency
export enum TelemetryEventName {
  // CLI Lifecycle events
  CLI_INVOKED = 'cli.invoked',
  CLI_COMPLETED = 'cli.completed',
  CLI_EXITED = 'cli.exited',
  CLI_ENVIRONMENT_DETECTED = 'cli.environment_detected',
  
  // Command events
  COMMAND_EXECUTED = 'command.executed',
  COMMAND_SUCCEEDED = 'command.succeeded',
  COMMAND_FAILED = 'command.failed',
  COMMAND_UNKNOWN = 'command.unknown',
  
  // UI events
  INTERACTIVE_MENU_OPENED = 'ui.menu.opened',
  INTERACTIVE_MENU_EXITED = 'ui.menu.exited',
  
  // Config events
  CONFIG_LOADED = 'config.loaded',
  CONFIG_ERROR = 'config.error',
  CONFIG_UPDATED = 'config.updated',
  
  // Help and version events
  HELP_DISPLAYED = 'help.displayed',
  VERSION_DISPLAYED = 'version.displayed',
  
  // Onboarding events
  ONBOARDING_STARTED = 'onboarding.started',
  ONBOARDING_COMPLETED = 'onboarding.completed',
  ONBOARDING_EXITED = 'onboarding.exited',
  ONBOARDING_STORAGE_MODE_SELECTED = 'onboarding.storage_mode_selected',
  ONBOARDING_C15T_MODE_CONFIGURED = 'onboarding.c15t_mode_configured',
  ONBOARDING_OFFLINE_MODE_CONFIGURED = 'onboarding.offline_mode_configured',
  ONBOARDING_SELF_HOSTED_CONFIGURED = 'onboarding.self_hosted_configured',
  ONBOARDING_CUSTOM_MODE_CONFIGURED = 'onboarding.custom_mode_configured',
  ONBOARDING_DEPENDENCIES_CHOICE = 'onboarding.dependencies_choice',
  ONBOARDING_DEPENDENCIES_INSTALLED = 'onboarding.dependencies_installed',
  ONBOARDING_GITHUB_STAR = 'onboarding.github_star',
  
  // Error events
  ERROR_OCCURRED = 'error.occurred',
  
  // Migration events
  MIGRATION_STARTED = 'migration.started',
  MIGRATION_PLANNED = 'migration.planned',
  MIGRATION_EXECUTED = 'migration.executed',
  MIGRATION_COMPLETED = 'migration.completed',
  MIGRATION_FAILED = 'migration.failed',
  
  // Generate events
  GENERATE_STARTED = 'generate.started',
  GENERATE_COMPLETED = 'generate.completed',
  GENERATE_FAILED = 'generate.failed'
}

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
  private apiKey = ''; // Replace with actual PostHog API key in production

  /**
   * Creates a new telemetry instance
   * 
   * @param options - Configuration options for telemetry
   */
  constructor(options?: TelemetryOptions) {
    // Check if telemetry is disabled via environment variable
    const envDisabled = process.env[TELEMETRY_DISABLED_ENV] === '1' ||
                        process.env[TELEMETRY_DISABLED_ENV]?.toLowerCase() === 'true';
    
    // Initialize state based on options or defaults
    this.disabled = options?.disabled ?? envDisabled ?? false;
    this.defaultProperties = options?.defaultProperties ?? {};
    
    // Generate a stable anonymous ID based on machine info
    // We're not collecting any personal info here
    this.distinctId = this.generateAnonymousId();
    
    if (!this.disabled) {
      this.initClient(options?.client);
    }
  }

  /**
   * Track a command execution
   * 
   * @param eventName - The event name to track
   * @param command - The command being executed
   * @param args - Command arguments
   * @param flags - Command flags
   */
  trackEvent(
    eventName: TelemetryEventName,
    properties: Record<string, string | number | boolean | undefined> = {}
  ): void {
    if (this.disabled || !this.client) {
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

    this.client.capture({
      distinctId: this.distinctId,
      event: eventName,
      properties: {
        ...this.defaultProperties,
        ...safeProperties,
        timestamp: new Date().toISOString(),
      }
    });
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
      flagsData: JSON.stringify(safeFlags)
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
      this.client.debug(true);
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
   * Initialize the PostHog client
   * 
   * @param customClient - Optional custom PostHog client
   */
  private initClient(customClient?: PostHog): void {
    if (customClient) {
      this.client = customClient;
    } else {
      this.client = new PostHog(this.apiKey, {
        host: 'https://eu.i.posthog.com',
        flushInterval: 0, // Send events immediately in CLI context
      });
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