/**
 * @fileoverview Unit tests for ConsoleDestination class.
 * Tests event logging, settings, and error handling.
 */

import type {
	AliasEvent,
	ConsentEvent,
	EventContext,
	GroupEvent,
	IdentifyEvent,
	PageEvent,
	TrackEvent,
} from '@c15t/backend/v2';
import type { Logger } from '@doubletie/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleDestination } from '../index';

/**
 * Mock logger for testing
 */
function createMockLogger(): Logger {
	return {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
		child: vi.fn().mockReturnThis(),
	} as unknown as Logger;
}

/**
 * Create a test event context
 */
function createTestContext(
	overrides: Partial<EventContext> = {}
): EventContext {
	return {
		sessionId: 'test-session-id',
		sessionStart: new Date(),
		consent: {
			necessary: true,
			measurement: true,
			marketing: false,
			functionality: false,
			experience: false,
		},
		userAgent: 'test-user-agent',
		ip: '127.0.0.1',
		referrer: 'https://example.com',
		...overrides,
	};
}

/**
 * Create a test track event
 */
function createTrackEvent(overrides: Partial<TrackEvent> = {}): TrackEvent {
	return {
		type: 'track',
		name: 'test-event',
		properties: { test: true },
		timestamp: new Date().toISOString(),
		messageId: 'test-message-id',
		anonymousId: 'test-anon-id',
		sessionId: 'test-session-id',
		context: {},
		...overrides,
	};
}

/**
 * Create a test page event
 */
function createPageEvent(overrides: Partial<PageEvent> = {}): PageEvent {
	return {
		type: 'page',
		name: 'test-page',
		properties: { test: true },
		timestamp: new Date().toISOString(),
		messageId: 'test-message-id',
		anonymousId: 'test-anon-id',
		sessionId: 'test-session-id',
		context: {},
		...overrides,
	};
}

/**
 * Create a test identify event
 */
function createIdentifyEvent(
	overrides: Partial<IdentifyEvent> = {}
): IdentifyEvent {
	return {
		type: 'identify',
		userId: 'test-user-id',
		traits: { name: 'Test User' },
		timestamp: new Date().toISOString(),
		messageId: 'test-message-id',
		anonymousId: 'test-anon-id',
		sessionId: 'test-session-id',
		context: {},
		...overrides,
	};
}

/**
 * Create a test group event
 */
function createGroupEvent(overrides: Partial<GroupEvent> = {}): GroupEvent {
	return {
		type: 'group',
		groupId: 'test-group-id',
		traits: { name: 'Test Group' },
		timestamp: new Date().toISOString(),
		messageId: 'test-message-id',
		anonymousId: 'test-anon-id',
		sessionId: 'test-session-id',
		context: {},
		...overrides,
	};
}

/**
 * Create a test alias event
 */
function createAliasEvent(overrides: Partial<AliasEvent> = {}): AliasEvent {
	return {
		type: 'alias',
		properties: { previousId: 'test-previous-id' },
		timestamp: new Date().toISOString(),
		messageId: 'test-message-id',
		anonymousId: 'test-anon-id',
		sessionId: 'test-session-id',
		context: {},
		...overrides,
	};
}

/**
 * Create a test consent event
 */
function createConsentEvent(
	overrides: Partial<ConsentEvent> = {}
): ConsentEvent {
	return {
		type: 'consent',
		properties: {
			action: 'granted',
			source: 'banner',
			previousConsent: undefined,
		},
		timestamp: new Date().toISOString(),
		messageId: 'test-message-id',
		anonymousId: 'test-anon-id',
		sessionId: 'test-session-id',
		context: {},
		...overrides,
	};
}

