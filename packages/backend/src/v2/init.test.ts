import { afterEach, describe, expect, it, vi } from 'vitest';
import type { C15TOptions } from './types';

// Mock OpenTelemetry modules before any imports
// Use a closure to capture the start mock
let getStartMock: (() => ReturnType<typeof vi.fn>) | undefined;

vi.mock('@opentelemetry/sdk-node', () => ({
	NodeSDK: vi.fn(function NodeSDK() {
		const startFn = getStartMock ? getStartMock() : vi.fn();
		return {
			start: startFn,
		};
	}),
}));

vi.mock('@opentelemetry/resources', () => ({
	resourceFromAttributes: vi.fn().mockImplementation((attributes) => ({
		attributes,
	})),
}));

vi.mock('@opentelemetry/sdk-trace-base', () => ({
	ConsoleSpanExporter: vi.fn(function ConsoleSpanExporter() {
		return {};
	}),
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
			orm: vi.fn().mockReturnValue({ adapter }),
		})),
	},
}));

afterEach(() => {
	vi.clearAllMocks();
	getStartMock = undefined;
});

interface SetupParams {
	telemetryDisabled?: boolean;
	appName?: string;
}

async function setup(params: SetupParams = {}) {
	const { telemetryDisabled = false, appName } = params;

	// Create the start mock
	const startMock = vi.fn();

	// Set up the getter function before resetting modules
	getStartMock = () => startMock;

	// Reset the module cache to ensure a fresh instance for every test run
	vi.resetModules();

	// Get the mocked modules - the mock factory will use getStartMock
	const { DB } = await import('./db/schema');
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
