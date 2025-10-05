/**
 * @fileoverview Unit tests for EventProcessor class.
 * Tests event validation, enrichment, filtering, and consent handling.
 */

import type { Logger } from '@doubletie/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	AnalyticsEvent,
	ConsentPurpose,
	EventContext,
	SpecificAnalyticsEvent,
} from './core-types';
import { type EventFilter, EventProcessor } from './event-processor';

/**
 * Mock logger for testing.
 */
function createMockLogger(): Logger {
	return {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
	} as unknown as Logger;
}

/**
 * Create a test event with default values.
 */
function createTestEvent<T extends AnalyticsEvent['type']>(
	type: T,
	overrides: Partial<SpecificAnalyticsEvent<T>> = {}
): SpecificAnalyticsEvent<T> {
	const baseEvent = {
		type,
		timestamp: new Date().toISOString(),
		anonymousId: 'test-anon-id',
		sessionId: 'test-session-id',
		messageId: 'test-message-id',
		context: {},
		...overrides,
	} as unknown as SpecificAnalyticsEvent<T>;

	switch (type) {
		case 'track':
			return {
				...baseEvent,
				name: overrides.name ?? 'test-event',
				properties: overrides.properties ?? {},
			} as SpecificAnalyticsEvent<T>;
		case 'page':
			return {
				...baseEvent,
				name: overrides.name ?? 'test-page',
				properties: overrides.properties ?? {},
			} as SpecificAnalyticsEvent<T>;
		case 'identify':
			return {
				...baseEvent,
				userId: overrides.userId ?? 'test-user-id',
				traits: overrides.traits ?? {},
			} as SpecificAnalyticsEvent<T>;
		case 'group': {
			const groupOverrides = overrides as Partial<
				SpecificAnalyticsEvent<'group'>
			>;
			return {
				...baseEvent,
				groupId: groupOverrides.groupId ?? 'test-group-id',
				traits: groupOverrides.traits ?? {},
			} as SpecificAnalyticsEvent<T>;
		}
		case 'alias': {
			const aliasOverrides = overrides as Partial<
				SpecificAnalyticsEvent<'alias'>
			>;
			return {
				...baseEvent,
				properties: {
					previousId:
						aliasOverrides.properties?.previousId ?? 'test-previous-id',
					...(aliasOverrides.properties ?? {}),
				},
			} as SpecificAnalyticsEvent<T>;
		}
		case 'consent': {
			const consentOverrides = overrides as Partial<
				SpecificAnalyticsEvent<'consent'>
			>;
			return {
				...baseEvent,
				properties: {
					action: consentOverrides.properties?.action ?? 'granted',
					source: consentOverrides.properties?.source ?? 'banner',
					...(consentOverrides.properties ?? {}),
				},
			} as SpecificAnalyticsEvent<T>;
		}
		default:
			return baseEvent;
	}
}

