/**
 * @fileoverview Unit tests for enhanced analytics process handler.
 * Tests the EventProcessor integration, error handling, and consent event processing.
 */

import type { Logger } from '@doubletie/logger';
import { ORPCError } from '@orpc/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsError, processAnalyticsEvents } from './process.handler';

// Mock the ORPC handler to return the actual handler function
vi.mock('../../contracts', () => ({
	os: {
		analytics: {
			process: {
				handler: (fn: unknown) => fn,
			},
		},
	},
}));

// Extract the actual handler function from the ORPC handler
type HandlerFunction = (args: {
	input: unknown;
	context: unknown;
}) => Promise<unknown>;
const handlerFunction = processAnalyticsEvents as unknown as HandlerFunction;

describe('Enhanced Analytics Process Handler', () => {
	let mockLogger: Logger;
	let mockEventProcessor: {
		processEvents: ReturnType<typeof vi.fn>;
	};
	let mockDestinationManager: {
		processEvents: ReturnType<typeof vi.fn>;
	};
	let mockContext: {
		logger: Logger;
		eventProcessor: typeof mockEventProcessor;
		destinationManager: typeof mockDestinationManager;
	};

	beforeEach(() => {
		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		} as Logger & {
			info: ReturnType<typeof vi.fn> & {
				mockImplementation: ReturnType<typeof vi.fn>['mockImplementation'];
			};
			warn: ReturnType<typeof vi.fn>;
			error: ReturnType<typeof vi.fn>;
			debug: ReturnType<typeof vi.fn>;
		};

		mockEventProcessor = {
			processEvents: vi.fn(),
		};

		mockDestinationManager = {
			processEvents: vi.fn(),
		};

		mockContext = {
			logger: mockLogger,
			eventProcessor: mockEventProcessor,
			destinationManager: mockDestinationManager,
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Input Validation', () => {
		it('should throw ValidationError when events array is missing', async () => {
			const input = {
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			await expect(
				handlerFunction({ input, context: mockContext })
			).rejects.toThrow(ORPCError);
		});

		it('should throw ValidationError when events is not an array', async () => {
			const input = {
				events: 'not-an-array',
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			await expect(
				handlerFunction({ input, context: mockContext })
			).rejects.toThrow(ORPCError);
		});

		it('should throw ValidationError when consent object is missing', async () => {
			const input = {
				events: [
					{
						type: 'track',
						name: 'Button Clicked',
						properties: { buttonId: 'header-cta' },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-789',
					},
				],
			};

			await expect(
				handlerFunction({ input, context: mockContext })
			).rejects.toThrow(ORPCError);
		});
	});

	describe('Service Availability', () => {
		it('should throw AnalyticsError when EventProcessor is not available', async () => {
			const input = {
				events: [
					{
						type: 'track',
						name: 'Button Clicked',
						properties: { buttonId: 'header-cta' },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-789',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			const contextWithoutEventProcessor = {
				...mockContext,
				eventProcessor: null,
			};

			await expect(
				handlerFunction({ input, context: contextWithoutEventProcessor })
			).rejects.toThrow(ORPCError);
		});

		it('should throw AnalyticsError when DestinationManager is not available', async () => {
			const input = {
				events: [
					{
						type: 'track',
						name: 'Button Clicked',
						properties: { buttonId: 'header-cta' },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-789',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			const contextWithoutDestinationManager = {
				...mockContext,
				destinationManager: null,
			};

			await expect(
				handlerFunction({ input, context: contextWithoutDestinationManager })
			).rejects.toThrow(ORPCError);
		});
	});

	describe('Event Processing', () => {
		it('should process events through EventProcessor and DestinationManager', async () => {
			const input = {
				events: [
					{
						type: 'track',
						name: 'Button Clicked',
						properties: { buttonId: 'header-cta' },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-789',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			const processedEvents = [
				{
					...input.events[0],
					processed: true,
				},
			];

			mockEventProcessor.processEvents.mockResolvedValue(processedEvents);
			mockDestinationManager.processEvents.mockResolvedValue(undefined);

			const result = await handlerFunction({
				input,
				context: mockContext,
			});

			expect(mockEventProcessor.processEvents).toHaveBeenCalledWith(
				input.events,
				expect.objectContaining({
					sessionId: 'session-456',
					consent: input.consent,
					userId: undefined,
					anonymousId: 'anon-123',
				})
			);

			expect(mockDestinationManager.processEvents).toHaveBeenCalledWith(
				processedEvents,
				expect.objectContaining({
					sessionId: 'session-456',
					consent: input.consent,
				})
			);

			expect(result).toEqual({
				success: true,
				processed: 1,
				filtered: 0,
				errors: 0,
				results: [
					{
						eventId: 'msg-789',
						status: 'processed',
						destination: 'analytics-pipeline',
					},
				],
				processedAt: expect.any(String),
			});
		});

		it('should generate session ID when not provided', async () => {
			const input = {
				events: [
					{
						type: 'track',
						name: 'Button Clicked',
						properties: { buttonId: 'header-cta' },
						anonymousId: 'anon-123',
						timestamp: new Date().toISOString(),
						messageId: 'msg-789',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			mockEventProcessor.processEvents.mockResolvedValue(input.events);
			mockDestinationManager.processEvents.mockResolvedValue(undefined);

			await handlerFunction({ input, context: mockContext });

			expect(mockEventProcessor.processEvents).toHaveBeenCalledWith(
				input.events,
				expect.objectContaining({
					sessionId: expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
				})
			);
		});
	});

	describe('Consent Event Handling', () => {
		it('should handle consent events specially', async () => {
			const input = {
				events: [
					{
						type: 'consent',
						action: 'granted',
						preferences: {
							measurement: true,
							marketing: false,
						},
						source: 'banner',
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-consent',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			mockEventProcessor.processEvents.mockResolvedValue(input.events);
			mockDestinationManager.processEvents.mockResolvedValue(undefined);

			await handlerFunction({ input, context: mockContext });

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Consent event processed',
				expect.objectContaining({
					sessionId: 'session-456',
					action: 'granted',
					source: 'banner',
				})
			);
		});

		it('should handle consent event processing errors gracefully', async () => {
			const input = {
				events: [
					{
						type: 'consent',
						action: 'granted',
						preferences: {
							measurement: true,
							marketing: false,
						},
						source: 'banner',
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-consent',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			// Mock consent handling to throw an error
			(mockLogger.info as ReturnType<typeof vi.fn>).mockImplementation(() => {
				throw new Error('Database connection failed');
			});

			mockEventProcessor.processEvents.mockResolvedValue(input.events);
			mockDestinationManager.processEvents.mockResolvedValue(undefined);

			// Should throw ORPCError when consent processing fails
			await expect(
				handlerFunction({ input, context: mockContext })
			).rejects.toThrow(ORPCError);

			// Should log the error
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to process analytics events',
				expect.objectContaining({
					error: 'Database connection failed',
					input: expect.objectContaining({
						eventCount: 1,
						hasConsent: true,
					}),
				})
			);
		});
	});

	describe('Error Handling', () => {
		it('should handle EventProcessor errors', async () => {
			const input = {
				events: [
					{
						type: 'track',
						name: 'Button Clicked',
						properties: { buttonId: 'header-cta' },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-789',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			mockEventProcessor.processEvents.mockRejectedValue(
				new Error('Event processing failed')
			);

			await expect(
				handlerFunction({ input, context: mockContext })
			).rejects.toThrow(ORPCError);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to process analytics events',
				expect.objectContaining({
					error: 'Event processing failed',
					input: {
						eventCount: 1,
						hasConsent: true,
					},
				})
			);
		});

		it('should handle DestinationManager errors', async () => {
			const input = {
				events: [
					{
						type: 'track',
						name: 'Button Clicked',
						properties: { buttonId: 'header-cta' },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-789',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			mockEventProcessor.processEvents.mockResolvedValue(input.events);
			mockDestinationManager.processEvents.mockRejectedValue(
				new Error('Destination failed')
			);

			await expect(
				handlerFunction({ input, context: mockContext })
			).rejects.toThrow(ORPCError);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to process analytics events',
				expect.objectContaining({
					error: 'Destination failed',
				})
			);
		});

		it('should handle AnalyticsError instances correctly', async () => {
			const input = {
				events: [
					{
						type: 'track',
						name: 'Button Clicked',
						properties: { buttonId: 'header-cta' },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-789',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			const analyticsError = new AnalyticsError(
				'Custom analytics error',
				'CUSTOM_ERROR',
				400
			);
			mockEventProcessor.processEvents.mockRejectedValue(analyticsError);

			await expect(
				handlerFunction({ input, context: mockContext })
			).rejects.toThrow(ORPCError);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to process analytics events',
				expect.objectContaining({
					error: 'Custom analytics error',
				})
			);
		});
	});

	describe('Logging', () => {
		it('should log successful processing', async () => {
			const input = {
				events: [
					{
						type: 'track',
						name: 'Button Clicked',
						properties: { buttonId: 'header-cta' },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-789',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			mockEventProcessor.processEvents.mockResolvedValue(input.events);
			mockDestinationManager.processEvents.mockResolvedValue(undefined);

			await handlerFunction({ input, context: mockContext });

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Events processed successfully',
				expect.objectContaining({
					eventCount: 1,
					processedCount: 1,
					sessionId: 'session-456',
					userId: undefined,
				})
			);
		});
	});

	describe('Response Format', () => {
		it('should return correct response format', async () => {
			const input = {
				events: [
					{
						type: 'track',
						name: 'Button Clicked',
						properties: { buttonId: 'header-cta' },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-789',
					},
					{
						type: 'page',
						name: 'Home Page',
						properties: { path: '/' },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-790',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			const processedEvents = input.events;
			mockEventProcessor.processEvents.mockResolvedValue(processedEvents);
			mockDestinationManager.processEvents.mockResolvedValue(undefined);

			const result = await handlerFunction({
				input,
				context: mockContext,
			});

			expect(result).toEqual({
				success: true,
				processed: 2,
				filtered: 0,
				errors: 0,
				results: [
					{
						eventId: 'msg-789',
						status: 'processed',
						destination: 'analytics-pipeline',
					},
					{
						eventId: 'msg-790',
						status: 'processed',
						destination: 'analytics-pipeline',
					},
				],
				processedAt: expect.any(String),
			});
		});

		it('should handle filtered events correctly', async () => {
			const input = {
				events: [
					{
						type: 'track',
						name: 'Button Clicked',
						properties: { buttonId: 'header-cta' },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-789',
					},
					{
						type: 'track',
						name: 'Filtered Event',
						properties: { sensitive: true },
						anonymousId: 'anon-123',
						sessionId: 'session-456',
						timestamp: new Date().toISOString(),
						messageId: 'msg-790',
					},
				],
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			};

			// Only process the first event
			const processedEvents = [input.events[0]];
			mockEventProcessor.processEvents.mockResolvedValue(processedEvents);
			mockDestinationManager.processEvents.mockResolvedValue(undefined);

			const result = await handlerFunction({
				input,
				context: mockContext,
			});

			expect(result).toEqual({
				success: true,
				processed: 1,
				filtered: 1,
				errors: 0,
				results: [
					{
						eventId: 'msg-789',
						status: 'processed',
						destination: 'analytics-pipeline',
					},
				],
				processedAt: expect.any(String),
			});
		});
	});
});
