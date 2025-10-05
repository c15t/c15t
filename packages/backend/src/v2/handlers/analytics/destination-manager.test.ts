/**
 * @fileoverview Unit tests for DestinationManager class.
 * Tests destination loading, event processing, error handling, and health monitoring.
 */

import type { Logger } from '@doubletie/logger';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	AliasEvent,
	AnalyticsEvent,
	ConsentEvent,
	ConsentPurpose,
	DestinationConfig,
	DestinationFactory,
	DestinationPlugin,
	EventContext,
	GroupEvent,
	IdentifyEvent,
	PageEvent,
	SpecificAnalyticsEvent,
	TrackEvent,
} from './core-types';
import { DestinationManager } from './destination-manager';

// Mock the destination loader functions
vi.mock('./destination-loader', () => ({
	loadDestinationFactory: vi.fn(),
	validateDestinationsAvailable: vi.fn().mockResolvedValue(true),
}));

/**
 * Mock destination plugin for testing.
 */
class MockDestinationPlugin implements DestinationPlugin {
	readonly type: string;
	readonly version: string;
	readonly name: string;
	readonly description: string;
	readonly category:
		| 'analytics'
		| 'marketing'
		| 'crm'
		| 'error-tracking'
		| 'consent-management'
		| 'other';
	readonly homepage?: string;
	readonly icon?: string;
	readonly author?: string;
	readonly gdprCompliant: boolean;
	readonly settingsSchema: StandardSchemaV1<Record<string, unknown>>;
	readonly requiredConsent: ReadonlyArray<ConsentPurpose>;

	public trackCalls: Array<{ event: TrackEvent; context: EventContext }> = [];
	public pageCalls: Array<{ event: PageEvent; context: EventContext }> = [];
	public identifyCalls: Array<{ event: IdentifyEvent; context: EventContext }> =
		[];
	public groupCalls: Array<{ event: GroupEvent; context: EventContext }> = [];
	public aliasCalls: Array<{ event: AliasEvent; context: EventContext }> = [];
	public consentCalls: Array<{ event: ConsentEvent; context: EventContext }> =
		[];
	public beforeEventCalls: Array<{ event: SpecificAnalyticsEvent }> = [];
	public afterEventCalls: Array<{
		event: SpecificAnalyticsEvent;
		result: unknown;
	}> = [];
	public errorCalls: Array<{ error: Error; event: SpecificAnalyticsEvent }> =
		[];

	public shouldFail = false;
	public shouldFailConnection = false;
	public initializationError?: Error;

	constructor(
		type: string,
		options: {
			version?: string;
			name?: string;
			description?: string;
			category?:
				| 'analytics'
				| 'marketing'
				| 'crm'
				| 'error-tracking'
				| 'consent-management'
				| 'other';
			gdprCompliant?: boolean;
			requiredConsent?: ReadonlyArray<ConsentPurpose>;
			shouldFail?: boolean;
			shouldFailConnection?: boolean;
			initializationError?: Error;
		} = {}
	) {
		this.type = type;
		this.version = options.version || '1.0.0';
		this.name = options.name || `Mock ${type}`;
		this.description = options.description || `Mock destination for ${type}`;
		this.category = options.category || 'analytics';
		this.gdprCompliant = options.gdprCompliant ?? true;
		this.settingsSchema = {} as StandardSchemaV1<Record<string, unknown>>;
		this.requiredConsent = options.requiredConsent || [];
		this.shouldFail = options.shouldFail || false;
		this.shouldFailConnection = options.shouldFailConnection || false;
		this.initializationError = options.initializationError;
	}

	async initialize(): Promise<void> {
		if (this.initializationError) {
			throw this.initializationError;
		}
	}

	async testConnection(): Promise<boolean> {
		return !this.shouldFailConnection;
	}

	async track(event: TrackEvent, context: EventContext): Promise<void> {
		this.trackCalls.push({ event, context });
		if (this.shouldFail) {
			throw new Error(`Mock ${this.type} track failed`);
		}
	}

	async page(event: PageEvent, context: EventContext): Promise<void> {
		this.pageCalls.push({ event, context });
		if (this.shouldFail) {
			throw new Error(`Mock ${this.type} page failed`);
		}
	}

