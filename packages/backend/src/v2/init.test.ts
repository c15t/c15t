import { afterEach, describe, expect, it, vi } from 'vitest';
import type { C15TOptions } from './types';

afterEach(() => {
	vi.clearAllMocks();
});

interface SetupParams {
	telemetryDisabled?: boolean;
	appName?: string;
}

async function setup(params: SetupParams = {}) {
	const { telemetryDisabled = false, appName } = params;

	// Reset the module cache to ensure a fresh instance for every test run
	vi.resetModules();

	// OpenTelemetry stubs
	const startMock = vi.fn();
	vi.doMock('@opentelemetry/sdk-node', () => ({
		NodeSDK: vi.fn().mockImplementation(() => ({
			start: startMock,
		})),
	}));

	vi.doMock('@opentelemetry/resources', () => ({
		Resource: class {
			readonly attributes: Record<string, unknown>;
			constructor(attributes: Record<string, unknown>) {
				this.attributes = attributes;
			}
		},
	}));

	vi.doMock('@opentelemetry/sdk-trace-base', () => ({
		ConsoleSpanExporter: class {},
	}));

	// Logger stub
	const loggerInstance = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};
	const initLoggerMock = vi.fn().mockReturnValue(loggerInstance);
	vi.doMock('./utils/logger', () => ({
		initLogger: initLoggerMock,
	}));

	// Registry stub
	const createRegistryMock = vi.fn().mockReturnValue({});
	vi.doMock('./db/registry', () => ({
		createRegistry: createRegistryMock,
	}));

	// Database stub
	const clientMock = vi.fn((adapter: unknown) => ({
		orm: vi.fn().mockResolvedValue({ adapter }),
	}));
	vi.doMock('./db/schema', () => ({
		DB: {
			client: clientMock,
		},
	}));

	const { init } = await import('./init');

	const options: Record<string, unknown> = {
		trustedOrigins: [],
		advanced: {
			telemetry: telemetryDisabled ? { disabled: true } : {},
		},
		database: {},
	};

	if (appName !== undefined) {
		options.appName = appName;
	}

	const context = init(options as unknown as C15TOptions);

	return {
		context,
		startMock,
		clientMock,
	};
}

describe('init', () => {
	it('uses "c15t" as default appName when none is provided', async () => {
		const { context, clientMock } = await setup();
		expect(context.appName).toBe('c15t');
		expect(clientMock).toHaveBeenCalledTimes(1);
	});

	it('uses the provided appName', async () => {
		const appName = 'MyAmazingApp';
		const { context } = await setup({ appName });
		expect(context.appName).toBe(appName);
	});

	it('initialises telemetry when telemetry is enabled', async () => {
		const { startMock } = await setup();
		expect(startMock).toHaveBeenCalledTimes(1);
	});

	it('does not initialise telemetry when disabled via options', async () => {
		const { startMock } = await setup({ telemetryDisabled: true });
		expect(startMock).not.toHaveBeenCalled();
	});
});
