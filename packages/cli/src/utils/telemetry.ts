import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createLogger, initLogger } from 'evlog';
import type { DrainContext, WideEvent } from 'evlog';
import { createDrainPipeline } from 'evlog/pipeline';
import type { DrainPipelineOptions, PipelineDrainFn } from 'evlog/pipeline';

import { ENV_VARS, PATHS, URLS } from '../constants';
import type { CliLogger } from './logger';

// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
export const TelemetryEventName = {
	AUTH_LOGIN_FAILED: 'auth.login.failed',

	// Auth events
	AUTH_LOGIN_STARTED: 'auth.login.started',
	AUTH_LOGIN_SUCCEEDED: 'auth.login.succeeded',
	AUTH_LOGOUT: 'auth.logout',
	CLI_COMPLETED: 'cli.completed',
	CLI_ENVIRONMENT_DETECTED: 'cli.environment_detected',
	CLI_EXITED: 'cli.exited',
	// CLI Lifecycle events
	CLI_INVOKED: 'cli.invoked',
	CLI_STATE_CANCELLED: 'cli.state.cancelled',
	CLI_STATE_COMPLETE: 'cli.state.complete',

	CLI_STATE_ERROR: 'cli.state.error',

	// State machine events
	CLI_STATE_TRANSITION: 'cli.state.transition',

	// Command events
	COMMAND_EXECUTED: 'command.executed',
	COMMAND_FAILED: 'command.failed',
	COMMAND_SUCCEEDED: 'command.succeeded',
	COMMAND_UNKNOWN: 'command.unknown',
	CONFIG_ERROR: 'config.error',

	// Config events
	CONFIG_LOADED: 'config.loaded',
	CONFIG_UPDATED: 'config.updated',

	// Error events
	ERROR_OCCURRED: 'error.occurred',
	GENERATE_COMPLETED: 'generate.completed',
	GENERATE_FAILED: 'generate.failed',

	// Generate events
	GENERATE_STARTED: 'generate.started',

	// Help and version events
	HELP_DISPLAYED: 'help.displayed',
	INTERACTIVE_MENU_EXITED: 'ui.menu.exited',

	// UI events
	INTERACTIVE_MENU_OPENED: 'ui.menu.opened',
	MIGRATION_COMPLETED: 'migration.completed',
	MIGRATION_EXECUTED: 'migration.executed',
	MIGRATION_FAILED: 'migration.failed',
	MIGRATION_PLANNED: 'migration.planned',

	// Migration events
	MIGRATION_STARTED: 'migration.started',
	ONBOARDING_C15T_MODE_CONFIGURED: 'onboarding.c15t_mode_configured',
	ONBOARDING_COMPLETED: 'onboarding.completed',
	ONBOARDING_CUSTOM_MODE_CONFIGURED: 'onboarding.custom_mode_configured',
	ONBOARDING_DEPENDENCIES_CHOICE: 'onboarding.dependencies_choice',
	ONBOARDING_DEPENDENCIES_INSTALLED: 'onboarding.dependencies_installed',
	ONBOARDING_EXITED: 'onboarding.exited',
	ONBOARDING_GITHUB_STAR: 'onboarding.github_star',
	ONBOARDING_OFFLINE_MODE_CONFIGURED: 'onboarding.offline_mode_configured',
	ONBOARDING_SELF_HOSTED_CONFIGURED: 'onboarding.self_hosted_configured',
	ONBOARDING_STAGE: 'onboarding.stage',

	// Onboarding events
	ONBOARDING_STARTED: 'onboarding.started',
	ONBOARDING_STORAGE_MODE_SELECTED: 'onboarding.storage_mode_selected',
	PROJECT_CREATED: 'project.created',
	PROJECT_SELECTED: 'project.selected',

	// Hosted project events
	PROJECTS_LISTED: 'projects.listed',
	SELF_HOST_COMPLETED: 'self-host.completed',
	SELF_HOST_FAILED: 'self-host.failed',

	// Self-host events
	SELF_HOST_STARTED: 'self-host.started',
	VERSION_DISPLAYED: 'version.displayed',
} as const;