	async identify(event: IdentifyEvent, context: EventContext): Promise<void> {
		this.identifyCalls.push({ event, context });
		if (this.shouldFail) {
			throw new Error(`Mock ${this.type} identify failed`);
		}
	}

	async group(event: GroupEvent, context: EventContext): Promise<void> {
		this.groupCalls.push({ event, context });
		if (this.shouldFail) {
			throw new Error(`Mock ${this.type} group failed`);
		}
	}

	async alias(event: AliasEvent, context: EventContext): Promise<void> {
		this.aliasCalls.push({ event, context });
		if (this.shouldFail) {
			throw new Error(`Mock ${this.type} alias failed`);
		}
	}

	async consent(event: ConsentEvent, context: EventContext): Promise<void> {
		this.consentCalls.push({ event, context });
		if (this.shouldFail) {
			throw new Error(`Mock ${this.type} consent failed`);
		}
	}

	async onBeforeEvent(
		event: SpecificAnalyticsEvent
	): Promise<SpecificAnalyticsEvent> {
		this.beforeEventCalls.push({ event });
		return event;
	}

	async onAfterEvent(
		event: SpecificAnalyticsEvent,
		result: unknown
	): Promise<void> {
		this.afterEventCalls.push({ event, result });
	}

	async onError(error: Error, event: SpecificAnalyticsEvent): Promise<void> {
		this.errorCalls.push({ error, event });
	}
}

/**
 * Mock logger for testing.
 */
const createMockLogger = (): Logger => ({
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	success: vi.fn(),
});

/**
 * Helper to create test events.
 */
const createTestEvent = (
	type: string,
	overrides: Partial<AnalyticsEvent> = {}
): AnalyticsEvent => ({
	type,
	name: `test-${type}`,
	timestamp: new Date().toISOString(),
	...overrides,
});

/**
 * Helper to create test context.
 */
const createTestContext = (
	overrides: Partial<EventContext> = {}
): EventContext => ({
	sessionId: 'test-session',
	sessionStart: new Date(),
	consent: {
		necessary: true,
		measurement: true,
		marketing: false,
		functionality: false,
		experience: false,
	},
	...overrides,
});