describe('ConsoleDestination', () => {
	let destination: ConsoleDestination;
	let mockLogger: Logger;
	let consoleSpy: {
		debug: ReturnType<typeof vi.spyOn>;
		info: ReturnType<typeof vi.spyOn>;
		warn: ReturnType<typeof vi.spyOn>;
		error: ReturnType<typeof vi.spyOn>;
	};

	beforeEach(() => {
		mockLogger = createMockLogger();
		destination = new ConsoleDestination(mockLogger);

		// Spy on console methods
		consoleSpy = {
			debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
			info: vi.spyOn(console, 'info').mockImplementation(() => {}),
			warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
			error: vi.spyOn(console, 'error').mockImplementation(() => {}),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('constructor', () => {
		it('should initialize with correct properties', () => {
			expect(destination.name).toBe('Console');
			expect(destination.description).toBe(
				'Console logging destination for debugging'
			);
			expect(destination.category).toBe('other');
			expect(destination.version).toBe('1.0.0');
			expect(destination.gdprCompliant).toBe(true);
			expect(destination.requiredConsent).toEqual(['necessary']);
		});
	});

	describe('initialize', () => {
		it('should initialize with default settings', async () => {
			await destination.initialize({
				logLevel: 'info',
				includeContext: true,
				includeTimestamp: true,
				includeEventId: true,
			});

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Console destination initialized',
				expect.objectContaining({
					logLevel: 'info',
					includeContext: true,
					includeTimestamp: true,
					includeEventId: true,
				})
			);
		});

		it('should initialize with custom settings', async () => {
			const settings = {
				logLevel: 'debug' as const,
				includeContext: false,
				includeTimestamp: false,
				includeEventId: false,
			};

			await destination.initialize(settings);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Console destination initialized',
				expect.objectContaining(settings)
			);
		});

		it('should throw error for invalid log level', async () => {
			const invalidSettings = {
				logLevel: 'invalid' as any,
				includeContext: true,
				includeTimestamp: true,
				includeEventId: true,
			};

			await expect(destination.initialize(invalidSettings)).rejects.toThrow();
		});
	});

	describe('testConnection', () => {
		it('should always return true', async () => {
			const result = await destination.testConnection();

			expect(result).toBe(true);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Console connection test (always succeeds)'
			);
		});
	});

	describe('track', () => {
		beforeEach(async () => {
			await destination.initialize({
				logLevel: 'info',
				includeContext: true,
				includeTimestamp: true,
				includeEventId: true,
			});
		});

		it('should log track event to console', async () => {
			const event = createTrackEvent();
			const context = createTestContext();

			await destination.track(event, context);

			expect(consoleSpy.info).toHaveBeenCalledWith(
				'[c15t:console] track:',
				expect.objectContaining({
					type: 'track',
					event: expect.objectContaining({
						name: 'test-event',
						properties: { test: true },
					}),
					context: expect.objectContaining({
						sessionId: 'test-session-id',
					}),
					logTimestamp: expect.any(String),
					eventId: 'test-message-id',
				})
			);
		});

		it('should use correct log level', async () => {
			await destination.initialize({
				logLevel: 'debug',
				includeContext: true,
				includeTimestamp: true,
				includeEventId: true,
			});

			const event = createTrackEvent();
			const context = createTestContext();

			await destination.track(event, context);

			expect(consoleSpy.debug).toHaveBeenCalled();
			expect(consoleSpy.info).not.toHaveBeenCalled();
		});

		it('should exclude context when disabled', async () => {
			await destination.initialize({
				logLevel: 'info',
				includeContext: false,
				includeTimestamp: true,
				includeEventId: true,
			});

			const event = createTrackEvent();
			const context = createTestContext();

			await destination.track(event, context);

			expect(consoleSpy.info).toHaveBeenCalledWith(
				'[c15t:console] track:',
				expect.objectContaining({
					type: 'track',
					event: expect.any(Object),
					logTimestamp: expect.any(String),
					eventId: expect.any(String),
				})
			);

			const loggedData = consoleSpy.info.mock.calls[0]?.[1] as any;
			expect(loggedData.context).toBeUndefined();
		});

		it('should exclude timestamp when disabled', async () => {
			await destination.initialize({
				logLevel: 'info',
				includeContext: true,
				includeTimestamp: false,
				includeEventId: true,
			});

			const event = createTrackEvent();
			const context = createTestContext();

			await destination.track(event, context);

			const loggedData = consoleSpy.info.mock.calls[0]?.[1] as any;
			expect(loggedData.logTimestamp).toBeUndefined();
		});

		it('should exclude event ID when disabled', async () => {
			await destination.initialize({
				logLevel: 'info',
				includeContext: true,
				includeTimestamp: true,
				includeEventId: false,
			});

			const event = createTrackEvent();
			const context = createTestContext();

			await destination.track(event, context);

			const loggedData = consoleSpy.info.mock.calls[0]?.[1] as any;
			expect(loggedData.eventId).toBeUndefined();
		});
	});

	describe('page', () => {
		beforeEach(async () => {
			await destination.initialize({
				logLevel: 'info',
				includeContext: true,
				includeTimestamp: true,
				includeEventId: true,
			});
		});

		it('should log page event to console', async () => {
			const event = createPageEvent();
			const context = createTestContext();

			await destination.page(event, context);

			expect(consoleSpy.info).toHaveBeenCalledWith(
				'[c15t:console] page:',
				expect.objectContaining({
					type: 'page',
					event: expect.objectContaining({
						name: 'test-page',
						properties: { test: true },
					}),
				})
			);
		});
	});

	describe('identify', () => {
		beforeEach(async () => {
			await destination.initialize({
				logLevel: 'info',
				includeContext: true,
				includeTimestamp: true,
				includeEventId: true,
			});
		});

		it('should log identify event to console', async () => {
			const event = createIdentifyEvent();
			const context = createTestContext();

			await destination.identify(event, context);

			expect(consoleSpy.info).toHaveBeenCalledWith(
				'[c15t:console] identify:',
				expect.objectContaining({
					type: 'identify',
					event: expect.objectContaining({
						userId: 'test-user-id',
						traits: { name: 'Test User' },
					}),
				})
			);
		});
	});

	describe('group', () => {
		beforeEach(async () => {
			await destination.initialize({
				logLevel: 'info',
				includeContext: true,
				includeTimestamp: true,
				includeEventId: true,
			});
		});

		it('should log group event to console', async () => {
			const event = createGroupEvent();
			const context = createTestContext();

			await destination.group(event, context);

			expect(consoleSpy.info).toHaveBeenCalledWith(
				'[c15t:console] group:',
				expect.objectContaining({
					type: 'group',
					event: expect.objectContaining({
						groupId: 'test-group-id',
						traits: { name: 'Test Group' },
					}),
				})
			);
		});
	});

	describe('alias', () => {
		beforeEach(async () => {
			await destination.initialize({
				logLevel: 'info',
				includeContext: true,
				includeTimestamp: true,
				includeEventId: true,
			});
		});

		it('should log alias event to console', async () => {
			const event = createAliasEvent();
			const context = createTestContext();

			await destination.alias(event, context);

			expect(consoleSpy.info).toHaveBeenCalledWith(
				'[c15t:console] alias:',
				expect.objectContaining({
					type: 'alias',
					event: expect.objectContaining({
						properties: { previousId: 'test-previous-id' },
					}),
				})
			);
		});
	});

	describe('consent', () => {
		beforeEach(async () => {
			await destination.initialize({
				logLevel: 'info',
				includeContext: true,
				includeTimestamp: true,
				includeEventId: true,
			});
		});

		it('should log consent event to console', async () => {
			const event = createConsentEvent();
			const context = createTestContext();

			await destination.consent(event, context);

			expect(consoleSpy.info).toHaveBeenCalledWith(
				'[c15t:console] consent:',
				expect.objectContaining({
					type: 'consent',
					event: expect.objectContaining({
						properties: {
							action: 'granted',
							source: 'banner',
							previousConsent: undefined,
						},
					}),
				})
			);
		});
	});

	describe('onError', () => {
		it('should log errors to console and logger', async () => {
			const event = createTrackEvent();
			const error = new Error('Test error');

			await destination.onError(error, event);

			expect(consoleSpy.error).toHaveBeenCalledWith(
				'[c15t:console] Error processing event:',
				expect.objectContaining({
					eventType: 'track',
					eventId: 'test-message-id',
					error: 'Test error',
					stack: expect.any(String),
				})
			);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Console destination error',
				expect.objectContaining({
					eventType: 'track',
					eventId: 'test-message-id',
					error: 'Test error',
					stack: expect.any(String),
				})
			);
		});
	});

	describe('destroy', () => {
		it('should log destruction message', async () => {
			await destination.destroy();

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Console destination destroyed'
			);
		});
	});
});
