import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
	PolicyTypeSchema: vi.fn(),
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

// Mock analytics modules for c15tInstance tests
vi.mock('./handlers/analytics/event-processor', () => ({
	EventProcessor: vi.fn(),
}));

vi.mock('./handlers/analytics/destination-manager', () => ({
	DestinationManager: vi.fn(),
}));

vi.mock('./handlers/analytics/process.handler', () => ({
	processAnalyticsEvents: vi.fn(),
}));

describe('c15tInstance Factory', () => {
	let mockLogger: any;
	let mockEventProcessor: any;
	let mockDestinationManager: any;

	beforeEach(async () => {
		// Reset modules for fresh mocks
		vi.resetModules();

		// Mock logger
		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		};

		// Mock EventProcessor
		mockEventProcessor = {
			processEvents: vi.fn(),
		};

		// Mock DestinationManager
		mockDestinationManager = {
			loadDestinations: vi.fn().mockResolvedValue(undefined),
			getDestinationStatus: vi.fn().mockReturnValue({ status: 'loaded' }),
			testDestination: vi.fn().mockResolvedValue(true),
			getLoadedDestinations: vi.fn().mockReturnValue([
				{ type: 'posthog', status: 'loaded' },
				{ type: 'console', status: 'loaded' },
			]),
		};

		// Setup module mocks
		const { initLogger } = await import('./utils/logger');
		const { EventProcessor } = await import(
			'./handlers/analytics/event-processor'
		);
		const { DestinationManager } = await import(
			'./handlers/analytics/destination-manager'
		);
		const { processAnalyticsEvents } = await import(
			'./handlers/analytics/process.handler'
		);

		(initLogger as any).mockReturnValue(mockLogger);
		(EventProcessor as any).mockImplementation(() => mockEventProcessor);
		(DestinationManager as any).mockImplementation(
			() => mockDestinationManager
		);
		(processAnalyticsEvents as any).mockReturnValue(vi.fn());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Analytics Initialization', () => {
		it('should create analytics instance with minimal options', async () => {
			const { c15tInstance } = await import('./init');

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
			};

			const instance = await c15tInstance(options);

			expect(instance).toBeDefined();
			expect(instance.eventProcessor).toBe(mockEventProcessor);
			expect(instance.handlers.processEvents).toBeDefined();
			expect(instance.utils).toBeDefined();
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Initializing c15t analytics instance',
				{
					appName: 'c15t',
					hasAnalytics: false,
					destinationCount: 0,
				}
			);
		});

		it('should create analytics instance with destinations', async () => {
			const { c15tInstance } = await import('./init');

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
				analytics: {
					destinations: [
						{
							type: 'posthog',
							enabled: true,
							settings: { apiKey: 'phc_test' },
						},
						{
							type: 'console',
							enabled: true,
							settings: { logLevel: 'debug' },
						},
					],
				},
			};

			const instance = await c15tInstance(options);

			expect(instance).toBeDefined();
			expect(mockDestinationManager.loadDestinations).toHaveBeenCalledWith(
				options.analytics!.destinations
			);
			expect(mockLogger.info).toHaveBeenCalledWith('Loading destinations', {
				count: 2,
			});
			expect(mockLogger.info).toHaveBeenCalledWith(
				'c15t analytics instance initialized successfully',
				{
					loadedDestinations: 2,
				}
			);
		});

		it('should use custom app name', async () => {
			const { c15tInstance } = await import('./init');

			const options: C15TOptions = {
				appName: 'my-analytics-app',
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
			};

			await c15tInstance(options);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Initializing c15t analytics instance',
				{
					appName: 'my-analytics-app',
					hasAnalytics: false,
					destinationCount: 0,
				}
			);
		});
	});

	describe('Options Validation', () => {
		it('should throw ConfigurationError for missing destination type', async () => {
			const { c15tInstance, ConfigurationError } = await import('./init');

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
				analytics: {
					destinations: [
						{
							type: '',
							enabled: true,
							settings: { apiKey: 'phc_test' },
						} as any,
					],
				},
			};

			await expect(c15tInstance(options)).rejects.toThrow(ConfigurationError);
			await expect(c15tInstance(options)).rejects.toThrow(
				'Destination type is required'
			);
		});

		it('should throw ConfigurationError for missing destination settings', async () => {
			const { c15tInstance, ConfigurationError } = await import('./init');

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
				analytics: {
					destinations: [
						{
							type: 'posthog',
							enabled: true,
							settings: undefined as any,
						},
					],
				},
			};

			await expect(c15tInstance(options)).rejects.toThrow(ConfigurationError);
			await expect(c15tInstance(options)).rejects.toThrow(
				'Destination settings are required'
			);
		});

		it('should pass validation with valid destinations', async () => {
			const { c15tInstance } = await import('./init');

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
				analytics: {
					destinations: [
						{
							type: 'posthog',
							enabled: true,
							settings: { apiKey: 'phc_test' },
						},
					],
				},
			};

			await expect(c15tInstance(options)).resolves.toBeDefined();
		});
	});

	describe('Error Handling', () => {
		it('should handle EventProcessor initialization failure', async () => {
			const { EventProcessor } = await import(
				'./handlers/analytics/event-processor'
			);
			const { c15tInstance, C15TInitializationError } = await import('./init');

			(EventProcessor as any).mockImplementation(() => {
				throw new Error('EventProcessor initialization failed');
			});

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
			};

			await expect(c15tInstance(options)).rejects.toThrow(
				C15TInitializationError
			);
			await expect(c15tInstance(options)).rejects.toThrow(
				'Failed to initialize analytics-instance'
			);
		});

		it('should handle destination loading failure', async () => {
			const { c15tInstance, C15TInitializationError } = await import('./init');

			mockDestinationManager.loadDestinations.mockRejectedValue(
				new Error('Failed to load destinations')
			);

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
				analytics: {
					destinations: [
						{
							type: 'posthog',
							enabled: true,
							settings: { apiKey: 'phc_test' },
						},
					],
				},
			};

			await expect(c15tInstance(options)).rejects.toThrow(
				C15TInitializationError
			);
			await expect(c15tInstance(options)).rejects.toThrow(
				'Failed to initialize analytics-instance'
			);
		});

		it('should log initialization errors', async () => {
			const { EventProcessor } = await import(
				'./handlers/analytics/event-processor'
			);
			const { c15tInstance } = await import('./init');

			(EventProcessor as any).mockImplementation(() => {
				throw new Error('Test error');
			});

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
			};

			await expect(c15tInstance(options)).rejects.toThrow();

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to initialize c15t analytics instance',
				{
					error: 'Test error',
					stack: expect.any(String),
				}
			);
		});
	});

	describe('Context Creation', () => {
		it('should create context with all required properties', async () => {
			const { c15tInstance } = await import('./init');

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
				analytics: {
					destinations: [
						{
							type: 'posthog',
							enabled: true,
							settings: { apiKey: 'phc_test' },
						},
					],
				},
			};

			const instance = await c15tInstance(options);

			// Check core components
			expect(instance.eventProcessor).toBe(mockEventProcessor);
			expect(instance.destinationManager).toBeDefined();

			// Check handlers
			expect(instance.handlers.processEvents).toBeDefined();

			// Check utilities
			expect(instance.utils.getDestinationStatus).toBeDefined();
			expect(instance.utils.testDestination).toBeDefined();
			expect(instance.utils.getLoadedDestinations).toBeDefined();
		});

		it('should provide working utility functions', async () => {
			const { c15tInstance } = await import('./init');

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
			};

			const instance = await c15tInstance(options);

			// Test utility functions
			const status = instance.utils.getDestinationStatus('posthog');
			expect(status).toEqual({ status: 'loaded' });
			expect(mockDestinationManager.getDestinationStatus).toHaveBeenCalledWith(
				'posthog'
			);

			const isConnected = await instance.utils.testDestination('posthog');
			expect(isConnected).toBe(true);
			expect(mockDestinationManager.testDestination).toHaveBeenCalledWith(
				'posthog'
			);

			const destinations = instance.utils.getLoadedDestinations();
			expect(destinations).toHaveLength(2);
			expect(mockDestinationManager.getLoadedDestinations).toHaveBeenCalled();
		});
	});

	describe('Custom Registry', () => {
		it('should pass custom registry to DestinationManager', async () => {
			const { DestinationManager } = await import(
				'./handlers/analytics/destination-manager'
			);
			const { c15tInstance } = await import('./init');

			const customRegistry = {
				customDestination: vi.fn(),
			};

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
				analytics: {
					destinations: [],
					customRegistry,
				},
			};

			await c15tInstance(options);

			expect(DestinationManager).toHaveBeenCalledWith(
				mockLogger,
				customRegistry
			);
		});
	});

	describe('Empty Destinations', () => {
		it('should handle empty destinations array', async () => {
			const { c15tInstance } = await import('./init');

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
				analytics: {
					destinations: [],
				},
			};

			const instance = await c15tInstance(options);

			expect(instance).toBeDefined();
			// Empty array should still call loadDestinations but with empty array
			expect(mockDestinationManager.loadDestinations).toHaveBeenCalledWith([]);
		});

		it('should handle undefined destinations', async () => {
			const { c15tInstance } = await import('./init');

			const options: C15TOptions = {
				trustedOrigins: ['http://localhost:3000'],
				adapter: {} as any,
				analytics: {
					destinations: [],
				},
			};

			const instance = await c15tInstance(options);

			expect(instance).toBeDefined();
			// Empty array should still call loadDestinations but with empty array
			expect(mockDestinationManager.loadDestinations).toHaveBeenCalledWith([]);
		});
	});
});
