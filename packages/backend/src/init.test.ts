import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { init } from './init';
import type { C15TOptions } from './types';

// Use vi.hoisted so these are available inside vi.mock factories (which are hoisted)
const {
	mockLogger,
	mockClient,
	mockNames,
	mockPrefix,
	mockBuildNamingVariants,
} = vi.hoisted(() => {
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

	type Factory = {
		client: typeof mockClient;
		names: ReturnType<typeof vi.fn> & { prefix: ReturnType<typeof vi.fn> };
	};
	const factory = { client: mockClient } as Factory;
	const mockPrefix = vi.fn(() => factory);
	const mockNames = vi.fn(() => factory) as Factory['names'];
	mockNames.prefix = mockPrefix;
	factory.names = mockNames;

	const mockBuildNamingVariants = vi.fn(
		() => null as null | Record<string, { sql: string; mongodb: string }>
	);

	return {
		mockLogger,
		mockClient,
		mockNames,
		mockPrefix,
		mockBuildNamingVariants,
	};
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
	isTelemetryEnabled: vi.fn((options) => options?.telemetry?.enabled === true),
}));

vi.mock('./db/registry', () => ({
	createRegistry: vi.fn().mockReturnValue({}),
}));

vi.mock('./db/schema', () => ({
	DB: {
		client: mockClient,
		names: mockNames,
	},
	buildNamingVariants: mockBuildNamingVariants,
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
			telemetry: {
				enabled: true,
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

	it('throws when policyPacks use model=iab without top-level iab.enabled', () => {
		const options = createOptions({
			policyPacks: [
				{
					id: 'policy_iab',
					match: { countries: ['DE'] },
					consent: { model: 'iab' },
				},
			],
			iab: { enabled: false },
		});

		expect(() => init(options)).toThrow(
			'Policies using consent.model="iab" require top-level iab.enabled=true'
		);
	});

	it('logs policy warnings for non-fatal pack risks', () => {
		const options = createOptions({
			policyPacks: [
				{
					id: 'policy_country_only',
					match: { countries: ['US'] },
				},
			],
		});

		init(options);

		expect(mockLogger.warn).toHaveBeenCalledWith(
			'policyPacks: No default policy configured. Requests that do not match region/country will have no active policy.'
		);
	});

	it('applies naming variants via db.names() before creating the client', () => {
		const variants = {
			consent: { sql: 'consent_v2', mongodb: 'consent_v2' },
		};
		mockBuildNamingVariants.mockReturnValueOnce(variants);

		const options = createOptions({
			naming: { tables: { consent: { name: 'consent_v2' } } },
		});
		init(options);

		expect(mockBuildNamingVariants).toHaveBeenCalledWith(options.naming);
		expect(mockNames).toHaveBeenCalledWith(variants);
		const namesOrder = mockNames.mock.invocationCallOrder[0] ?? 0;
		const clientOrder = mockClient.mock.invocationCallOrder[0] ?? 0;
		expect(namesOrder).toBeLessThan(clientOrder);
	});

	it('skips db.names() when buildNamingVariants returns null (no-op fast path)', () => {
		mockBuildNamingVariants.mockReturnValueOnce(null);

		init(createOptions());

		expect(mockNames).not.toHaveBeenCalled();
		expect(mockClient).toHaveBeenCalledTimes(1);
	});

	it('applies tablePrefix via db.names.prefix() before creating the client', () => {
		const options = createOptions({ tablePrefix: 'c15t_' });
		init(options);

		expect(mockPrefix).toHaveBeenCalledWith('c15t_');
		const prefixOrder = mockPrefix.mock.invocationCallOrder[0] ?? 0;
		const clientOrder = mockClient.mock.invocationCallOrder[0] ?? 0;
		expect(prefixOrder).toBeLessThan(clientOrder);
	});
});