export type TelemetryEventNameType =
	(typeof TelemetryEventName)[keyof typeof TelemetryEventName];

type TelemetryPrimitive = string | number | boolean | null;
interface TelemetryObject {
	[key: string]: TelemetryValue;
}
type TelemetryValue = TelemetryPrimitive | TelemetryValue[] | TelemetryObject;
type TelemetryProperties = Record<string, TelemetryValue | undefined>;

type EventLike = Record<string, unknown>;

const DEFAULT_QUEUE_LIMIT = 250;
const DEFAULT_TIMEOUT_MS = 3_000;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_BATCH_INTERVAL_MS = 1_000;
const DEFAULT_MAX_BUFFER_SIZE = 250;
const MAX_DEPTH = 5;
const MAX_ARRAY_LENGTH = 20;
const MAX_OBJECT_KEYS = 50;
const MAX_STRING_LENGTH = 500;
const RESERVED_TOP_LEVEL_KEYS = new Set([
	'event',
	'installId',
	'sessionId',
	'commandRunId',
	'sequence',
	'source',
]);
const SENSITIVE_KEY_PATTERN =
	/(?<capture1>^|[-_])(?<capture2>token|secret|password|authorization|cookie|api[-_]?key|access[-_]?token|refresh[-_]?token|config)(?<capture3>[-_]|$)/iu;
const SECRET_VALUE_PATTERN =
	/^(?<capture1>Bearer\s+[A-Za-z0-9._-]+|[A-Za-z0-9+/=_-]{80,})$/u;

export interface TelemetryOptions {
	disabled?: boolean;
	debug?: boolean;
	defaultProperties?: EventLike;
	logger?: CliLogger;
	endpoint?: string;
	headers?: Record<string, string>;
	fetch?: typeof fetch;
	storageDir?: string;
	drainOptions?: DrainPipelineOptions<DrainContext>;
}

export class Telemetry {
	private readonly endpoint: string;
	private readonly fetchImpl: typeof fetch;
	private readonly queuePath: string;
	private readonly statePath: string;
	private readonly headers: Record<string, string>;
	private readonly defaultProperties: TelemetryProperties;
	private readonly sessionId = crypto.randomUUID();
	private readonly installId: string;
	private readonly isFirstRun: boolean;
	private readonly drain: PipelineDrainFn<DrainContext>;
	private readonly storageDir: string;

	private logger: CliLogger | undefined;
	private disabled: boolean;
	private debug: boolean;
	private sequence = 0;
	private activeCommandName?: string;
	private activeCommandRunId?: string;
	private flushPromise: Promise<void> | null = null;
	private queueReplayPromise: Promise<void> = Promise.resolve();
	private queueWritePromise: Promise<void> = Promise.resolve();

	// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
	constructor(options?: TelemetryOptions) {
		const envDisabled =
			process.env[ENV_VARS.TELEMETRY_DISABLED] === '1' ||
			process.env[ENV_VARS.TELEMETRY_DISABLED]?.toLowerCase() === 'true';

		this.disabled = options?.disabled ?? envDisabled ?? false;
		this.debug = options?.debug ?? false;
		this.logger = options?.logger;
		this.defaultProperties = this.sanitizeProperties(
			options?.defaultProperties ?? {}
		);
		this.endpoint =
			options?.endpoint ??
			process.env[ENV_VARS.TELEMETRY_ENDPOINT] ??
			URLS.TELEMETRY;
		this.fetchImpl = options?.fetch ?? fetch;
		this.storageDir =
			options?.storageDir ?? path.join(os.homedir(), PATHS.CONFIG_DIR);
		this.statePath = path.join(this.storageDir, PATHS.TELEMETRY_STATE_FILE);
		this.queuePath = path.join(this.storageDir, PATHS.TELEMETRY_QUEUE_FILE);
		this.headers = this.buildHeaders(options?.headers);

		const identity = this.loadOrCreateInstallIdentity();
		this.installId = identity.installId;
		this.isFirstRun = identity.isFirstRun;

		const userDrainOptions = options?.drainOptions;
		const onDropped = userDrainOptions?.onDropped;
		const pipeline = createDrainPipeline<DrainContext>({
			batch: {
				intervalMs:
					userDrainOptions?.batch?.intervalMs ?? DEFAULT_BATCH_INTERVAL_MS,
				size: userDrainOptions?.batch?.size ?? DEFAULT_BATCH_SIZE,
			},
			maxBufferSize: userDrainOptions?.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE,
			onDropped: (events, error) => {
				onDropped?.(events, error);
				void this.persistDroppedEvents(events, error);
			},
			retry: {
				backoff: userDrainOptions?.retry?.backoff ?? 'fixed',
				initialDelayMs: userDrainOptions?.retry?.initialDelayMs ?? 250,
				maxAttempts: userDrainOptions?.retry?.maxAttempts ?? 2,
				maxDelayMs: userDrainOptions?.retry?.maxDelayMs ?? 1_000,
			},
		});

		this.drain = pipeline(async (batch) => {
			await this.sendBatch(batch.map((item) => item.event));
		});

		this.applyLoggerConfig();
		this.queueReplayPromise = this.flushQueuedEvents();
	}

	trackEvent(
		eventName: TelemetryEventNameType | string,
		properties: EventLike = {}
	): void {
		if (this.disabled) {
			if (this.debug) {
				this.logDebug(
					`Telemetry event skipped (${eventName}): telemetry disabled`
				);
			}
			return;
		}

		try {
			const log = createLogger(this.buildBaseContext(eventName));
			log.set(this.sanitizeProperties(properties));
			log.emit();

			if (this.debug) {
				this.logDebug(`Queued telemetry event: ${eventName}`);
			}
		} catch (error) {
			if (this.debug) {
				this.logDebug(`Failed to queue telemetry event ${eventName}:`, error);
			}
		}
	}

	trackCommand(
		command: string,
		args: string[] = [],
		flags: Record<string, string | number | boolean | undefined> = {}
	): void {
		this.activeCommandName = command;
		this.activeCommandRunId = crypto.randomUUID();

		const safeFlags = this.sanitizeProperties(flags);
		const safeArgs = this.sanitizeValue(args) as TelemetryValue[];

		this.trackEvent(TelemetryEventName.COMMAND_EXECUTED, {
			args: safeArgs,
			argsCount: args.length,
			command,
			commandRunId: this.activeCommandRunId,
			flagCount: Object.keys(safeFlags).length,
			flagNames: Object.keys(safeFlags).sort(),
			flags: safeFlags,
			subcommand:
				typeof safeArgs[0] === 'string' ? (safeArgs[0] as string) : undefined,
		});
	}

	trackError(error: Error, command?: string): void {
		if (this.disabled) {
			return;
		}

		const safeCommand = command ?? this.activeCommandName;
		const safeError = this.sanitizeError(error);
		const errorMetadata = this.buildErrorMetadata(error);

		try {
			const log = createLogger(
				this.buildBaseContext(TelemetryEventName.ERROR_OCCURRED)
			);
			log.error(safeError, {
				command: safeCommand,
				commandRunId: this.activeCommandRunId,
				failure: errorMetadata,
			});
			log.emit();

			if (this.debug) {
				this.logDebug(
					`Queued telemetry error event: ${safeCommand ?? 'unknown-command'}`
				);
			}
		} catch (trackingError) {
			if (this.debug) {
				this.logDebug('Failed to queue telemetry error event:', trackingError);
			}
		}
	}

	flushSync(): void {
		if (this.disabled) {
			return;
		}

		this.flushPromise = this.flushAll();
	}

	async shutdown(): Promise<void> {
		if (this.disabled) {
			return;
		}

		await (this.flushPromise ?? this.flushAll());
	}

	isDisabled(): boolean {
		return this.disabled;
	}