describe('DestinationManager', () => {
	let manager: DestinationManager;
	let mockLogger: Logger;
	let mockRegistry: Record<string, DestinationFactory>;
	let mockPlugins: Map<string, MockDestinationPlugin>;

	beforeEach(async () => {
		mockLogger = createMockLogger();
		mockRegistry = {};
		mockPlugins = new Map();

		// Mock the destination loader functions
		const { loadDestinationFactory, validateDestinationsAvailable } =
			(await vi.importMock('./destination-loader')) as {
				loadDestinationFactory: ReturnType<typeof vi.fn>;
				validateDestinationsAvailable: ReturnType<typeof vi.fn>;
			};

		vi.mocked(loadDestinationFactory).mockImplementation(
			async (type: string) => {
				// Return a mock factory for the requested type
				return async () => {
					if (!mockPlugins.has(type)) {
						mockPlugins.set(type, new MockDestinationPlugin(type));
					}
					return mockPlugins.get(type)!;
				};
			}
		);

		vi.mocked(validateDestinationsAvailable).mockResolvedValue(true);

		manager = new DestinationManager(mockLogger, mockRegistry);
	});

	describe('constructor', () => {
		it('should initialize with empty registry', () => {
			expect(manager).toBeDefined();
			expect(manager.getLoadedDestinations()).toEqual([]);
		});

		it('should initialize with custom registry', () => {
			const customRegistry = {
				test: async () => new MockDestinationPlugin('test'),
			};
			const customManager = new DestinationManager(mockLogger, customRegistry);
			expect(customManager).toBeDefined();
		});
	});

	describe('loadDestinations', () => {
		it('should load enabled destinations successfully', async () => {
			const plugin = new MockDestinationPlugin('test');
			mockRegistry.test = async () => plugin;

			const configs: DestinationConfig[] = [
				{
					type: 'test',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);

			const loaded = manager.getLoadedDestinations();
			expect(loaded).toHaveLength(1);
			expect(loaded[0]?.config.type).toBe('test');
			expect(loaded[0]?.loaded).toBe(true);
		});

		it('should skip disabled destinations', async () => {
			const plugin = new MockDestinationPlugin('test');
			mockRegistry.test = async () => plugin;

			const configs: DestinationConfig[] = [
				{
					type: 'test',
					enabled: false,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);

			const loaded = manager.getLoadedDestinations();
			expect(loaded).toHaveLength(0);
		});

		it('should handle destination loading errors gracefully', async () => {
			const plugin = new MockDestinationPlugin('test', {
				initializationError: new Error('Initialization failed'),
			});
			mockPlugins.set('test', plugin);

			const configs: DestinationConfig[] = [
				{
					type: 'test',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);

			const loaded = manager.getLoadedDestinations();
			expect(loaded).toHaveLength(0);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to load destination',
				expect.objectContaining({
					type: 'test',
					error: 'Initialization failed',
				})
			);
		});

		it('should load multiple destinations', async () => {
			const plugin1 = new MockDestinationPlugin('test1');
			const plugin2 = new MockDestinationPlugin('test2');
			mockPlugins.set('test1', plugin1);
			mockPlugins.set('test2', plugin2);

			const configs: DestinationConfig[] = [
				{
					type: 'test1',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
				{
					type: 'test2',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);

			const loaded = manager.getLoadedDestinations();
			expect(loaded).toHaveLength(2);
			expect(loaded.map((d) => d.config.type)).toContain('test1');
			expect(loaded.map((d) => d.config.type)).toContain('test2');
		});
	});

	describe('processEvents', () => {
		let plugin: MockDestinationPlugin;
		let context: EventContext;

		beforeEach(async () => {
			// Create the plugin and store it in mockPlugins
			plugin = new MockDestinationPlugin('test');
			mockPlugins.set('test', plugin);

			const configs: DestinationConfig[] = [
				{
					type: 'test',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);
			context = createTestContext();
		});

		it('should process track events', async () => {
			const events: AnalyticsEvent[] = [
				createTestEvent('track', {
					name: 'test-event',
					properties: { test: 'value' },
				}),
			];

			await manager.processEvents(events, context);

			expect(plugin.trackCalls).toHaveLength(1);
			expect(plugin.trackCalls[0]?.event.name).toBe('test-event');
		});

		it('should process page events', async () => {
			const events: AnalyticsEvent[] = [
				createTestEvent('page', {
					name: 'test-page',
					properties: { url: '/test' },
				}),
			];

			await manager.processEvents(events, context);

			expect(plugin.pageCalls).toHaveLength(1);
			expect(plugin.pageCalls[0]?.event.name).toBe('test-page');
		});

		it('should process identify events', async () => {
			const events: AnalyticsEvent[] = [
				createTestEvent('identify', {
					traits: { email: 'test@example.com' },
				}),
			];

			await manager.processEvents(events, context);

			expect(plugin.identifyCalls).toHaveLength(1);
			expect(plugin.identifyCalls[0]?.event.traits?.email).toBe(
				'test@example.com'
			);
		});

		it('should process group events', async () => {
			const events: AnalyticsEvent[] = [
				createTestEvent('group', {
					traits: { company: 'Test Corp' },
				}),
			];

			await manager.processEvents(events, context);

			expect(plugin.groupCalls).toHaveLength(1);
			expect(plugin.groupCalls[0]?.event.traits?.company).toBe('Test Corp');
		});

		it('should process alias events', async () => {
			const events: AnalyticsEvent[] = [
				createTestEvent('alias', {
					properties: { previousId: 'old-id' },
				}),
			];

			await manager.processEvents(events, context);

			expect(plugin.aliasCalls).toHaveLength(1);
			expect(plugin.aliasCalls[0]?.event.properties?.previousId).toBe('old-id');
		});

		it('should process consent events', async () => {
			const events: AnalyticsEvent[] = [
				createTestEvent('consent', {
					properties: {
						action: 'granted',
						source: 'banner',
					},
				}),
			];

			await manager.processEvents(events, context);

			expect(plugin.consentCalls).toHaveLength(1);
			expect(plugin.consentCalls[0]?.event.properties?.action).toBe('granted');
		});

		it('should call lifecycle hooks', async () => {
			const events: AnalyticsEvent[] = [
				createTestEvent('track', { name: 'test-event' }),
			];

			await manager.processEvents(events, context);

			expect(plugin.beforeEventCalls).toHaveLength(1);
			expect(plugin.afterEventCalls).toHaveLength(1);
		});

		it('should handle empty event arrays', async () => {
			await manager.processEvents([], context);

			expect(plugin.trackCalls).toHaveLength(0);
			expect(plugin.pageCalls).toHaveLength(0);
		});

		it('should handle unknown event types', async () => {
			const events: AnalyticsEvent[] = [createTestEvent('unknown' as any, {})];

			await manager.processEvents(events, context);

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Unknown event type',
				expect.objectContaining({
					type: 'test',
					eventType: 'unknown',
				})
			);
		});
	});

	describe('consent filtering', () => {
		let plugin: MockDestinationPlugin;
		let context: EventContext;

		beforeEach(async () => {
			plugin = new MockDestinationPlugin('test', {
				requiredConsent: ['measurement'],
			});
			mockPlugins.set('test', plugin);

			const configs: DestinationConfig[] = [
				{
					type: 'test',
					enabled: true,
					settings: {},
					requiredConsent: ['measurement'],
				},
			];

			await manager.loadDestinations(configs);
			context = createTestContext({
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});
		});

		it('should filter events based on consent requirements', async () => {
			const events: AnalyticsEvent[] = [
				createTestEvent('track', { name: 'test-event' }),
				createTestEvent('page', { name: 'test-page' }),
			];

			await manager.processEvents(events, context);

			expect(plugin.trackCalls).toHaveLength(1);
			expect(plugin.pageCalls).toHaveLength(1);
		});

		it('should block events when consent is not granted', async () => {
			const contextWithoutConsent = createTestContext({
				consent: {
					necessary: true,
					measurement: false,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});

			const events: AnalyticsEvent[] = [
				createTestEvent('track', { name: 'test-event' }),
			];

			await manager.processEvents(events, contextWithoutConsent);

			expect(plugin.trackCalls).toHaveLength(0);
		});

		it('should always allow consent events', async () => {
			const contextWithoutConsent = createTestContext({
				consent: {
					necessary: true,
					measurement: false,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});

			const events: AnalyticsEvent[] = [
				createTestEvent('consent', {
					properties: { action: 'granted' },
				}),
			];

			await manager.processEvents(events, contextWithoutConsent);

			expect(plugin.consentCalls).toHaveLength(1);
		});
	});

	describe('error handling', () => {
		let plugin: MockDestinationPlugin;
		let context: EventContext;

		beforeEach(async () => {
			plugin = new MockDestinationPlugin('test', { shouldFail: true });
			mockPlugins.set('test', plugin);

			const configs: DestinationConfig[] = [
				{
					type: 'test',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);
			context = createTestContext();
		});

		it('should handle destination processing errors', async () => {
			const events: AnalyticsEvent[] = [
				createTestEvent('track', { name: 'test-event' }),
			];

			await manager.processEvents(events, context);

			expect(plugin.errorCalls).toHaveLength(1);
			expect(plugin.errorCalls[0]?.error.message).toBe(
				'Mock test track failed'
			);
		});

		it('should update error count on failures', async () => {
			const events: AnalyticsEvent[] = [
				createTestEvent('track', { name: 'test-event' }),
			];

			await manager.processEvents(events, context);

			const status = manager.getDestinationStatus('test');
			expect(status?.errorCount).toBe(1);
			expect(status?.lastError?.message).toBe('Mock test track failed');
		});

		it('should continue processing other destinations on error', async () => {
			const plugin2 = new MockDestinationPlugin('test2');
			mockPlugins.set('test2', plugin2);

			const configs: DestinationConfig[] = [
				{
					type: 'test',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
				{
					type: 'test2',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);

			const events: AnalyticsEvent[] = [
				createTestEvent('track', { name: 'test-event' }),
			];

			await manager.processEvents(events, context);

			expect(plugin.errorCalls).toHaveLength(1);
			expect(plugin2.trackCalls).toHaveLength(1);
		});
	});

	describe('connection testing', () => {
		let plugin: MockDestinationPlugin;

		beforeEach(async () => {
			plugin = new MockDestinationPlugin('test');
			mockPlugins.set('test', plugin);

			const configs: DestinationConfig[] = [
				{
					type: 'test',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);
		});

		it('should test individual destination connections', async () => {
			const isConnected = await manager.testDestination('test');
			expect(isConnected).toBe(true);
		});

		it('should return false for non-existent destinations', async () => {
			const isConnected = await manager.testDestination('nonexistent');
			expect(isConnected).toBe(false);
		});

		it('should test all destination connections', async () => {
			const results = await manager.testConnections();
			expect(results).toHaveLength(1);
			expect(results[0]?.type).toBe('test');
			expect(results[0]?.status).toBe('connected');
		});

		it('should handle connection test failures', async () => {
			const failingPlugin = new MockDestinationPlugin('failing', {
				shouldFailConnection: true,
			});
			mockPlugins.set('failing', failingPlugin);

			const configs: DestinationConfig[] = [
				{
					type: 'failing',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);

			const results = await manager.testConnections();
			const failingResult = results.find((r) => r.type === 'failing');
			expect(failingResult?.status).toBe('disconnected');
		});
	});

	describe('health monitoring', () => {
		let plugin: MockDestinationPlugin;

		beforeEach(async () => {
			plugin = new MockDestinationPlugin('test');
			mockPlugins.set('test', plugin);

			const configs: DestinationConfig[] = [
				{
					type: 'test',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);
		});

		it('should provide destination status', () => {
			const status = manager.getDestinationStatus('test');
			expect(status).toBeDefined();
			expect(status?.config.type).toBe('test');
			expect(status?.loaded).toBe(true);
			expect(status?.eventsProcessed).toBe(0);
			expect(status?.errorCount).toBe(0);
		});

		it('should return undefined for non-existent destinations', () => {
			const status = manager.getDestinationStatus('nonexistent');
			expect(status).toBeUndefined();
		});

		it('should track events processed', async () => {
			const context = createTestContext();
			const events: AnalyticsEvent[] = [
				createTestEvent('track', { name: 'test-event' }),
			];

			await manager.processEvents(events, context);

			const status = manager.getDestinationStatus('test');
			expect(status?.eventsProcessed).toBe(1);
			expect(status?.lastUsed).toBeDefined();
		});

		it('should provide health summary', () => {
			const summary = manager.getHealthSummary();
			expect(summary.totalDestinations).toBe(1);
			expect(summary.loadedDestinations).toBe(1);
			expect(summary.totalEventsProcessed).toBe(0);
			expect(summary.totalErrors).toBe(0);
			expect(summary.destinationsWithErrors).toBe(0);
		});

		it('should track errors in health summary', async () => {
			const failingPlugin = new MockDestinationPlugin('failing', {
				shouldFail: true,
			});
			mockPlugins.set('failing', failingPlugin);

			const configs: DestinationConfig[] = [
				{
					type: 'failing',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);

			const context = createTestContext();
			const events: AnalyticsEvent[] = [
				createTestEvent('track', { name: 'test-event' }),
			];

			await manager.processEvents(events, context);

			const summary = manager.getHealthSummary();
			expect(summary.totalDestinations).toBe(2);
			expect(summary.loadedDestinations).toBe(2);
			expect(summary.totalErrors).toBe(1);
			expect(summary.destinationsWithErrors).toBe(1);
		});
	});

	describe('utility methods', () => {
		let plugin: MockDestinationPlugin;

		beforeEach(async () => {
			plugin = new MockDestinationPlugin('test');
			mockPlugins.set('test', plugin);

			const configs: DestinationConfig[] = [
				{
					type: 'test',
					enabled: true,
					settings: {},
					requiredConsent: [],
				},
			];

			await manager.loadDestinations(configs);
		});

		it('should get loaded destination types', () => {
			const types = manager.getLoadedDestinationTypes();
			expect(types).toEqual(['test']);
		});

		it('should clear all destinations', () => {
			expect(manager.getLoadedDestinations()).toHaveLength(1);

			manager.clear();

			expect(manager.getLoadedDestinations()).toHaveLength(0);
		});
	});
});
