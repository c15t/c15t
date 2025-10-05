/**
 * @packageDocumentation
 * Event queue management for analytics.
 * Handles event batching, deduplication, and upload with retry logic.
 * Enhanced with consent-aware queuing and offline support.
 */

import type {
	AnalyticsConsent,
	AnalyticsEvent,
	ConsentPurpose,
	Uploader,
	UploadRequest,
} from './types';

/**
 * Configuration for event queue.
 */
export interface QueueConfig {
	/** Maximum number of events to batch together */
	maxBatchSize?: number;
	/** Debounce interval in milliseconds */
	debounceInterval?: number;
	/** Whether to enable deduplication */
	enableDeduplication?: boolean;
	/** Whether to enable offline queuing */
	enableOfflineQueue?: boolean;
	/** Maximum number of events to store offline */
	maxOfflineEvents?: number;
	/** Maximum queue size before forcing flush */
	maxQueueSize?: number;
	/** Maximum retry attempts for failed events */
	maxRetries?: number;
	/** Base delay for retry attempts in milliseconds */
	retryDelayMs?: number;
	/** Flush interval in milliseconds */
	flushIntervalMs?: number;
	/** Storage key for persistent queue */
	storageKey?: string;
	/** Enable cross-tab synchronization */
	enableCrossTabSync?: boolean;
	/** Enable change tracking */
	enableChangeTracking?: boolean;
	/** Enable debug logging */
	debug?: boolean;
}

/**
 * Queued event with enhanced metadata for consent-aware processing.
 */
export interface QueuedEvent {
	/** Unique event ID */
	id: string;
	/** The analytics event */
	event: AnalyticsEvent;
	/** Event context */
	context: EventContext;
	/** When the event was queued */
	timestamp: number;
	/** Number of retry attempts */
	retryCount: number;
	/** Last retry timestamp */
	lastRetry?: number;
	/** Consent state when event was queued */
	consentAtTime: AnalyticsConsent;
}

/**
 * Event context for enhanced tracking.
 */
export interface EventContext {
	/** Session ID */
	sessionId: string;
	/** User ID */
	userId?: string;
	/** User agent */
	userAgent: string;
	/** IP address */
	ip?: string;
	/** Referrer */
	referrer?: string;
	/** Custom context data */
	custom?: Record<string, unknown>;
}

/**
 * Storage adapter interface for queue persistence.
 */
export interface StorageAdapter {
	/** Get item from storage */
	getItem(key: string): Promise<string | null>;
	/** Set item in storage */
	setItem(key: string, value: string): Promise<void>;
	/** Remove item from storage */
	removeItem(key: string): Promise<void>;
}

/**
 * Offline detector interface for network status monitoring.
 */
export interface OfflineDetector {
	/** Check if device is online */
	isOnline(): boolean;
	/** Add event listener */
	on(event: 'online' | 'offline', listener: () => void): void;
	/** Remove event listener */
	off(event: 'online' | 'offline', listener: () => void): void;
	/** Cleanup resources */
	destroy(): void;
}

/**
 * Logger interface for queue operations.
 */
export interface Logger {
	/** Log debug message */
	debug(message: string, data?: unknown): void;
	/** Log info message */
	info(message: string, data?: unknown): void;
	/** Log warning message */
	warn(message: string, data?: unknown): void;
	/** Log error message */
	error(message: string, data?: unknown): void;
}

/**
 * Default queue configuration.
 */
export const DEFAULT_QUEUE_CONFIG: Required<QueueConfig> = {
	maxBatchSize: 50,
	debounceInterval: 300,
	enableDeduplication: true,
	enableOfflineQueue: true,
	maxOfflineEvents: 1000,
	maxQueueSize: 1000,
	maxRetries: 3,
	retryDelayMs: 1000,
	flushIntervalMs: 5000,
	storageKey: 'c15t-event-queue',
	enableCrossTabSync: true,
	enableChangeTracking: true,
	debug: false,
};

