import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { init } from './init';
import type { C15TOptions } from './types';

// Create mocks
const mockLogger = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	success: vi.fn(),
};

const mockClientOrm = vi.fn().mockReturnValue({});
const mockClient = vi.fn().mockReturnValue({
	orm: mockClientOrm,
});

// Mock local modules
vi.mock('./utils/logger', () => ({
	initLogger: vi.fn(() => mockLogger),
}));

vi.mock('./utils/create-telemetry-options', () => ({
	createTelemetryOptions: vi.fn((appName, config) => ({
		enabled: config?.enabled ?? false,
		tracer: config?.tracer,
		meter: config?.meter,
		defaultAttributes: {
			'service.name': appName,
			'service.version': '1.0.0',
			...config?.defaultAttributes,
		},
	})),
	isTelemetryEnabled: vi.fn(
		(options) => options?.advanced?.telemetry?.enabled === true
	),
}));

vi.mock('./db/registry', () => ({
	createRegistry: vi.fn().mockReturnValue({}),
}));

vi.mock('./db/schema', () => ({
	DB: {
		client: mockClient,
	},
}));

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.clearAllMocks();
});

function createOptions(overrides: Partial<C15TOptions> = {}): C15TOptions {
	return {
		trustedOrigins: [],
		adapter: {} as C15TOptions['adapter'],
		...overrides,
	};
}

describe('init', () => {
	it('uses "c15t" as default appName when none is provided', () => {
		const options = createOptions();
		const context = init(options);

		expect(context.appName).toBe('c15t');
		expect(mockClient).toHaveBeenCalledTimes(1);
	});

	it('uses the provided appName', () => {
		const options = createOptions({ appName: 'MyAmazingApp' });
		const context = init(options);

		expect(context.appName).toBe('MyAmazingApp');
	});

	it('telemetry is disabled by default (opt-in)', () => {
		const options = createOptions();
		init(options);

		// Check that logger was called with telemetry disabled message
		expect(mockLogger.debug).toHaveBeenCalledWith(
			'Telemetry is disabled (opt-in required)'
		);
	});

	it('logs telemetry enabled when explicitly enabled', () => {
		const options = createOptions({
			advanced: {
				telemetry: {
					enabled: true,
				},
			},
		});
		init(options);

		// Check that logger was called with telemetry enabled message
		expect(mockLogger.debug).toHaveBeenCalledWith(
			'Telemetry is enabled',
			expect.objectContaining({
				hasTracer: false,
				hasMeter: false,
			})
		);
	});

	it('creates context with required properties', () => {
		const options = createOptions();
		const context = init(options);

		expect(context).toHaveProperty('appName');
		expect(context).toHaveProperty('logger');
		expect(context).toHaveProperty('db');
		expect(context).toHaveProperty('registry');
		expect(context).toHaveProperty('trustedOrigins');
	});
});
