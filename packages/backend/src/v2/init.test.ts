import { afterEach, describe, expect, it, vi } from 'vitest';
import type { C15TOptions } from './types';

// Mock OpenTelemetry modules before any imports
vi.mock('@opentelemetry/sdk-node', () => ({
	NodeSDK: vi.fn().mockImplementation(() => ({
		start: vi.fn(),
	})),
}));

vi.mock('@opentelemetry/resources', () => ({
	resourceFromAttributes: vi.fn().mockImplementation((attributes) => ({
		attributes,
	})),
}));

vi.mock('@opentelemetry/sdk-trace-base', () => ({
	ConsoleSpanExporter: vi.fn().mockImplementation(() => ({})),
}));

// Mock local modules
vi.mock('./utils/logger', () => ({
	initLogger: vi.fn().mockReturnValue({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

vi.mock('./db/registry', () => ({
	createRegistry: vi.fn().mockReturnValue({}),
}));

vi.mock('./db/schema', () => ({
	DB: {
		client: vi.fn().mockImplementation((adapter) => ({
			orm: vi.fn().mockResolvedValue({ adapter }),
		})),
	},
}));

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

	// Get the mocked modules
	const { NodeSDK } = await import('@opentelemetry/sdk-node');
	const { DB } = await import('./db/schema');

	// Get the start mock from the NodeSDK instance
	const startMock = vi.fn();
	const nodeSDKMock = NodeSDK as any;
	nodeSDKMock.mockImplementation(() => ({
		start: startMock,
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
		clientMock: DB.client,
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