/**
 * Enhanced event queue manager with consent-aware queuing and offline support.
 * Handles batching, deduplication, upload, and consent-based event processing.
 */
export class EventQueue {
	private queue: QueuedEvent[] = [];
	private config: Required<QueueConfig>;
	private storage: StorageAdapter;
	private offlineDetector: OfflineDetector;
	private flushTimer?: NodeJS.Timeout;
	private isFlushing = false;
	private currentConsent: AnalyticsConsent;
	private uploader: Uploader;
	private logger: Logger;
	private version: string;

	constructor(
		uploader: Uploader,
		config: QueueConfig = {},
		version = '1.0.0',
		logger?: Logger,
		storage?: StorageAdapter,
		offlineDetector?: OfflineDetector
	) {
		this.uploader = uploader;
		this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
		this.version = version;
		this.logger = logger || this.createDefaultLogger();
		this.storage = storage || this.createDefaultStorage();
		this.offlineDetector =
			offlineDetector || this.createDefaultOfflineDetector();
		this.currentConsent = this.getDefaultConsent();

		// Initialize synchronously to avoid async issues in tests
		this.initializeSync();
	}

	/**
	 * Initialize the queue system synchronously.
	 */
	private initializeSync(): void {
		// Start flush timer
		this.startFlushTimer();

		// Listen for offline/online events
		this.offlineDetector.on('offline', () => {
			this.logger.info('Device went offline, queuing events');
		});

		this.offlineDetector.on('online', () => {
			this.logger.info('Device came online, flushing queue');
			this.flush();
		});

		// Listen for consent changes
		this.listenForConsentChanges();

		// Load existing queue from storage asynchronously
		this.loadFromStorage().catch((error) => {
			this.logger.error(
				'Failed to load queue from storage during initialization',
				{ error }
			);
		});
	}

	/**
	 * Initialize the queue system.
	 */
	private async initialize(): Promise<void> {
		// Load existing queue from storage
		await this.loadFromStorage();

		// Start flush timer
		this.startFlushTimer();

		// Listen for offline/online events
		this.offlineDetector.on('offline', () => {
			this.logger.info('Device went offline, queuing events');
		});

		this.offlineDetector.on('online', () => {
			this.logger.info('Device came online, flushing queue');
			this.flush();
		});

		// Listen for consent changes
		this.listenForConsentChanges();
	}

	/**
	 * Queue an event for later processing.
	 */
	async queueEvent(
		event: AnalyticsEvent,
		context: EventContext
	): Promise<void> {
		const queuedEvent: QueuedEvent = {
			id: this.generateEventId(),
			event,
			context,
			timestamp: Date.now(),
			retryCount: 0,
			consentAtTime: { ...this.currentConsent },
		};

		// Add to memory queue
		this.queue.push(queuedEvent);

		// Persist to storage
		await this.persistToStorage();

		this.logger.debug('Event queued', {
			eventId: queuedEvent.id,
			eventType: event.type,
			queueSize: this.queue.length,
		});

		// Check if we should flush immediately
		if (this.shouldFlushImmediately()) {
			await this.flush();
		}
	}

	/**
	 * Update consent and flush appropriate events.
	 */
	async updateConsent(newConsent: AnalyticsConsent): Promise<void> {
		const oldConsent = { ...this.currentConsent };
		this.currentConsent = newConsent;

		this.logger.info('Consent updated, flushing queue', {
			oldConsent,
			newConsent,
			queueSize: this.queue.length,
		});

		// Flush events that are now allowed
		await this.flushEventsForConsent(newConsent);

		// Remove events that are no longer allowed (if consent was revoked)
		this.removeEventsForRevokedConsent(oldConsent, newConsent);
	}