/**
 * Create test event context.
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

describe('EventProcessor', () => {
	let processor: EventProcessor;
	let mockLogger: Logger;

	beforeEach(() => {
		mockLogger = createMockLogger();
		processor = new EventProcessor(mockLogger);
	});

	describe('constructor', () => {
		it('should initialize with default configuration', () => {
			expect(processor).toBeDefined();
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Event processor initialized',
				expect.any(Object)
			);
		});

		it('should initialize with custom configuration', () => {
			const customConfig = {
				enableValidation: false,
				enableEnrichment: false,
				maxBatchSize: 500,
			};

			const customProcessor = new EventProcessor(mockLogger, customConfig);
			expect(customProcessor).toBeDefined();
		});
	});

	describe('processEvents', () => {
		it('should process events through all steps', async () => {
			const events = [
				createTestEvent('track', { name: 'test-event' }),
				createTestEvent('page', { name: 'test-page' }),
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);

			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				type: 'track',
				name: 'test-event',
				context: expect.objectContaining({
					sessionId: context.sessionId,
					userAgent: context.userAgent,
				}),
			});
		});

		it('should throw error when batch size exceeds maximum', async () => {
			const events = Array(1001)
				.fill(null)
				.map(() => createTestEvent('track', { name: 'test-event' }));
			const context = createTestContext();

			await expect(processor.processEvents(events, context)).rejects.toThrow(
				'Batch size 1001 exceeds maximum allowed 1000'
			);
		});

		it('should skip validation when disabled', async () => {
			const processor = new EventProcessor(mockLogger, {
				enableValidation: false,
			});

			const events = [createTestEvent('track', { name: 'test-event' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(1);
		});

		it('should skip enrichment when disabled', async () => {
			const processor = new EventProcessor(mockLogger, {
				enableEnrichment: false,
			});

			const events = [createTestEvent('track', { name: 'test-event' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result[0]?.context).toEqual({});
		});

		it('should skip global filtering when disabled', async () => {
			const processor = new EventProcessor(mockLogger, {
				enableGlobalFiltering: false,
			});

			const events = [createTestEvent('track', { name: 'test-event' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(1);
		});
	});

	describe('event validation', () => {
		it('should validate track events', async () => {
			const events = [createTestEvent('track', { name: 'test-event' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(1);
		});

		it('should reject track events without name', async () => {
			const events = [createTestEvent('track', { name: '' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(0);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Event validation failed',
				expect.objectContaining({
					eventType: 'track',
					error: 'Track event name is required',
				})
			);
		});

		it('should validate page events', async () => {
			const events = [createTestEvent('page', { name: 'test-page' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(1);
		});

		it('should reject page events without name', async () => {
			const events = [createTestEvent('page', { name: '' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(0);
		});

		it('should validate identify events', async () => {
			const events = [createTestEvent('identify', { userId: 'test-user' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(1);
		});

		it('should reject identify events without userId', async () => {
			const events = [createTestEvent('identify', { userId: '' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(0);
		});

		it('should validate group events', async () => {
			const events = [createTestEvent('group', { groupId: 'test-group' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(1);
		});

		it('should reject group events without groupId', async () => {
			const events = [createTestEvent('group', { groupId: '' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(0);
		});

		it('should validate alias events', async () => {
			const events = [
				createTestEvent('alias', {
					properties: { previousId: 'test-previous' },
				}),
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(1);
		});

		it('should reject alias events without previousId', async () => {
			const events = [
				createTestEvent('alias', { properties: { previousId: '' } }),
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(0);
		});

		it('should validate consent events', async () => {
			const events = [
				createTestEvent('consent', {
					properties: {
						action: 'granted',
						source: 'banner',
						necessary: true,
						measurement: true,
						marketing: false,
						functionality: false,
						experience: false,
					},
				}),
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(1);
		});

		it('should reject consent events without action', async () => {
			const events = [
				createTestEvent('consent', {
					properties: {
						action: 'invalid-action' as 'granted' | 'revoked' | 'updated',
						source: 'banner',
					},
				}),
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(0);
		});

		it('should reject events without type', async () => {
			const events = [
				{ ...createTestEvent('track'), type: undefined as unknown as string },
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(0);
		});

		it('should reject events without timestamp', async () => {
			const events = [
				{
					...createTestEvent('track'),
					timestamp: undefined as unknown as string,
				},
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(0);
		});

		it('should reject events without anonymousId or userId', async () => {
			const events = [
				{
					...createTestEvent('track'),
					anonymousId: undefined,
					userId: undefined,
				},
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(0);
		});

		it('should reject unknown event types', async () => {
			const events = [
				{
					...createTestEvent('track'),
					type: 'unknown' as AnalyticsEvent['type'],
				},
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);
			expect(result).toHaveLength(0);
		});
	});

	describe('event enrichment', () => {
		it('should enrich events with context data', async () => {
			const events = [createTestEvent('track', { name: 'test-event' })];
			const context = createTestContext({
				userAgent: 'custom-user-agent',
				ip: '192.168.1.1',
				referrer: 'https://custom.com',
			});

			const result = await processor.processEvents(events, context);

			expect(result[0]?.context).toMatchObject({
				sessionId: context.sessionId,
				sessionStart: context.sessionStart,
				userAgent: 'custom-user-agent',
				ip: '192.168.1.1',
				referrer: 'https://custom.com',
			});
		});

		it('should preserve existing context data', async () => {
			const events = [
				createTestEvent('track', {
					name: 'test-event',
					context: { customField: 'custom-value' },
				}),
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);

			expect(result[0]?.context).toMatchObject({
				customField: 'custom-value',
				sessionId: context.sessionId,
			});
		});
	});

	describe('global filtering', () => {
		it('should apply global filters', async () => {
			const filter: EventFilter = (event) => {
				if (event.type === 'track' && 'name' in event) {
					return event.name !== 'filtered-event';
				}
				return true;
			};
			const processor = new EventProcessor(mockLogger, {
				globalFilters: [filter],
			});

			const events = [
				createTestEvent('track', { name: 'allowed-event' }),
				createTestEvent('track', { name: 'filtered-event' }),
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe('allowed-event');
		});

		it('should apply multiple global filters', async () => {
			const filter1: EventFilter = (event) => {
				if (event.type === 'track' && 'name' in event) {
					return event.name !== 'filtered-event';
				}
				return true;
			};
			const filter2: EventFilter = (event) => event.type === 'track';
			const processor = new EventProcessor(mockLogger, {
				globalFilters: [filter1, filter2],
			});

			const events = [
				createTestEvent('track', { name: 'allowed-event' }),
				createTestEvent('page', { name: 'page-event' }),
				createTestEvent('track', { name: 'filtered-event' }),
			];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe('allowed-event');
		});

		it('should handle empty global filters', async () => {
			const processor = new EventProcessor(mockLogger, {
				globalFilters: [],
			});

			const events = [createTestEvent('track', { name: 'test-event' })];
			const context = createTestContext();

			const result = await processor.processEvents(events, context);

			expect(result).toHaveLength(1);
		});
	});

	describe('consent filtering', () => {
		it('should filter events by consent requirements', () => {
			const events = [
				createTestEvent('track', { name: 'test-event' }),
				createTestEvent('page', { name: 'test-page' }),
			];
			const context = createTestContext({
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});
			const requiredConsent: ConsentPurpose[] = ['measurement'];

			const result = processor.filterEventsByConsent(
				events,
				context,
				requiredConsent
			);

			expect(result).toHaveLength(2);
		});

		it('should filter out events when consent is insufficient', () => {
			const events = [
				createTestEvent('track', { name: 'test-event' }),
				createTestEvent('page', { name: 'test-page' }),
			];
			const context = createTestContext({
				consent: {
					necessary: true,
					measurement: false,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});
			const requiredConsent: ConsentPurpose[] = ['measurement'];

			const result = processor.filterEventsByConsent(
				events,
				context,
				requiredConsent
			);

			expect(result).toHaveLength(0);
		});

		it('should require all consent purposes', () => {
			const events = [createTestEvent('track', { name: 'test-event' })];
			const context = createTestContext({
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});
			const requiredConsent: ConsentPurpose[] = ['measurement', 'marketing'];

			const result = processor.filterEventsByConsent(
				events,
				context,
				requiredConsent
			);

			expect(result).toHaveLength(0);
		});

		it('should always include consent events', () => {
			const events = [
				createTestEvent('track', { name: 'test-event' }),
				createTestEvent('consent', {
					properties: {
						action: 'granted',
						source: 'banner',
						necessary: true,
						measurement: true,
						marketing: false,
						functionality: false,
						experience: false,
					},
				}),
			];
			const context = createTestContext({
				consent: {
					necessary: true,
					measurement: false,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});
			const requiredConsent: ConsentPurpose[] = ['measurement'];

			const result = processor.filterEventsByConsent(
				events,
				context,
				requiredConsent
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.type).toBe('consent');
		});

		it('should skip consent filtering when disabled', () => {
			const processor = new EventProcessor(mockLogger, {
				enableConsentFiltering: false,
			});

			const events = [createTestEvent('track', { name: 'test-event' })];
			const context = createTestContext({
				consent: {
					necessary: true,
					measurement: false,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});
			const requiredConsent: ConsentPurpose[] = ['measurement'];

			const result = processor.filterEventsByConsent(
				events,
				context,
				requiredConsent
			);

			expect(result).toHaveLength(1);
		});
	});

	describe('configuration management', () => {
		it('should get current configuration', () => {
			const config = processor.getConfig();

			expect(config).toMatchObject({
				enableValidation: true,
				enableEnrichment: true,
				enableGlobalFiltering: true,
				enableConsentFiltering: true,
				maxBatchSize: 1000,
			});
		});

		it('should update configuration', () => {
			processor.updateConfig({
				enableValidation: false,
				maxBatchSize: 500,
			});

			const config = processor.getConfig();
			expect(config.enableValidation).toBe(false);
			expect(config.maxBatchSize).toBe(500);
		});
	});

	describe('logging', () => {
		it('should log processing steps', async () => {
			const events = [createTestEvent('track', { name: 'test-event' })];
			const context = createTestContext();

			await processor.processEvents(events, context);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Processing events',
				expect.objectContaining({
					eventCount: 1,
					sessionId: context.sessionId,
				})
			);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Events processed successfully',
				expect.objectContaining({
					originalCount: 1,
					processedCount: 1,
					filteredCount: 0,
				})
			);
		});

		it('should log validation failures', async () => {
			const events = [createTestEvent('track', { name: '' })];
			const context = createTestContext();

			await processor.processEvents(events, context);

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Event validation failed',
				expect.objectContaining({
					eventType: 'track',
					error: 'Track event name is required',
				})
			);
		});

		it('should log consent filtering', () => {
			const events = [createTestEvent('track', { name: 'test-event' })];
			const context = createTestContext({
				consent: {
					necessary: true,
					measurement: false,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});
			const requiredConsent: ConsentPurpose[] = ['measurement'];

			processor.filterEventsByConsent(events, context, requiredConsent);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Filtering events by consent',
				expect.objectContaining({
					eventCount: 1,
					requiredConsent,
					userConsent: context.consent,
				})
			);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Event filtered due to insufficient consent',
				expect.objectContaining({
					eventType: 'track',
					eventName: 'test-event',
					requiredConsent,
					userConsent: context.consent,
				})
			);
		});
	});
});
