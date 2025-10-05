/**
 * @fileoverview Unit tests for Google Analytics universal destination.
 *
 * Tests both server-side Measurement Protocol integration and client-side
 * gtag.js script generation functionality.
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
import {
	GoogleAnalyticsDestination,
	GoogleAnalyticsSettingsSchema,
} from './index';

// Mock logger
const mockLogger: Logger = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
} as unknown as Logger;

// Mock fetch
global.fetch = vi.fn();

describe('GoogleAnalyticsDestination', () => {
	let destination: GoogleAnalyticsDestination;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		destination = new GoogleAnalyticsDestination(mockLogger);
		mockFetch = vi.mocked(fetch);
		vi.clearAllMocks();
	});

	describe('Settings Schema', () => {
		it('should validate correct settings', () => {
			const validSettings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
				enableServerSide: true,
				enableClientSide: true,
				enableEnhancedMeasurement: true,
				anonymizeIp: true,
				cookieFlags: 'SameSite=None;Secure',
				customParameters: { test: 'value' },
				debugMode: false,
			};

			const result = GoogleAnalyticsSettingsSchema.safeParse(validSettings);
			expect(result.success).toBe(true);
		});

		it('should reject invalid settings', () => {
			const invalidSettings = {
				measurementId: '',
				apiSecret: '',
			};

			const result = GoogleAnalyticsSettingsSchema.safeParse(invalidSettings);
			expect(result.success).toBe(false);
		});

		it('should apply default values', () => {
			const minimalSettings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
			};

			const result = GoogleAnalyticsSettingsSchema.parse(minimalSettings);
			expect(result.enableServerSide).toBe(true);
			expect(result.enableClientSide).toBe(true);
			expect(result.enableEnhancedMeasurement).toBe(true);
			expect(result.anonymizeIp).toBe(true);
			expect(result.cookieFlags).toBe('SameSite=None;Secure');
			expect(result.debugMode).toBe(false);
		});
	});

	describe('Initialization', () => {
		it('should initialize with valid settings', async () => {
			const settings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
			};

			await destination.initialize(settings);

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Google Analytics destination initialized',
				expect.objectContaining({
					measurementId: 'G-XXXXXXXXXX',
					enableServerSide: true,
					enableClientSide: true,
					enableEnhancedMeasurement: true,
				})
			);
		});

		it('should throw error for invalid settings', async () => {
			const invalidSettings = {
				measurementId: '',
				apiSecret: '',
			};

			await expect(destination.initialize(invalidSettings)).rejects.toThrow();
		});
	});

	describe('Connection Testing', () => {
		it('should test connection successfully', async () => {
			const settings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
			};

			await destination.initialize(settings);

			mockFetch.mockResolvedValueOnce({
				ok: true,
			} as Response);

			const result = await destination.testConnection();
			expect(result).toBe(true);
		});

		it('should handle connection test failure', async () => {
			const settings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
			};

			await destination.initialize(settings);

			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await destination.testConnection();
			expect(result).toBe(false);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Google Analytics connection test failed',
				expect.objectContaining({
					error: 'Network error',
				})
			);
		});

		it('should throw error when not initialized', async () => {
			await expect(destination.testConnection()).rejects.toThrow(
				'Google Analytics destination not initialized'
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
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
			};
			await destination.initialize(settings);
		});

		it('should track events when server-side enabled and measurement consent given', async () => {
			const trackEvent: TrackEvent = {
				type: 'track',
				name: 'Product Viewed',
				properties: { product_id: 'prod-123', value: 29.99 },
				timestamp: new Date().toISOString(),
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
			} as Response);

			await destination.track(trackEvent, mockContext);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('google-analytics.com/mp/collect'),
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
					}),
				})
			);
		});

		it('should not track events when measurement consent not given', async () => {
			const contextWithoutMeasurement: EventContext = {
				...mockContext,
				consent: {
					...mockContext.consent,
					measurement: false,
				},
			};

			const trackEvent: TrackEvent = {
				type: 'track',
				name: 'Product Viewed',
				properties: { product_id: 'prod-123' },
				timestamp: new Date().toISOString(),
			};

			await destination.track(trackEvent, contextWithoutMeasurement);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should not track events when server-side disabled', async () => {
			const settings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
				enableServerSide: false,
			};
			await destination.initialize(settings);

			const trackEvent: TrackEvent = {
				type: 'track',
				name: 'Product Viewed',
				properties: { product_id: 'prod-123' },
				timestamp: new Date().toISOString(),
			};

			await destination.track(trackEvent, mockContext);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should handle API errors gracefully', async () => {
			const trackEvent: TrackEvent = {
				type: 'track',
				name: 'Product Viewed',
				properties: { product_id: 'prod-123' },
				timestamp: new Date().toISOString(),
			};

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				text: () => Promise.resolve('Bad Request'),
			} as Response);

			await destination.track(trackEvent, mockContext);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to send track event to Google Analytics',
				expect.objectContaining({
					error: 'GA4 Measurement Protocol error: 400 Bad Request',
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
			} as Response);

			await destination.page(pageEvent, mockContext);

			expect(mockFetch).toHaveBeenCalled();
		});

		it('should track identify events', async () => {
			const identifyEvent: IdentifyEvent = {
				userId: 'user-123',
				traits: { email: 'test@example.com' },
				timestamp: new Date().toISOString(),
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
			} as Response);

			await destination.identify(identifyEvent, mockContext);

			expect(mockFetch).toHaveBeenCalled();
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

		it('should generate scripts when client-side enabled and measurement consent given', () => {
			const settings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
				enableClientSide: true,
			};

			const scripts = destination.generateScript(settings, mockConsent);

			expect(scripts).not.toBeNull();
			expect(scripts).toHaveLength(2);

			// Check external script
			expect(scripts?.[0]?.type).toBe('external');
			expect(scripts?.[0]?.src).toBe(
				'https://www.googletagmanager.com/gtag/js'
			);
			expect(scripts?.[0]?.requiredConsent).toEqual(['measurement']);

			// Check inline script
			expect(scripts?.[1]?.type).toBe('inline');
			expect(scripts?.[1]?.requiredConsent).toEqual(['measurement']);
			expect(scripts?.[1]?.content).toContain('G-XXXXXXXXXX');
			expect(scripts?.[1]?.content).toContain('gtag');
		});

		it('should not generate scripts when measurement consent not given', () => {
			const consentWithoutMeasurement: AnalyticsConsent = {
				...mockConsent,
				measurement: false,
			};

			const settings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
				enableClientSide: true,
			};

			const scripts = destination.generateScript(
				settings,
				consentWithoutMeasurement
			);

			expect(scripts).toBeNull();
		});

		it('should not generate scripts when client-side disabled', () => {
			const settings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
				enableClientSide: false,
			};

			const scripts = destination.generateScript(settings, mockConsent);

			expect(scripts).toBeNull();
		});

		it('should include debug mode when enabled', () => {
			const settings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
				enableClientSide: true,
				debugMode: true,
			};

			const scripts = destination.generateScript(settings, mockConsent);

			expect(scripts?.[1]?.content).toContain('debug_mode');
		});

		it('should include custom parameters when provided', () => {
			const settings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
				enableClientSide: true,
				customParameters: { test: 'value' },
			};

			const scripts = destination.generateScript(settings, mockConsent);

			expect(scripts?.[1]?.content).toContain('custom_map');
		});
	});

	describe('Script Dependencies', () => {
		it('should return correct dependencies', () => {
			const dependencies = destination.getScriptDependencies();
			expect(dependencies).toEqual(['Google Analytics Core']);
		});
	});

	describe('Settings Validation', () => {
		it('should validate correct settings', async () => {
			const validSettings = {
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
			};

			const result = await destination.validateScriptSettings(validSettings);
			expect(result).toBe(true);
		});

		it('should reject invalid settings', async () => {
			const invalidSettings = {
				measurementId: '',
				apiSecret: '',
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
				'Google Analytics destination error',
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
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
			};

			await destination.initialize(settings);
			await destination.destroy();

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Google Analytics destination destroyed'
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
				measurementId: 'G-XXXXXXXXXX',
				apiSecret: 'test-secret',
			};
			await destination.initialize(settings);
		});

		it('should map common events correctly', async () => {
			const events = [
				{ input: 'Product Viewed', expected: 'view_item' },
				{ input: 'Product Added to Cart', expected: 'add_to_cart' },
				{ input: 'Checkout Started', expected: 'begin_checkout' },
				{ input: 'Purchase', expected: 'purchase' },
				{ input: 'Sign Up', expected: 'sign_up' },
				{ input: 'Login', expected: 'login' },
				{ input: 'Search', expected: 'search' },
				{ input: 'Video Play', expected: 'video_play' },
				{ input: 'Download', expected: 'file_download' },
				{ input: 'Custom Event', expected: 'custom_event' },
			];

			for (const { input, expected } of events) {
				const trackEvent: TrackEvent = {
					event: input,
					properties: {},
					timestamp: new Date().toISOString(),
				};

				mockFetch.mockResolvedValueOnce({
					ok: true,
				} as Response);

				await destination.track(trackEvent, mockContext);

				// Verify the request body contains the mapped event name
				expect(mockFetch).toHaveBeenCalled();
				const callArgs = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
				const requestBody = JSON.parse(callArgs[1]?.body as string);
				expect(requestBody.events[0].name).toBe(expected);
			}
		});

		it('should map event parameters correctly', async () => {
			const trackEvent: TrackEvent = {
				type: 'track',
				name: 'Product Viewed',
				properties: {
					product_id: 'prod-123',
					product_name: 'Test Product',
					category: 'Electronics',
					value: 29.99,
					currency: 'USD',
					quantity: 1,
					custom_prop: 'custom_value',
				},
				timestamp: new Date().toISOString(),
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
			} as Response);

			await destination.track(trackEvent, mockContext);

			const callArgs = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
			const requestBody = JSON.parse(callArgs[1]?.body as string);
			const params = requestBody.events[0].params;

			expect(params.item_id).toBe('prod-123');
			expect(params.item_name).toBe('Test Product');
			expect(params.item_category).toBe('Electronics');
			expect(params.value).toBe(29.99);
			expect(params.currency).toBe('USD');
			expect(params.quantity).toBe(1);
			expect(params.custom_prop).toBe('custom_value');
		});
	});
});
