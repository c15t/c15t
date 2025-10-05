/**
 * @fileoverview Unit tests for PostHogDestination class.
 * Tests event handling, error handling, and connection testing.
 */

import type { EventContext, TrackEvent } from '@c15t/backend/v2';
import type { Logger } from '@doubletie/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostHogDestination } from '../index';

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

describe('PostHogDestination', () => {
	let destination: PostHogDestination;
	let mockLogger: Logger;

	beforeEach(() => {
		mockLogger = createMockLogger();
		destination = new PostHogDestination(mockLogger);
	});

	describe('constructor', () => {
		it('should initialize with correct properties', () => {
			expect(destination.name).toBe('PostHog');
			expect(destination.description).toBe(
				'PostHog product analytics destination'
			);
			expect(destination.category).toBe('analytics');
			expect(destination.version).toBe('1.0.0');
			expect(destination.gdprCompliant).toBe(true);
			expect(destination.requiredConsent).toEqual(['measurement']);
		});
	});

	describe('initialize', () => {
		it('should initialize with valid settings', async () => {
			const settings = {
				apiKey: 'test-api-key',
				host: 'https://app.posthog.com',
				flushAt: 20,
				flushInterval: 10000,
			};

			await destination.initialize(settings);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'PostHog destination initialized',
				expect.objectContaining({
					host: 'https://app.posthog.com',
					flushAt: 20,
					flushInterval: 10000,
				})
			);
		});

		it('should use default settings when not provided', async () => {
			const settings = {
				apiKey: 'test-api-key',
				host: 'https://app.posthog.com',
				flushAt: 20,
				flushInterval: 10000,
			};

			await destination.initialize(settings);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'PostHog destination initialized',
				expect.objectContaining({
					host: 'https://app.posthog.com',
					flushAt: 20,
					flushInterval: 10000,
				})
			);
		});

		it('should throw error for invalid settings', async () => {
			const invalidSettings = {
				apiKey: '', // Invalid: empty string
				host: 'https://app.posthog.com',
				flushAt: 20,
				flushInterval: 10000,
			};

			await expect(destination.initialize(invalidSettings)).rejects.toThrow();
		});
	});

	describe('testConnection', () => {
		it('should return false when client is not initialized', async () => {
			const result = await destination.testConnection();

			expect(result).toBe(false);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'PostHog client not initialized'
			);
		});
	});

	describe('track', () => {
		it('should throw error when client is not initialized', async () => {
			const event = createTrackEvent();
			const context = createTestContext();

			await expect(destination.track(event, context)).rejects.toThrow(
				'PostHog client not initialized'
			);
		});
	});

	describe('onError', () => {
		it('should log errors without throwing', async () => {
			const event = createTrackEvent();
			const error = new Error('Test error');

			await destination.onError(error, event);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'PostHog destination error',
				expect.objectContaining({
					eventType: 'track',
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
				'PostHog destination destroyed'
			);
		});
	});
});
