import type { Logger } from '@c15t/logger';
import { PostHog } from 'posthog-node';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createTelemetry,
	Telemetry,
	TelemetryEventName,
} from '../../src/utils/telemetry';

// Define a type for our mocked PostHog instance
interface MockPostHog {
	capture: ReturnType<typeof vi.fn>;
	flush: ReturnType<typeof vi.fn>;
	shutdown: ReturnType<typeof vi.fn>;
	debug: ReturnType<typeof vi.fn>;
}

// Mock PostHog
vi.mock('posthog-node', () => {
	const mockCapture = vi.fn();
	const mockFlush = vi.fn();
	const mockShutdown = vi.fn().mockResolvedValue(undefined);
	const mockDebug = vi.fn();

	return {
		PostHog: vi.fn(function PostHog() {
			return {
				capture: mockCapture,
				flush: mockFlush,
				shutdown: mockShutdown,
				debug: mockDebug,
			};
		}),
	};
});

describe('Telemetry', () => {
	let telemetry: Telemetry;
	let mockPostHog: MockPostHog;
	let mockLogger: Pick<Logger, 'debug' | 'error' | 'info' | 'warn'>;

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();

		// Create mock logger
		mockLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
		};

		// Create a PostHog instance to get the mock functions
		mockPostHog = new PostHog('dummy-key') as unknown as MockPostHog;

		// Create telemetry instance with disabled actual API calls
		telemetry = new Telemetry({
			client: mockPostHog as unknown as PostHog,
			logger: mockLogger as Logger,
		});
	});

	it('should create a telemetry instance', () => {
		expect(telemetry).toBeInstanceOf(Telemetry);
	});

	it('should create telemetry with createTelemetry factory', () => {
		const instance = createTelemetry();
		expect(instance).toBeInstanceOf(Telemetry);
	});

	it('should respect disabled flag', () => {
		const disabledTelemetry = new Telemetry({
			disabled: true,
			client: mockPostHog as unknown as PostHog,
		});
		disabledTelemetry.trackEvent(TelemetryEventName.CLI_INVOKED, {
			test: true,
		});
		expect(mockPostHog.capture).not.toHaveBeenCalled();
	});

	it('should respect debug flag', () => {
		const debugTelemetry = new Telemetry({
			debug: true,
			client: mockPostHog as unknown as PostHog,
			logger: mockLogger as Logger,
		});
		debugTelemetry.trackEvent(TelemetryEventName.CLI_INVOKED, {
			test: true,
		});
		expect(mockLogger.debug).toHaveBeenCalledWith(
			'Using custom PostHog client'
		);
		expect(mockLogger.debug).toHaveBeenCalledWith(
			'Sending telemetry event: cli.invoked'
		);
	});

	it('should track events', () => {
		telemetry.trackEvent(TelemetryEventName.CLI_INVOKED, { test: true });
		expect(mockPostHog.capture).toHaveBeenCalledWith(
			expect.objectContaining({
				event: TelemetryEventName.CLI_INVOKED,
				properties: expect.objectContaining({ test: true }),
			})
		);
		expect(mockPostHog.flush).toHaveBeenCalled();
	});

	it('should track commands', () => {
		telemetry.trackCommand('test', ['arg1', 'arg2'], { flag1: true });
		expect(mockPostHog.capture).toHaveBeenCalledWith(
			expect.objectContaining({
				event: TelemetryEventName.COMMAND_EXECUTED,
				properties: expect.objectContaining({
					command: 'test',
					args: 'arg1 arg2',
				}),
			})
		);
	});

	it('should track errors', () => {
		const testError = new Error('Test error');
		telemetry.trackError(testError, 'test-command');
		expect(mockPostHog.capture).toHaveBeenCalledWith(
			expect.objectContaining({
				event: TelemetryEventName.ERROR_OCCURRED,
				properties: expect.objectContaining({
					command: 'test-command',
					error: 'Test error',
					errorName: 'Error',
				}),
			})
		);
	});

	it('should disable telemetry', () => {
		telemetry.disable();
		telemetry.trackEvent(TelemetryEventName.CLI_INVOKED);
		expect(mockPostHog.capture).not.toHaveBeenCalled();
	});

	it('should enable telemetry', () => {
		telemetry.disable();
		telemetry.enable();
		telemetry.trackEvent(TelemetryEventName.CLI_INVOKED);
		expect(mockPostHog.capture).toHaveBeenCalled();
	});

	it('should report disabled status', () => {
		expect(telemetry.isDisabled()).toBe(false);
		telemetry.disable();
		expect(telemetry.isDisabled()).toBe(true);
	});

	it('should shut down the client', async () => {
		await telemetry.shutdown();
		expect(mockPostHog.shutdown).toHaveBeenCalled();
	});

	it('should handle tracking errors gracefully', () => {
		// Simulate error during event capture
		(mockPostHog.capture as ReturnType<typeof vi.fn>).mockImplementationOnce(
			() => {
				throw new Error('Capture error');
			}
		);

		// Create telemetry with debug enabled
		const debugTelemetry = new Telemetry({
			debug: true,
			client: mockPostHog as unknown as PostHog,
			logger: mockLogger as Logger,
		});

		// This should not throw even though capture fails
		expect(() =>
			debugTelemetry.trackEvent(TelemetryEventName.CLI_INVOKED)
		).not.toThrow();

		// Should log the error
		expect(mockLogger.debug).toHaveBeenCalledWith(
			'Using custom PostHog client'
		);
		expect(mockLogger.debug).toHaveBeenCalledWith(
			'Sending telemetry event: cli.invoked'
		);
		expect(mockLogger.debug).toHaveBeenCalledWith(
			'Error sending telemetry event cli.invoked:',
			expect.any(Error)
		);
	});

	it('should filter out undefined values from properties', () => {
		telemetry.trackEvent(TelemetryEventName.CLI_INVOKED, {
			defined: 'value',
			undefinedValue: undefined,
		});

		expect(mockPostHog.capture).toHaveBeenCalledWith(
			expect.objectContaining({
				properties: expect.objectContaining({ defined: 'value' }),
			})
		);

		// Check that undefined value is not in properties
		const captureCall = (mockPostHog.capture as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		expect(captureCall.properties).not.toHaveProperty('undefinedValue');
	});

	it('should not track commands when disabled', () => {
		telemetry.disable();
		telemetry.trackCommand('test');
		expect(mockPostHog.capture).not.toHaveBeenCalled();
	});

	it('should allow setting a custom logger', () => {
		const newLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			success: vi.fn(),
		} as unknown as Logger;

		const debugTelemetry = new Telemetry({
			debug: true,
			client: mockPostHog as unknown as PostHog,
			logger: newLogger,
		});

		debugTelemetry.trackEvent(TelemetryEventName.CLI_INVOKED);
		expect(newLogger.debug).toHaveBeenCalledWith(
			'Sending telemetry event: cli.invoked'
		);
	});
});