	disable(): void {
		this.disabled = true;
		this.applyLoggerConfig();
	}

	enable(): void {
		this.disabled = false;
		this.applyLoggerConfig();
		this.queueReplayPromise = this.flushQueuedEvents();
	}

	setLogger(logger: CliLogger): void {
		this.logger = logger;
	}

	private applyLoggerConfig(): void {
		const cliVersion = this.readString(this.defaultProperties.cliVersion);

		initLogger({
			_suppressDrainWarning: this.disabled,
			drain: this.disabled ? undefined : this.drain,
			enabled: !this.disabled,
			env: {
				environment: this.getEnvironmentName(),
				service: 'c15t-cli',
				version: cliVersion,
			},
			pretty: false,
			silent: true,
			stringify: false,
		});
	}

	private buildBaseContext(eventName: string): TelemetryProperties {
		this.sequence += 1;

		return {
			arch: process.arch,
			ci: this.isCi(),
			command: this.activeCommandName,
			commandRunId: this.activeCommandRunId,
			event: eventName,
			firstRun: this.isFirstRun,
			installId: this.installId,
			interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
			nodeVersion: process.version,
			platform: process.platform,
			sequence: this.sequence,
			sessionId: this.sessionId,
			source: 'c15t-cli',
			tty: Boolean(process.stdout.isTTY),
			...this.defaultProperties,
		};
	}

	// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
	private buildHeaders(
		overrides?: Record<string, string>
	): Record<string, string> {
		const writeKey = process.env[ENV_VARS.TELEMETRY_WRITE_KEY];
		const orgId = process.env[ENV_VARS.TELEMETRY_ORG_ID];

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		if (writeKey) {
			headers.Authorization = `Bearer ${writeKey}`;
		}
		if (orgId) {
			headers['X-Axiom-Org-Id'] = orgId;
		}
		Object.assign(headers, overrides);

		return headers;
	}

	private async flushAll(): Promise<void> {
		try {
			await this.queueReplayPromise;
			await this.drain.flush();
			await this.queueWritePromise;
			await this.flushQueuedEvents();

			if (this.debug) {
				this.logDebug('Flushed telemetry events');
			}
		} catch (error) {
			if (this.debug) {
				this.logDebug('Telemetry flush failed:', error);
			}
		} finally {
			this.flushPromise = null;
		}
	}

