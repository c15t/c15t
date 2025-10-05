/**
 * @fileoverview Unit tests for Meta Pixel universal destination.
 *
 * Tests both server-side Conversions API integration and client-side
 * pixel script generation functionality.
 */

import type {
	AnalyticsConsent,
	EventContext,
	IdentifyEvent,
	PageEvent,
	TrackEvent,
} from '@c15t/backend/v2';
import type { Logger } from '@doubletie/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetaPixelDestination, MetaPixelSettingsSchema } from './index';

// Mock logger
const mockLogger: Logger = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
} as unknown as Logger;

// Mock fetch
global.fetch = vi.fn();

describe('MetaPixelDestination', () => {
	let destination: MetaPixelDestination;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		destination = new MetaPixelDestination(mockLogger);
		mockFetch = vi.mocked(fetch);
		vi.clearAllMocks();
	});

	describe('Settings Schema', () => {
		it('should validate correct settings', () => {
			const validSettings = {
				pixelId: '123456789',
				accessToken: 'test-token',
				testEventCode: 'TEST123',
				apiVersion: 'v18.0',
				enableServerSide: true,
				enableClientSide: true,
				customData: { test: 'value' },
			};

			const result = MetaPixelSettingsSchema.safeParse(validSettings);
			expect(result.success).toBe(true);
		});

		it('should reject invalid settings', () => {
			const invalidSettings = {
				pixelId: '',
				accessToken: '',
			};

			const result = MetaPixelSettingsSchema.safeParse(invalidSettings);
			expect(result.success).toBe(false);
		});

		it('should apply default values', () => {
			const minimalSettings = {
				pixelId: '123456789',
				accessToken: 'test-token',
			};

			const result = MetaPixelSettingsSchema.parse(minimalSettings);
			expect(result.apiVersion).toBe('v18.0');
			expect(result.enableServerSide).toBe(true);
			expect(result.enableClientSide).toBe(true);
		});
	});

	describe('Initialization', () => {
		it('should initialize with valid settings', async () => {
			const settings = {
				pixelId: '123456789',
				accessToken: 'test-token',
			};

			await destination.initialize(settings);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Meta Pixel destination initialized',
				expect.objectContaining({
					pixelId: '123456789',
					enableServerSide: true,
					enableClientSide: true,
				})
			);
		});

		it('should throw error for invalid settings', async () => {
			const invalidSettings = {
				pixelId: '',
				accessToken: '',
			};

			await expect(destination.initialize(invalidSettings)).rejects.toThrow();
		});
	});

	describe('Connection Testing', () => {
		it('should test connection successfully', async () => {
			const settings = {
				pixelId: '123456789',
				accessToken: 'test-token',
			};

			await destination.initialize(settings);

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ events_received: 1 }),
			} as Response);

			const result = await destination.testConnection();
			expect(result).toBe(true);
		});

		it('should handle connection test failure', async () => {
			const settings = {
				pixelId: '123456789',
				accessToken: 'test-token',
			};

			await destination.initialize(settings);

			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await destination.testConnection();
			expect(result).toBe(false);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Meta Pixel connection test failed',
				expect.objectContaining({
					error: 'Network error',
				})
			);
		});

		it('should throw error when not initialized', async () => {
			await expect(destination.testConnection()).rejects.toThrow(
				'Meta Pixel destination not initialized'
			);
		});
	});

	describe('Event Tracking', () => {
		const mockContext: EventContext = {
			userId: 'user-123',
			sessionId: 'session-123',
			userAgent: 'test-agent',
			ip: '127.0.0.1',
			consent: {
				necessary: true,
				measurement: true,
				marketing: true,
				functionality: true,
				experience: true,
			},
			custom: {
				url: 'https://example.com',
			},
		};

		beforeEach(async () => {
			const settings = {
				pixelId: '123456789',
				accessToken: 'test-token',
			};
			await destination.initialize(settings);
		});

		it('should track events when server-side enabled and marketing consent given', async () => {
			const trackEvent: TrackEvent = {
				event: 'Product Viewed',
				properties: { product_id: 'prod-123', value: 29.99 },
				timestamp: new Date(),
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ events_received: 1 }),
			} as Response);

			await destination.track(trackEvent, mockContext);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('graph.facebook.com'),
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						Authorization: 'Bearer test-token',
					}),
				})
			);
		});

		it('should not track events when marketing consent not given', async () => {
			const contextWithoutMarketing: EventContext = {
				...mockContext,
				consent: {
					...mockContext.consent,
					marketing: false,
				},
			};

			const trackEvent: TrackEvent = {
				event: 'Product Viewed',
				properties: { product_id: 'prod-123' },
				timestamp: new Date(),
			};

			await destination.track(trackEvent, contextWithoutMarketing);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should not track events when server-side disabled', async () => {
			const settings = {
				pixelId: '123456789',
				accessToken: 'test-token',
				enableServerSide: false,
			};
			await destination.initialize(settings);

			const trackEvent: TrackEvent = {
				event: 'Product Viewed',
				properties: { product_id: 'prod-123' },
				timestamp: new Date(),
			};

			await destination.track(trackEvent, mockContext);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should handle API errors gracefully', async () => {
			const trackEvent: TrackEvent = {
				event: 'Product Viewed',
				properties: { product_id: 'prod-123' },
				timestamp: new Date(),
			};

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				text: () => Promise.resolve('Bad Request'),
			} as Response);

			await destination.track(trackEvent, mockContext);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to send track event to Meta Pixel',
				expect.objectContaining({
					error: 'Meta Conversions API error: 400 Bad Request',
				})
			);
		});

		it('should track page events', async () => {
			const pageEvent: PageEvent = {
				name: 'Home Page',
				properties: { url: 'https://example.com' },
				timestamp: new Date().toISOString(),
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ events_received: 1 }),
			} as Response);

			await destination.page(pageEvent, mockContext);

			expect(mockFetch).toHaveBeenCalled();
		});

		it('should handle identify events', async () => {
			const identifyEvent: IdentifyEvent = {
				userId: 'user-123',
				traits: { email: 'test@example.com' },
				timestamp: new Date(),
			};

			await destination.identify(identifyEvent, mockContext);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Meta Pixel identify event received',
				expect.objectContaining({
					userId: 'user-123',
				})
			);
		});
	});

	describe('Script Generation', () => {
		const mockConsent: AnalyticsConsent = {
			necessary: true,
			measurement: true,
			marketing: true,
			functionality: true,
			experience: true,
		};

		it('should generate script when client-side enabled and marketing consent given', () => {
			const settings = {
				pixelId: '123456789',
				accessToken: 'test-token',
				enableClientSide: true,
			};

			const script = destination.generateScript(settings, mockConsent);

			expect(script).not.toBeNull();
			expect(script?.type).toBe('inline');
			expect(script?.requiredConsent).toEqual(['marketing']);
			expect(script?.content).toContain('123456789');
			expect(script?.content).toContain('fbq');
		});

		it('should not generate script when marketing consent not given', () => {
			const consentWithoutMarketing: AnalyticsConsent = {
				...mockConsent,
				marketing: false,
			};

			const settings = {
				pixelId: '123456789',
				accessToken: 'test-token',
				enableClientSide: true,
			};

			const script = destination.generateScript(
				settings,
				consentWithoutMarketing
			);

			expect(script).toBeNull();
		});

		it('should not generate script when client-side disabled', () => {
			const settings = {
				pixelId: '123456789',
				accessToken: 'test-token',
				enableClientSide: false,
			};

			const script = destination.generateScript(settings, mockConsent);

			expect(script).toBeNull();
		});

		it('should include test event code when provided', () => {
			const settings = {
				pixelId: '123456789',
				accessToken: 'test-token',
				enableClientSide: true,
				testEventCode: 'TEST123',
			};

			const script = destination.generateScript(settings, mockConsent);

			expect(script?.content).toContain('TEST123');
		});
	});

	describe('Script Dependencies', () => {
		it('should return empty dependencies array', () => {
			const dependencies = destination.getScriptDependencies();
			expect(dependencies).toEqual([]);
		});
	});

	describe('Settings Validation', () => {
		it('should validate correct settings', async () => {
			const validSettings = {
				pixelId: '123456789',
				accessToken: 'test-token',
			};

			const result = await destination.validateScriptSettings(validSettings);
			expect(result).toBe(true);
		});

		it('should reject invalid settings', async () => {
			const invalidSettings = {
				pixelId: '',
				accessToken: '',
			};

			const result = await destination.validateScriptSettings(invalidSettings);
			expect(result).toBe(false);
		});
	});

	describe('Error Handling', () => {
		it('should handle errors gracefully', async () => {
			const error = new Error('Test error');
			const event = { test: 'data' };

			await destination.onError(error, event);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Meta Pixel destination error',
				expect.objectContaining({
					error: 'Test error',
					event,
				})
			);
		});
	});

	describe('Destruction', () => {
		it('should destroy destination properly', async () => {
			const settings = {
				pixelId: '123456789',
				accessToken: 'test-token',
			};

			await destination.initialize(settings);
			await destination.destroy();

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Meta Pixel destination destroyed'
			);
		});
	});

	describe('Event Mapping', () => {
		const mockContext: EventContext = {
			userId: 'user-123',
			sessionId: 'session-123',
			sessionStart: new Date(),
			userAgent: 'test-agent',
			ip: '127.0.0.1',
			consent: {
				necessary: true,
				measurement: true,
				marketing: true,
				functionality: true,
				experience: true,
			},
			custom: {
				url: 'https://example.com',
			},
		};

		beforeEach(async () => {
			const settings = {
				pixelId: '123456789',
				accessToken: 'test-token',
			};
			await destination.initialize(settings);
		});

		it('should map common events correctly', async () => {
			const events = [
				{ input: 'Product Viewed', expected: 'ViewContent' },
				{ input: 'Product Added', expected: 'AddToCart' },
				{ input: 'Checkout Started', expected: 'InitiateCheckout' },
				{ input: 'Purchase', expected: 'Purchase' },
				{ input: 'Sign Up', expected: 'CompleteRegistration' },
				{ input: 'Login', expected: 'Login' },
				{ input: 'Custom Event', expected: 'CustomEvent' },
			];

			for (const { input, expected } of events) {
				const trackEvent: TrackEvent = {
					type: 'track',
					name: input,
					properties: {},
					timestamp: new Date().toISOString(),
				};

				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ events_received: 1 }),
				} as Response);

				await destination.track(trackEvent, mockContext);

				// Verify the request body contains the mapped event name
				const callArgs = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
				const requestBody = JSON.parse(callArgs[1]?.body as string);
				expect(requestBody.data[0].event_name).toBe(expected);
			}
		});
	});
});
