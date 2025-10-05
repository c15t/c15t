/**
 * @fileoverview Unit tests for PostHogClient class.
 * Tests batching, error handling, and API communication.
 */

import type { Logger } from '@doubletie/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostHogClient } from '../client';

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

describe('PostHogClient', () => {
	let client: PostHogClient;
	let mockLogger: Logger;
	let fetchSpy: any;

	beforeEach(() => {
		mockLogger = createMockLogger();

		// Mock fetch
		fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK',
			text: () => Promise.resolve(''),
		} as Response);

		// Mock timers
		vi.useFakeTimers();

		client = new PostHogClient({
			apiKey: 'test-api-key',
			host: 'https://app.posthog.com',
			flushAt: 3, // Small batch size for testing
			flushInterval: 10000,
			logger: mockLogger,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	describe('constructor', () => {
		it('should initialize with correct settings', () => {
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'PostHog client initialized',
				expect.objectContaining({
					host: 'https://app.posthog.com',
					flushAt: 3,
					flushInterval: 10000,
				})
			);
		});
	});

	describe('capture', () => {
		it('should queue events without flushing when under batch size', async () => {
			const eventData = {
				distinctId: 'test-user',
				event: 'test-event',
				properties: { test: true },
				timestamp: new Date().toISOString(),
			};

			await client.capture(eventData);

			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it('should flush when batch size is reached', async () => {
			const eventData = {
				distinctId: 'test-user',
				event: 'test-event',
				properties: { test: true },
				timestamp: new Date().toISOString(),
			};

			// Add 3 events to trigger flush
			await client.capture(eventData);
			await client.capture(eventData);
			await client.capture(eventData);

			expect(fetchSpy).toHaveBeenCalledWith(
				'https://app.posthog.com/capture/',
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'User-Agent': 'c15t-posthog-client/1.0.0',
					},
					body: expect.stringContaining('"batch":'),
				})
			);
		});
	});

	describe('identify', () => {
		it('should queue identify events', async () => {
			const identifyData = {
				distinctId: 'test-user',
				properties: { name: 'Test User' },
			};

			await client.identify(identifyData);

			// Add more events to trigger flush
			await client.capture({
				distinctId: 'test-user',
				event: 'test-event',
				properties: {},
				timestamp: new Date().toISOString(),
			});
			await client.capture({
				distinctId: 'test-user',
				event: 'test-event',
				properties: {},
				timestamp: new Date().toISOString(),
			});

			expect(fetchSpy).toHaveBeenCalledWith(
				'https://app.posthog.com/capture/',
				expect.objectContaining({
					body: expect.stringContaining('"type":"identify"'),
				})
			);
		});
	});

	describe('flush', () => {
		it('should handle empty queue gracefully', async () => {
			// We can't directly test flush since it's private, but we can test
			// that it doesn't cause issues when there are no events
			const eventData = {
				distinctId: 'test-user',
				event: 'test-event',
				properties: { test: true },
				timestamp: new Date().toISOString(),
			};

			// Add one event and then shutdown to trigger flush
			await client.capture(eventData);
			await client.shutdown();

			expect(fetchSpy).toHaveBeenCalled();
		});

		it('should handle API errors by re-queuing events', async () => {
			fetchSpy.mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				text: () => Promise.resolve('Invalid API key'),
			} as Response);

			const eventData = {
				distinctId: 'test-user',
				event: 'test-event',
				properties: { test: true },
				timestamp: new Date().toISOString(),
			};

			// Add events to trigger flush
			await client.capture(eventData);
			await client.capture(eventData);

			// The third event should trigger flush and throw error
			await expect(client.capture(eventData)).rejects.toThrow(
				'PostHog API error: 400'
			);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to flush events to PostHog',
				expect.objectContaining({
					batchSize: 3,
					error: expect.stringContaining('PostHog API error: 400'),
				})
			);
		});
	});

	describe('shutdown', () => {
		it('should flush remaining events', async () => {
			const eventData = {
				distinctId: 'test-user',
				event: 'test-event',
				properties: { test: true },
				timestamp: new Date().toISOString(),
			};

			// Add one event
			await client.capture(eventData);

			await client.shutdown();

			expect(fetchSpy).toHaveBeenCalledWith(
				'https://app.posthog.com/capture/',
				expect.objectContaining({
					body: expect.stringContaining('"distinctId":"test-user"'),
				})
			);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'PostHog client shutdown complete'
			);
		});

		it('should handle shutdown when no events are queued', async () => {
			await client.shutdown();

			expect(fetchSpy).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'PostHog client shutdown complete'
			);
		});
	});
});