	private async sendBatch(events: WideEvent[]): Promise<void> {
		if (events.length === 0) {
			return;
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

		try {
			const response = await this.fetchImpl(this.endpoint, {
				body: JSON.stringify(events),
				headers: this.headers,
				method: 'POST',
				signal: controller.signal,
			});

			if (!response.ok) {
				throw new Error(
					`Telemetry ingest failed with status ${response.status}`
				);
			}
		} finally {
			clearTimeout(timeout);
		}
	}

	private async persistDroppedEvents(
		events: DrainContext[],
		error?: Error
	): Promise<void> {
		const previousWrite = this.queueWritePromise;
		this.queueWritePromise = (async () => {
			await previousWrite;
			try {
				const existing = await this.readQueuedEvents();
				const next = [...existing, ...events.map((item) => item.event)].slice(
					-DEFAULT_QUEUE_LIMIT
				);
				await this.writeQueuedEvents(next);

				if (this.debug) {
					this.logDebug(
						`Persisted ${events.length} dropped telemetry event(s) to disk`,
						error
					);
				}
			} catch (queueError) {
				if (this.debug) {
					this.logDebug(
						'Failed to persist dropped telemetry events:',
						queueError
					);
				}
			}
		})();

		await this.queueWritePromise;
	}

	private async flushQueuedEvents(): Promise<void> {
		if (this.disabled) {
			return;
		}

		try {
			const queuedEvents = await this.readQueuedEvents();

			if (queuedEvents.length === 0) {
				return;
			}

			await this.sendBatch(queuedEvents);
			await fsPromises.unlink(this.queuePath).catch(() => undefined);

			if (this.debug) {
				this.logDebug(
					`Replayed ${queuedEvents.length} queued telemetry event(s)`
				);
			}
		} catch (error) {
			if (this.debug) {
				this.logDebug('Failed to replay queued telemetry events:', error);
			}
		}
	}

	private async readQueuedEvents(): Promise<WideEvent[]> {
		try {
			const content = await fsPromises.readFile(this.queuePath, 'utf-8');
			const parsed = JSON.parse(content);

			if (!Array.isArray(parsed)) {
				return [];
			}

			return parsed.filter(
				(item): item is WideEvent => typeof item === 'object' && item !== null
			);
		} catch {
			return [];
		}
	}

	private async writeQueuedEvents(events: WideEvent[]): Promise<void> {
		await fsPromises.mkdir(this.storageDir, { recursive: true });
		await fsPromises.writeFile(
			this.queuePath,
			JSON.stringify(events, null, 2),
			{
				mode: 0o600,
			}
		);
	}

	private loadOrCreateInstallIdentity(): {
		installId: string;
		isFirstRun: boolean;
	} {
		try {
			fs.mkdirSync(this.storageDir, { recursive: true });

			if (fs.existsSync(this.statePath)) {
				const content = fs.readFileSync(this.statePath, 'utf-8');
				const parsed = JSON.parse(content) as { installId?: string };

				if (
					typeof parsed.installId === 'string' &&
					parsed.installId.length > 0
				) {
					return {
						installId: parsed.installId,
						isFirstRun: false,
					};
				}
			}
		} catch (error) {
			if (this.debug) {
				this.logDebug('Failed to read telemetry state file:', error);
			}
		}

		const installId = crypto.randomUUID();

		try {
			fs.writeFileSync(
				this.statePath,
				JSON.stringify(
					{
						createdAt: new Date().toISOString(),
						installId,
					},
					null,
					2
				),
				{
					mode: 0o600,
				}
			);
		} catch (error) {
			if (this.debug) {
				this.logDebug('Failed to persist telemetry install ID:', error);
			}
		}

		return {
			installId,
			isFirstRun: true,
		};
	}

	private buildErrorMetadata(error: Error): TelemetryProperties {
		const eventError = error as Error & {
			code?: unknown;
			status?: unknown;
			statusCode?: unknown;
			cause?: unknown;
		};

		return this.sanitizeProperties({
			cause:
				// oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
				eventError.cause instanceof Error
					? eventError.cause.message
					: typeof eventError.cause === 'string'
						? eventError.cause
						: undefined,
			code:
				typeof eventError.code === 'string' ||
				typeof eventError.code === 'number'
					? eventError.code
					: undefined,
			message: eventError.message,
			name: eventError.name,
			status:
				typeof eventError.status === 'number' ? eventError.status : undefined,
			statusCode:
				typeof eventError.statusCode === 'number'
					? eventError.statusCode
					: undefined,
		});
	}

	// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
	private sanitizeError(error: Error): Error {
		const safeError = new Error(error.message);
		safeError.name = error.name;

		if (process.env.NODE_ENV === 'development') {
			safeError.stack = error.stack;
		} else {
			delete (safeError as Error & { stack?: string }).stack;
		}

		const sourceError = error as Error & {
			status?: unknown;
			statusCode?: unknown;
			statusText?: unknown;
			statusMessage?: unknown;
			cause?: unknown;
		};
		const targetError = safeError as Error & {
			status?: unknown;
			statusCode?: unknown;
			statusText?: unknown;
			statusMessage?: unknown;
			cause?: unknown;
		};

		if (typeof sourceError.status === 'number') {
			targetError.status = sourceError.status;
		}

		if (typeof sourceError.statusCode === 'number') {
			targetError.statusCode = sourceError.statusCode;
		}

		if (typeof sourceError.statusText === 'string') {
			targetError.statusText = sourceError.statusText;
		}

		if (typeof sourceError.statusMessage === 'string') {
			targetError.statusMessage = sourceError.statusMessage;
		}

		if (sourceError.cause instanceof Error) {
			targetError.cause = sourceError.cause.message;
		} else if (typeof sourceError.cause === 'string') {
			targetError.cause = sourceError.cause;
		}

		return safeError;
	}

	private sanitizeProperties(properties: EventLike): TelemetryObject {
		const sanitized: TelemetryObject = {};

		for (const [key, value] of Object.entries(properties)) {
			if (RESERVED_TOP_LEVEL_KEYS.has(key)) {
				continue;
			}

			if (value === undefined) {
				continue;
			}

			if (SENSITIVE_KEY_PATTERN.test(key)) {
				sanitized[key] = '[redacted]';
				continue;
			}

			sanitized[key] = this.sanitizeValue(value, 0, key);
		}

		return sanitized;
	}

	private sanitizeValue(
		value: unknown,
		depth = 0,
		keyHint?: string
	): TelemetryValue {
		if (depth >= MAX_DEPTH) {
			return '[truncated]';
		}

		if (value === null) {
			return null;
		}

		if (
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean'
		) {
			return this.sanitizePrimitive(value, keyHint);
		}

		if (value instanceof Date) {
			return value.toISOString();
		}

		if (value instanceof Error) {
			return this.sanitizeProperties(this.buildErrorMetadata(value));
		}

		if (Array.isArray(value)) {
			return value
				.slice(0, MAX_ARRAY_LENGTH)
				.map((item) => this.sanitizeValue(item, depth + 1));
		}

		if (typeof value === 'object') {
			const objectValue = value as Record<string, unknown>;
			const sanitizedObject: Record<string, TelemetryValue> = {};

			for (const key of Object.keys(objectValue).slice(0, MAX_OBJECT_KEYS)) {
				const nextValue = objectValue[key];

				if (nextValue === undefined) {
					continue;
				}

				if (SENSITIVE_KEY_PATTERN.test(key)) {
					sanitizedObject[key] = '[redacted]';
					continue;
				}

				sanitizedObject[key] = this.sanitizeValue(nextValue, depth + 1, key);
			}

			return sanitizedObject;
		}

		return String(value);
	}

	// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
	private sanitizePrimitive(
		value: string | number | boolean,
		keyHint?: string
	): TelemetryPrimitive {
		if (typeof value !== 'string') {
			return value;
		}

		if (keyHint && SENSITIVE_KEY_PATTERN.test(keyHint)) {
			return '[redacted]';
		}

		if (SECRET_VALUE_PATTERN.test(value)) {
			return '[redacted]';
		}

		if (path.isAbsolute(value)) {
			return '[absolute-path]';
		}

		if (value.startsWith('http://') || value.startsWith('https://')) {
			try {
				const parsed = new URL(value);
				parsed.username = '';
				parsed.password = '';
				parsed.search = '';
				parsed.hash = '';
				// oxlint-disable-next-line no-param-reassign -- Preserve established bindings and assignment semantics.
				value = parsed.toString();
			} catch {
				// Keep the original string if URL parsing fails.
			}
		}

		if (value.length > MAX_STRING_LENGTH) {
			return `${value.slice(0, MAX_STRING_LENGTH)}...`;
		}

		return value;
	}

	private getEnvironmentName(): string {
		return process.env.NODE_ENV ?? (this.isCi() ? 'production' : 'development');
	}

	// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
	private isCi(): boolean {
		return Boolean(
			process.env.CI ||
			process.env.GITHUB_ACTIONS ||
			process.env.BUILDKITE ||
			process.env.VERCEL
		);
	}

	// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
	private readString(value: TelemetryValue | undefined): string | undefined {
		return typeof value === 'string' ? value : undefined;
	}

	private logDebug(message: string, ...args: unknown[]): void {
		if (this.logger) {
			this.logger.debug(message, ...args);
		} else {
			console.debug(message, ...args);
		}
	}
}

export const createTelemetry = function createTelemetry(
	options?: TelemetryOptions
): Telemetry {
	return new Telemetry(options);
};