	/**
	 * Flush all queued events.
	 */
	async flush(): Promise<void> {
		if (this.isFlushing || this.queue.length === 0) {
			return;
		}

		this.isFlushing = true;

		try {
			const eventsToFlush = [...this.queue];
			const successfulEvents: string[] = [];
			const failedEvents: QueuedEvent[] = [];

			this.logger.info('Flushing event queue', {
				totalEvents: eventsToFlush.length,
				consent: this.currentConsent,
			});

			// Process events in batches
			const batchSize = this.config.maxBatchSize;
			for (let i = 0; i < eventsToFlush.length; i += batchSize) {
				const batch = eventsToFlush.slice(i, i + batchSize);
				const results = await this.processBatch(batch);

				successfulEvents.push(...results.successful);
				failedEvents.push(...results.failed);
			}

			// Update queue with failed events
			this.queue = failedEvents;
			await this.persistToStorage();

			this.logger.info('Queue flush completed', {
				successful: successfulEvents.length,
				failed: failedEvents.length,
				remaining: this.queue.length,
			});
		} catch (error) {
			this.logger.error('Queue flush failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			this.isFlushing = false;
		}
	}

	/**
	 * Process a batch of events.
	 */
	private async processBatch(events: QueuedEvent[]): Promise<{
		successful: string[];
		failed: QueuedEvent[];
	}> {
		const successful: string[] = [];
		const failed: QueuedEvent[] = [];

		const promises = events.map(async (queuedEvent) => {
			try {
				// Check if event should be sent based on current consent
				if (!this.shouldSendEvent(queuedEvent)) {
					successful.push(queuedEvent.id);
					return;
				}

				// Send event to analytics endpoint
				await this.sendEvent(queuedEvent);
				successful.push(queuedEvent.id);
			} catch (error) {
				this.logger.error('Failed to send queued event', {
					eventId: queuedEvent.id,
					error: error instanceof Error ? error.message : String(error),
					retryCount: queuedEvent.retryCount,
				});

				// Increment retry count
				queuedEvent.retryCount++;
				queuedEvent.lastRetry = Date.now();

				// Check if we should retry
				if (queuedEvent.retryCount <= this.config.maxRetries) {
					failed.push(queuedEvent);
				} else {
					this.logger.warn('Event exceeded max retries, dropping', {
						eventId: queuedEvent.id,
						retryCount: queuedEvent.retryCount,
					});
				}
			}
		});

		await Promise.allSettled(promises);

		return { successful, failed };
	}

	/**
	 * Send event to analytics endpoint.
	 */
	private async sendEvent(queuedEvent: QueuedEvent): Promise<void> {
		const payload: UploadRequest = {
			events: [queuedEvent.event],
			sentAt: new Date().toISOString(),
			version: this.version,
		};

		await this.uploader.send(payload);
	}

	/**
	 * Check if event should be sent based on consent.
	 */
	private shouldSendEvent(queuedEvent: QueuedEvent): boolean {
		// Get required consent for this event type
		const requiredConsent = this.getRequiredConsentForEvent(queuedEvent.event);

		// Check if current consent allows this event
		return requiredConsent.every((purpose) => this.currentConsent[purpose]);
	}

	/**
	 * Flush events that are now allowed due to consent change.
	 */
	private async flushEventsForConsent(
		consent: AnalyticsConsent
	): Promise<void> {
		const eventsToFlush = this.queue.filter((queuedEvent) => {
			const requiredConsent = this.getRequiredConsentForEvent(
				queuedEvent.event
			);
			return requiredConsent.every((purpose) => consent[purpose]);
		});

		if (eventsToFlush.length > 0) {
			this.logger.info('Flushing events for new consent', {
				eventCount: eventsToFlush.length,
				consent,
			});

			const results = await this.processBatch(eventsToFlush);

			// Remove successful events from queue
			this.queue = this.queue.filter(
				(event) => !results.successful.includes(event.id)
			);

			await this.persistToStorage();
		}
	}

	/**
	 * Remove events that are no longer allowed.
	 */
	private removeEventsForRevokedConsent(
		oldConsent: AnalyticsConsent,
		newConsent: AnalyticsConsent
	): void {
		const revokedPurposes = Object.keys(newConsent).filter(
			(purpose) =>
				oldConsent[purpose as keyof AnalyticsConsent] &&
				!newConsent[purpose as keyof AnalyticsConsent]
		);

		if (revokedPurposes.length > 0) {
			const initialLength = this.queue.length;

			this.queue = this.queue.filter((queuedEvent) => {
				const requiredConsent = this.getRequiredConsentForEvent(
					queuedEvent.event
				);
				return !requiredConsent.some((purpose) =>
					revokedPurposes.includes(purpose)
				);
			});

			const removedCount = initialLength - this.queue.length;
			if (removedCount > 0) {
				this.logger.info('Removed events due to consent revocation', {
					removedCount,
					revokedPurposes,
				});

				this.persistToStorage();
			}
		}
	}

	/**
	 * Listen for consent changes from other tabs.
	 */
	private listenForConsentChanges(): void {
		if (typeof window === 'undefined') return;

		window.addEventListener('storage', (event) => {
			if (event.key === 'c15t-consent' && event.newValue) {
				try {
					const newConsent = JSON.parse(event.newValue);
					this.updateConsent(newConsent);
				} catch (error) {
					this.logger.error('Failed to parse consent from storage', { error });
				}
			}
		});

		// Listen for custom consent change events
		window.addEventListener('c15t-consent-changed', (event: Event) => {
			const customEvent = event as CustomEvent;
			if (customEvent.detail?.consent) {
				this.updateConsent(customEvent.detail.consent);
			}
		});
	}

	/**
	 * Check if we should flush immediately.
	 */
	private shouldFlushImmediately(): boolean {
		return (
			this.queue.length >= this.config.maxQueueSize ||
			this.offlineDetector.isOnline()
		);
	}

	/**
	 * Start the flush timer.
	 */
	private startFlushTimer(): void {
		this.flushTimer = setInterval(() => {
			if (this.offlineDetector.isOnline() && this.queue.length > 0) {
				this.flush();
			}
		}, this.config.flushIntervalMs);
	}

	/**
	 * Load queue from storage.
	 */
	private async loadFromStorage(): Promise<void> {
		try {
			const stored = await this.storage.getItem('queue');
			if (stored) {
				this.queue = JSON.parse(stored);
				this.logger.info('Loaded queue from storage', {
					eventCount: this.queue.length,
				});
			}
		} catch (error) {
			this.logger.error('Failed to load queue from storage', { error });
		}
	}

	/**
	 * Persist queue to storage.
	 */
	private async persistToStorage(): Promise<void> {
		try {
			await this.storage.setItem('queue', JSON.stringify(this.queue));
		} catch (error) {
			this.logger.error('Failed to persist queue to storage', { error });
		}
	}

	/**
	 * Get required consent for event type.
	 */
	private getRequiredConsentForEvent(event: AnalyticsEvent): ConsentPurpose[] {
		const eventConsentMap: Record<string, ConsentPurpose[]> = {
			track: ['necessary'], // Track events only need necessary consent
			page: ['necessary'], // Page events only need necessary consent
			identify: ['necessary'],
			group: ['necessary'],
			alias: ['necessary'],
			consent: ['necessary'], // Consent events always allowed
		};

		return eventConsentMap[event.type] || ['necessary'];
	}

	/**
	 * Get default consent state.
	 */
	private getDefaultConsent(): AnalyticsConsent {
		return {
			necessary: true,
			measurement: false,
			marketing: false,
			functionality: false,
			experience: false,
		};
	}

	/**
	 * Generate unique event ID.
	 */
	private generateEventId(): string {
		return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Get queue statistics.
	 */
	getQueueStats(): {
		size: number;
		oldestEvent?: number;
		newestEvent?: number;
		retryCounts: Record<number, number>;
	} {
		const retryCounts: Record<number, number> = {};
		let oldestEvent: number | undefined;
		let newestEvent: number | undefined;

		this.queue.forEach((event) => {
			retryCounts[event.retryCount] = (retryCounts[event.retryCount] || 0) + 1;

			if (!oldestEvent || event.timestamp < oldestEvent) {
				oldestEvent = event.timestamp;
			}

			if (!newestEvent || event.timestamp > newestEvent) {
				newestEvent = event.timestamp;
			}
		});

		return {
			size: this.queue.length,
			oldestEvent,
			newestEvent,
			retryCounts,
		};
	}

	/**
	 * Clear the queue.
	 */
	async clear(): Promise<void> {
		this.queue = [];
		await this.persistToStorage();
		this.logger.info('Queue cleared');
	}

	/**
	 * Destroy the queue and clean up resources.
	 */
	destroy(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
		}
		this.offlineDetector.destroy();
	}

	/**
	 * Create default logger implementation.
	 */
	private createDefaultLogger(): Logger {
		return {
			debug: (message: string, data?: unknown) => {
				if (this.config.debug) {
					console.debug(`[EventQueue] ${message}`, data);
				}
			},
			info: (message: string, data?: unknown) => {
				console.info(`[EventQueue] ${message}`, data);
			},
			warn: (message: string, data?: unknown) => {
				console.warn(`[EventQueue] ${message}`, data);
			},
			error: (message: string, data?: unknown) => {
				console.error(`[EventQueue] ${message}`, data);
			},
		};
	}

	/**
	 * Create default storage adapter.
	 */
	private createDefaultStorage(): StorageAdapter {
		const storageKey = this.config.storageKey;
		return {
			async getItem(key: string): Promise<string | null> {
				try {
					return localStorage.getItem(`${storageKey}_${key}`);
				} catch {
					console.warn('localStorage not available, falling back to memory');
					return null;
				}
			},
			async setItem(key: string, value: string): Promise<void> {
				try {
					localStorage.setItem(`${storageKey}_${key}`, value);
				} catch {
					console.warn('localStorage not available, data not persisted');
				}
			},
			async removeItem(key: string): Promise<void> {
				try {
					localStorage.removeItem(`${storageKey}_${key}`);
				} catch {
					console.warn('localStorage not available');
				}
			},
		};
	}

	/**
	 * Create default offline detector.
	 */
	private createDefaultOfflineDetector(): OfflineDetector {
		return new DefaultOfflineDetector();
	}

	// Legacy methods for backward compatibility
	/**
	 * Add an event to the queue (legacy method).
	 * @deprecated Use queueEvent instead
	 */
	add(event: AnalyticsEvent): void {
		const context: EventContext = {
			sessionId: event.sessionId,
			userId: event.userId,
			userAgent: event.context.userAgent || navigator.userAgent,
			ip: event.context.ip,
			referrer: event.context.page?.url,
			custom: {},
		};

		this.queueEvent(event, context);
	}

	/**
	 * Get the number of queued events (legacy method).
	 */
	getQueueSize(): number {
		return this.queue.length;
	}
}

/**
 * Default offline detector implementation using navigator.onLine.
 */
class DefaultOfflineDetector implements OfflineDetector {
	private onlineStatus =
		typeof navigator !== 'undefined' ? navigator.onLine : true;
	private listeners: Map<string, (() => void)[]> = new Map();

	constructor() {
		if (typeof window !== 'undefined') {
			this.setupListeners();
		}
	}

	private setupListeners(): void {
		const handleOnline = () => {
			this.onlineStatus = true;
			this.emit('online');
		};

		const handleOffline = () => {
			this.onlineStatus = false;
			this.emit('offline');
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
	}

	isOnline(): boolean {
		return this.onlineStatus;
	}

	on(event: 'online' | 'offline', listener: () => void): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			eventListeners.push(listener);
		}
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

	private emit(event: 'online' | 'offline'): void {
		const eventListeners = this.listeners.get(event);
		if (eventListeners) {
			eventListeners.forEach((listener) => {
				listener();
			});
		}
	}

	destroy(): void {
		this.listeners.clear();
	}
}
