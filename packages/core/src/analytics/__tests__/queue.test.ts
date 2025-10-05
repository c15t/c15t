/**
 * @packageDocumentation
 * Unit tests for the enhanced EventQueue with consent-aware queuing and offline support.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	EventQueue,
	type Logger,
	type OfflineDetector,
	type QueueConfig,
	type QueuedEvent,
	type StorageAdapter,
} from '../queue';
import type {
	AnalyticsConsent,
	AnalyticsEvent,
	EventContext,
	Uploader,
} from '../types';

// Mock window object for Node.js environment
Object.defineProperty(global, 'window', {
	value: {
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	},
	writable: true,
});

// Mock localStorage
Object.defineProperty(global, 'localStorage', {
	value: {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
	},
	writable: true,
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
	value: {
		onLine: true,
		userAgent: 'test-agent',
	},
	writable: true,
});

// Mock StorageEvent
global.StorageEvent = class StorageEvent {
	constructor(
		public type: string,
		public init?: any
	) {}
} as any;

// Mock implementations
class MockUploader implements Uploader {
	public sentRequests: any[] = [];
	public shouldFail = false;
	public failCount = 0;
	public maxFailures = 0;

	async send(request: any): Promise<void> {
		this.sentRequests.push(request);

		if (this.shouldFail && this.failCount < this.maxFailures) {
			this.failCount++;
			throw new Error('Upload failed');
		}
	}
}

class MockStorageAdapter implements StorageAdapter {
	private storage = new Map<string, string>();

	async getItem(key: string): Promise<string | null> {
		return this.storage.get(key) || null;
	}

	async setItem(key: string, value: string): Promise<void> {
		this.storage.set(key, value);
	}

	async removeItem(key: string): Promise<void> {
		this.storage.delete(key);
	}
}

class MockOfflineDetector implements OfflineDetector {
	private online = true;
	private listeners: Map<string, (() => void)[]> = new Map();

	isOnline(): boolean {
		return this.online;
	}

	on(event: 'online' | 'offline', listener: () => void): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event)!.push(listener);
	}

	off(event: 'online' | 'offline', listener: () => void): void {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			const index = eventListeners.indexOf(listener);
			if (index > -1) {
				eventListeners.splice(index, 1);
			}
		}
	}

	destroy(): void {
		this.listeners.clear();
	}

	// Test helpers
	setOnline(online: boolean): void {
		this.online = online;
		const event = online ? 'online' : 'offline';
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			eventListeners.forEach((listener) => listener());
		}
	}
}

class MockLogger implements Logger {
	public logs: Array<{ level: string; message: string; data?: unknown }> = [];

	debug(message: string, data?: unknown): void {
		this.logs.push({ level: 'debug', message, data });
	}

	info(message: string, data?: unknown): void {
		this.logs.push({ level: 'info', message, data });
	}

	warn(message: string, data?: unknown): void {
		this.logs.push({ level: 'warn', message, data });
	}

	error(message: string, data?: unknown): void {
		this.logs.push({ level: 'error', message, data });
	}
}

// Test data
const createTestEvent = (
	overrides: Partial<AnalyticsEvent> = {}
): AnalyticsEvent => ({
	type: 'track',
	name: 'test_event',
	properties: { test: 'value' },
	anonymousId: 'anon-123',
	sessionId: 'session-456',
	consent: {
		necessary: true,
		measurement: false,
		marketing: false,
		functionality: false,
		experience: false,
	},
	timestamp: new Date().toISOString(),
	messageId: 'msg-789',
	context: {
		userAgent: 'test-agent',
	},
	...overrides,
});

const createTestContext = (
	overrides: Partial<EventContext> = {}
): EventContext => ({
	sessionId: 'session-456',
	userId: 'user-123',
	userAgent: 'test-agent',
	ip: '127.0.0.1',
	referrer: 'https://example.com',
	custom: { test: 'value' },
	...overrides,
});

describe('EventQueue', () => {
	let uploader: MockUploader;
	let storage: MockStorageAdapter;
	let offlineDetector: MockOfflineDetector;
	let logger: MockLogger;
	let queue: EventQueue;

	beforeEach(() => {
		uploader = new MockUploader();
		storage = new MockStorageAdapter();
		offlineDetector = new MockOfflineDetector();
		logger = new MockLogger();

		queue = new EventQueue(
			uploader,
			{ debug: true },
			'1.0.0',
			logger,
			storage,
			offlineDetector
		);
	});

	afterEach(() => {
		queue.destroy();
	});

	describe('constructor', () => {
		it('should initialize with default configuration', () => {
			const defaultQueue = new EventQueue(uploader);
			expect(defaultQueue).toBeDefined();
			defaultQueue.destroy();
		});

		it('should initialize with custom configuration', () => {
			const config: QueueConfig = {
				maxQueueSize: 100,
				maxRetries: 5,
				retryDelayMs: 2000,
			};

			const customQueue = new EventQueue(uploader, config);
			expect(customQueue).toBeDefined();
			customQueue.destroy();
		});
	});

	describe('queueEvent', () => {
		it('should queue an event successfully', async () => {
			// Set offline to prevent immediate flushing
			offlineDetector.setOnline(false);

			const event = createTestEvent();
			const context = createTestContext();

			await queue.queueEvent(event, context);

			expect(queue.getQueueSize()).toBe(1);
			expect(logger.logs).toContainEqual(
				expect.objectContaining({
					level: 'debug',
					message: 'Event queued',
				})
			);
		});

		it('should persist queued events to storage', async () => {
			// Set offline to prevent immediate flushing
			offlineDetector.setOnline(false);

			const event = createTestEvent();
			const context = createTestContext();

			await queue.queueEvent(event, context);

			const stored = await storage.getItem('queue');
			expect(stored).toBeTruthy();

			const queuedEvents: QueuedEvent[] = JSON.parse(stored!);
			expect(queuedEvents).toHaveLength(1);
			expect(queuedEvents[0].event).toEqual(event);
			expect(queuedEvents[0].context).toEqual(context);
		});

		it('should flush immediately when queue size exceeds maxQueueSize', async () => {
			const config: QueueConfig = { maxQueueSize: 2 };
			const smallQueue = new EventQueue(
				uploader,
				config,
				'1.0.0',
				logger,
				storage,
				offlineDetector
			);

			const event1 = createTestEvent({ messageId: 'msg-1' });
			const event2 = createTestEvent({ messageId: 'msg-2' });
			const context = createTestContext();

			await smallQueue.queueEvent(event1, context);
			await smallQueue.queueEvent(event2, context);

			// Should have flushed due to maxQueueSize
			expect(uploader.sentRequests.length).toBeGreaterThan(0);

			smallQueue.destroy();
		});
	});

	describe('updateConsent', () => {
		it('should update consent and flush appropriate events', async () => {
			const event = createTestEvent({
				type: 'track',
				consent: {
					necessary: true,
					measurement: false,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});
			const context = createTestContext();

			await queue.queueEvent(event, context);

			const newConsent: AnalyticsConsent = {
				necessary: true,
				measurement: true,
				marketing: false,
				functionality: false,
				experience: false,
			};

			await queue.updateConsent(newConsent);

			// Since track events only need necessary consent, they should be sent
			expect(uploader.sentRequests.length).toBeGreaterThan(0);
			expect(logger.logs).toContainEqual(
				expect.objectContaining({
					level: 'info',
					message: 'Consent updated, flushing queue',
				})
			);
		});

		it('should not remove events when necessary consent is maintained', async () => {
			// Set offline to prevent immediate flushing
			offlineDetector.setOnline(false);

			const event = createTestEvent({
				type: 'track',
				consent: {
					necessary: true,
					measurement: true,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});
			const context = createTestContext();

			await queue.queueEvent(event, context);
			expect(queue.getQueueSize()).toBe(1);

			const updatedConsent: AnalyticsConsent = {
				necessary: true, // Still true
				measurement: false,
				marketing: false,
				functionality: false,
				experience: false,
			};

			await queue.updateConsent(updatedConsent);

			// Events should be sent since necessary consent is maintained
			expect(uploader.sentRequests.length).toBeGreaterThan(0);
			expect(queue.getQueueSize()).toBe(0); // Events were sent, so queue is empty
		});
	});

	describe('flush', () => {
		it('should flush all queued events', async () => {
			const event1 = createTestEvent({ messageId: 'msg-1' });
			const event2 = createTestEvent({ messageId: 'msg-2' });
			const context = createTestContext();

			await queue.queueEvent(event1, context);
			await queue.queueEvent(event2, context);

			await queue.flush();

			expect(uploader.sentRequests.length).toBeGreaterThan(0);
			expect(queue.getQueueSize()).toBe(0);
		});

		it('should handle flush failures gracefully', async () => {
			uploader.shouldFail = true;
			uploader.maxFailures = 1;

			const event = createTestEvent();
			const context = createTestContext();

			await queue.queueEvent(event, context);
			await queue.flush();

			expect(logger.logs).toContainEqual(
				expect.objectContaining({
					level: 'error',
					message: 'Failed to send queued event',
				})
			);
		});

		it('should not flush when already flushing', async () => {
			const event = createTestEvent();
			const context = createTestContext();

			await queue.queueEvent(event, context);

			// Start flush
			const flushPromise = queue.flush();

			// Try to flush again while first flush is in progress
			await queue.flush();

			await flushPromise;

			// Should only have one flush attempt
			expect(uploader.sentRequests.length).toBeLessThanOrEqual(1);
		});
	});

	describe('retry logic', () => {
		it('should retry failed events up to maxRetries', async () => {
			uploader.shouldFail = true;
			uploader.maxFailures = 2; // Fail twice, then succeed

			const event = createTestEvent();
			const context = createTestContext();

			await queue.queueEvent(event, context);
			await queue.flush();

			// Event should still be in queue after first failure
			expect(queue.getQueueSize()).toBe(1);

			await queue.flush();

			// Event should be sent successfully after retry
			expect(uploader.sentRequests.length).toBeGreaterThan(0);
		});

		it('should drop events after maxRetries exceeded', async () => {
			uploader.shouldFail = true;
			uploader.maxFailures = 10; // More than maxRetries

			const event = createTestEvent();
			const context = createTestContext();

			await queue.queueEvent(event, context);
			await queue.flush();
			await queue.flush();
			await queue.flush();
			await queue.flush(); // Exceed maxRetries

			expect(queue.getQueueSize()).toBe(0);
			expect(logger.logs).toContainEqual(
				expect.objectContaining({
					level: 'warn',
					message: 'Event exceeded max retries, dropping',
				})
			);
		});
	});

	describe('offline detection', () => {
		it('should queue events when offline', async () => {
			offlineDetector.setOnline(false);

			const event = createTestEvent();
			const context = createTestContext();

			await queue.queueEvent(event, context);

			expect(queue.getQueueSize()).toBe(1);
			expect(uploader.sentRequests.length).toBe(0);
		});

		it('should flush events when coming back online', async () => {
			offlineDetector.setOnline(false);

			const event = createTestEvent();
			const context = createTestContext();

			await queue.queueEvent(event, context);
			expect(queue.getQueueSize()).toBe(1);

			offlineDetector.setOnline(true);

			// Wait for async flush
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(uploader.sentRequests.length).toBeGreaterThan(0);
		});
	});

	describe('cross-tab synchronization', () => {
		it('should listen for storage events', () => {
			const newQueue = new EventQueue(uploader, { enableCrossTabSync: true });

			expect(window.addEventListener).toHaveBeenCalledWith(
				'storage',
				expect.any(Function)
			);

			newQueue.destroy();
		});

		it('should listen for custom consent change events', () => {
			const newQueue = new EventQueue(uploader, { enableCrossTabSync: true });

			expect(window.addEventListener).toHaveBeenCalledWith(
				'c15t-consent-changed',
				expect.any(Function)
			);

			newQueue.destroy();
		});
	});

	describe('getQueueStats', () => {
		it('should return accurate queue statistics', async () => {
			// Set offline to prevent immediate flushing
			offlineDetector.setOnline(false);

			const event1 = createTestEvent({ messageId: 'msg-1' });
			const event2 = createTestEvent({ messageId: 'msg-2' });
			const context = createTestContext();

			await queue.queueEvent(event1, context);
			await queue.queueEvent(event2, context);

			const stats = queue.getQueueStats();

			expect(stats.size).toBe(2);
			expect(stats.oldestEvent).toBeDefined();
			expect(stats.newestEvent).toBeDefined();
			expect(stats.retryCounts[0]).toBe(2);
		});

		it('should return empty stats for empty queue', () => {
			const stats = queue.getQueueStats();

			expect(stats.size).toBe(0);
			expect(stats.oldestEvent).toBeUndefined();
			expect(stats.newestEvent).toBeUndefined();
			expect(Object.keys(stats.retryCounts)).toHaveLength(0);
		});
	});

	describe('clear', () => {
		it('should clear all queued events', async () => {
			// Set offline to prevent immediate flushing
			offlineDetector.setOnline(false);

			const event = createTestEvent();
			const context = createTestContext();

			await queue.queueEvent(event, context);
			expect(queue.getQueueSize()).toBe(1);

			await queue.clear();

			expect(queue.getQueueSize()).toBe(0);
			expect(logger.logs).toContainEqual(
				expect.objectContaining({
					level: 'info',
					message: 'Queue cleared',
				})
			);
		});
	});

	describe('destroy', () => {
		it('should clean up resources', () => {
			const destroySpy = vi.spyOn(offlineDetector, 'destroy');

			queue.destroy();

			expect(destroySpy).toHaveBeenCalled();
		});
	});

	describe('legacy methods', () => {
		it('should support legacy add method', () => {
			const event = createTestEvent();

			queue.add(event);

			expect(queue.getQueueSize()).toBe(1);
		});

		it('should support legacy getQueueSize method', () => {
			const event = createTestEvent();
			const context = createTestContext();

			queue.queueEvent(event, context);

			expect(queue.getQueueSize()).toBe(1);
		});
	});

	describe('consent-based event filtering', () => {
		it('should only send events that match current consent', async () => {
			// Set offline to prevent immediate flushing
			offlineDetector.setOnline(false);

			const measurementEvent = createTestEvent({
				type: 'track',
				consent: {
					necessary: true,
					measurement: false,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});
			const necessaryEvent = createTestEvent({
				type: 'identify',
				consent: {
					necessary: true,
					measurement: false,
					marketing: false,
					functionality: false,
					experience: false,
				},
			});
			const context = createTestContext();

			await queue.queueEvent(measurementEvent, context);
			await queue.queueEvent(necessaryEvent, context);

			await queue.flush();

			// Both events should be sent since they only need necessary consent
			expect(uploader.sentRequests.length).toBeGreaterThan(0);

			// Check that both event types were sent
			const sentEvents = uploader.sentRequests.flatMap((req) => req.events);
			expect(sentEvents.some((event) => event.type === 'track')).toBe(true);
			expect(sentEvents.some((event) => event.type === 'identify')).toBe(true);
		});
	});

	describe('error handling', () => {
		it('should handle storage errors gracefully', async () => {
			const failingStorage: StorageAdapter = {
				async getItem() {
					throw new Error('Storage error');
				},
				async setItem() {
					throw new Error('Storage error');
				},
				async removeItem() {
					throw new Error('Storage error');
				},
			};

			const failingQueue = new EventQueue(
				uploader,
				{},
				'1.0.0',
				logger,
				failingStorage,
				offlineDetector
			);

			const event = createTestEvent();
			const context = createTestContext();

			// Should not throw
			await expect(
				failingQueue.queueEvent(event, context)
			).resolves.not.toThrow();

			failingQueue.destroy();
		});

		it('should handle invalid consent data gracefully', async () => {
			let storageListener: ((event: StorageEvent) => void) | undefined;

			(window.addEventListener as any).mockImplementation(
				(event: string, listener: any) => {
					if (event === 'storage') {
						storageListener = listener;
					}
				}
			);

			const newQueue = new EventQueue(uploader, { enableCrossTabSync: true });

			// Simulate invalid consent data
			const invalidEvent = new StorageEvent('storage', {
				key: 'c15t-consent',
				newValue: 'invalid-json',
			});

			// Should not throw
			expect(() => {
				if (storageListener) {
					storageListener(invalidEvent);
				}
			}).not.toThrow();

			newQueue.destroy();
		});
	});
});
