import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CliLogger } from '../../src/types';
import {
	createTelemetry,
	Telemetry,
	TelemetryEventName,
} from '../../src/utils/telemetry';

const getDefined = <Value>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

const createMockLogger = function createMockLogger(): CliLogger {
	return {
		debug: vi.fn(),
		error: vi.fn(),
		failed: vi.fn(() => {
			throw new Error('failed');
		}) as unknown as CliLogger['failed'],
		info: vi.fn(),
		message: vi.fn(),
		note: vi.fn(),
		outro: vi.fn(),
		step: vi.fn(),
		success: vi.fn(),
		warn: vi.fn(),
	};
};

const flushTelemetry = async function flushTelemetry(telemetry: Telemetry) {
	telemetry.flushSync();
	await telemetry.shutdown();
};

describe('Telemetry', () => {
	let telemetry: Telemetry;
	let fetchMock: ReturnType<typeof vi.fn>;
	let storageDir: string;
	let mockLogger: CliLogger;
	let originalTelemetryWriteKey: string | undefined;
	let originalTelemetryOrgId: string | undefined;

	beforeEach(async () => {
		originalTelemetryWriteKey = process.env.C15T_TELEMETRY_WRITE_KEY;
		originalTelemetryOrgId = process.env.C15T_TELEMETRY_ORG_ID;
		delete process.env.C15T_TELEMETRY_WRITE_KEY;
		delete process.env.C15T_TELEMETRY_ORG_ID;

		// oxlint-disable-next-line require-await -- Async signature preserves the callback or public contract.
		fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
		storageDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'c15t-cli-telemetry-')
		);
		mockLogger = createMockLogger();

		telemetry = new Telemetry({
			drainOptions: {
				retry: {
					backoff: 'fixed',
					initialDelayMs: 10,
					maxAttempts: 1,
					maxDelayMs: 10,
				},
			},
			fetch: fetchMock as unknown as typeof fetch,
			logger: mockLogger,
			storageDir,
		});
	});

	afterEach(async () => {
		await telemetry.shutdown();
		if (originalTelemetryWriteKey === undefined) {
			delete process.env.C15T_TELEMETRY_WRITE_KEY;
		} else {
			process.env.C15T_TELEMETRY_WRITE_KEY = originalTelemetryWriteKey;
		}
		if (originalTelemetryOrgId === undefined) {
			delete process.env.C15T_TELEMETRY_ORG_ID;
		} else {
			process.env.C15T_TELEMETRY_ORG_ID = originalTelemetryOrgId;
		}
		await fs.rm(storageDir, { force: true, recursive: true });
	});

	it('creates a telemetry instance', () => {
		expect(telemetry).toBeInstanceOf(Telemetry);
	});

	it('creates telemetry with the factory', async () => {
		const instance = createTelemetry({
			disabled: true,
			fetch: fetchMock as unknown as typeof fetch,
			storageDir,
		});

		expect(instance).toBeInstanceOf(Telemetry);
		await instance.shutdown();
	});

	it('respects the disabled flag', async () => {
		const disabledTelemetry = new Telemetry({
			disabled: true,
			fetch: fetchMock as unknown as typeof fetch,
			storageDir,
		});

		disabledTelemetry.trackEvent(TelemetryEventName.CLI_INVOKED, {
			test: true,
		});
		await disabledTelemetry.shutdown();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('tracks events via the ingest endpoint', async () => {
		telemetry.trackEvent(TelemetryEventName.CLI_INVOKED, {
			framework: 'next',
			nested: { mode: 'hosted' },
		});

		await flushTelemetry(telemetry);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, requestInit] = getDefined(fetchMock.mock.calls[0]);
		const payload = JSON.parse(String(requestInit?.body)) as Record<
			string,
			unknown
		>[];

		expect(payload).toHaveLength(1);
		expect(payload[0]).toMatchObject({
			event: TelemetryEventName.CLI_INVOKED,
			framework: 'next',
			nested: { mode: 'hosted' },
			source: 'c15t-cli',
		});
		expect(payload[0].installId).toEqual(expect.any(String));
		expect(payload[0].sessionId).toEqual(expect.any(String));
		expect(payload[0].sequence).toBe(1);
	});

	it('tracks commands with sanitized args and flags', async () => {
		telemetry.trackCommand('setup', ['hosted', '/tmp/private'], {
			config: '/tmp/c15t.config.ts',
			logger: 'debug',
			'no-telemetry': false,
		});

		await flushTelemetry(telemetry);

		const [, requestInit] = getDefined(fetchMock.mock.calls[0]);
		const payload = JSON.parse(String(requestInit?.body)) as Record<
			string,
			unknown
		>[];
		const event = getDefined(payload[0]);

		expect(event).toMatchObject({
			argsCount: 2,
			command: 'setup',
			event: TelemetryEventName.COMMAND_EXECUTED,
			flagCount: 3,
		});
		expect(event.commandRunId).toEqual(expect.any(String));
		expect(event.args).toEqual(['hosted', '[absolute-path]']);
		expect(event.flags).toEqual({
			config: '[redacted]',
			logger: 'debug',
			'no-telemetry': false,
		});
		expect(event.flagNames).toEqual(['config', 'logger', 'no-telemetry']);
	});

	it('tracks errors with structured failure data', async () => {
		const error = Object.assign(new Error('Test error'), {
			code: 'E_TEST',
			status: 500,
		});

		telemetry.trackError(error, 'setup');
		await flushTelemetry(telemetry);

		const [, requestInit] = getDefined(fetchMock.mock.calls[0]);
		const payload = JSON.parse(String(requestInit?.body)) as Record<
			string,
			unknown
		>[];
		const event = getDefined(payload[0]);

		expect(event.event).toBe(TelemetryEventName.ERROR_OCCURRED);
		expect(event.level).toBe('error');
		expect(event.command).toBe('setup');
		expect(event.failure).toMatchObject({
			code: 'E_TEST',
			message: 'Test error',
			name: 'Error',
			status: 500,
		});
	});

	it('redacts sensitive values and strips URL credentials', async () => {
		telemetry.trackEvent(TelemetryEventName.CLI_INVOKED, {
			endpoint: 'https://user:pass@example.com/path?q=1#hash',
			nested: {
				password: 'secret',
			},
			projectPath: '/tmp/private-project',
			token: 'super-secret-token',
		});

		await flushTelemetry(telemetry);

		const [, requestInit] = getDefined(fetchMock.mock.calls[0]);
		const payload = JSON.parse(String(requestInit?.body)) as Record<
			string,
			unknown
		>[];
		const event = getDefined(payload[0]);

		expect(event.token).toBe('[redacted]');
		expect(event.nested).toEqual({ password: '[redacted]' });
		expect(event.endpoint).toBe('https://example.com/path');
		expect(event.projectPath).toBe('[absolute-path]');
	});

	it('queues dropped telemetry batches to disk and replays them later', async () => {
		// oxlint-disable-next-line require-await -- Async signature preserves the callback or public contract.
		fetchMock.mockImplementation(async () => {
			throw new Error('network down');
		});

		telemetry.trackEvent(TelemetryEventName.CLI_INVOKED, {
			attempt: 1,
		});
		await flushTelemetry(telemetry);

		const queuePath = path.join(storageDir, 'telemetry-queue.json');
		const queued = JSON.parse(await fs.readFile(queuePath, 'utf-8')) as Record<
			string,
			unknown
		>[];
		expect(queued).toHaveLength(1);
		expect(queued[0]?.event).toBe(TelemetryEventName.CLI_INVOKED);

		// oxlint-disable-next-line require-await -- Async signature preserves the callback or public contract.
		const replayFetch = vi.fn(async () => new Response(null, { status: 204 }));
		const replayTelemetry = new Telemetry({
			drainOptions: {
				retry: {
					backoff: 'fixed',
					initialDelayMs: 10,
					maxAttempts: 1,
					maxDelayMs: 10,
				},
			},
			fetch: replayFetch as unknown as typeof fetch,
			logger: mockLogger,
			storageDir,
		});

		await replayTelemetry.shutdown();

		expect(replayFetch).toHaveBeenCalledTimes(1);
		await expect(fs.access(queuePath)).rejects.toThrow();
	});

	it('can be disabled and re-enabled', async () => {
		telemetry.disable();
		telemetry.trackEvent(TelemetryEventName.CLI_INVOKED, { stage: 'disabled' });

		telemetry.enable();
		telemetry.trackEvent(TelemetryEventName.CLI_INVOKED, { stage: 'enabled' });

		await flushTelemetry(telemetry);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, requestInit] = getDefined(fetchMock.mock.calls[0]);
		const payload = JSON.parse(String(requestInit?.body)) as Record<
			string,
			unknown
		>[];

		expect(payload).toHaveLength(1);
		expect(payload[0]?.stage).toBe('enabled');
	});

	it('sends axiom-compatible headers and a raw events array', async () => {
		process.env.C15T_TELEMETRY_WRITE_KEY = 'axiom-token';
		process.env.C15T_TELEMETRY_ORG_ID = 'axiom-org';

		const axiomTelemetry = new Telemetry({
			drainOptions: {
				retry: {
					backoff: 'fixed',
					initialDelayMs: 10,
					maxAttempts: 1,
					maxDelayMs: 10,
				},
			},
			fetch: fetchMock as unknown as typeof fetch,
			logger: mockLogger,
			storageDir,
		});

		axiomTelemetry.trackEvent(TelemetryEventName.CLI_INVOKED, {
			stage: 'axiom',
		});
		await flushTelemetry(axiomTelemetry);
		await axiomTelemetry.shutdown();

		const [, requestInit] = getDefined(fetchMock.mock.calls[0]);
		const headers = requestInit?.headers as Record<string, string>;
		const payload = JSON.parse(String(requestInit?.body)) as Record<
			string,
			unknown
		>[];

		expect(headers).toMatchObject({
			Authorization: 'Bearer axiom-token',
			'Content-Type': 'application/json',
			'X-Axiom-Org-Id': 'axiom-org',
		});
		expect(payload).toHaveLength(1);
		expect(payload[0]?.stage).toBe('axiom');
		expect(payload[0]).not.toHaveProperty('events');
	});
});
