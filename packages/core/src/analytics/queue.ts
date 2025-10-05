/**
 * @packageDocumentation
 * Event queue management for analytics.
 * Handles event batching, deduplication, and upload with retry logic.
 */

import type { AnalyticsEvent, Uploader, UploadRequest } from './types';

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
};

/**
 * Event queue manager.
 * Handles batching, deduplication, and upload of analytics events.
 */
export class EventQueue {
	private events: AnalyticsEvent[] = [];
	private debounceTimeout: NodeJS.Timeout | null = null;
	private uploader: Uploader;
	private config: Required<QueueConfig>;
	private version: string;

	constructor(uploader: Uploader, config: QueueConfig = {}, version = '1.0.0') {
		this.uploader = uploader;
		this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
		this.version = version;
	}

	/**
	 * Add an event to the queue.
	 *
	 * @param event - The analytics event to queue
	 *
	 * @example
	 * ```typescript
	 * queue.add({
	 *   type: 'track',
	 *   name: 'button_clicked',
	 *   properties: { button: 'cta' },
	 *   anonymousId: 'anon-123',
	 *   sessionId: 'session-456',
	 *   consent: { necessary: true, measurement: true, marketing: false, functionality: false, experience: false },
	 *   timestamp: new Date().toISOString(),
	 *   messageId: 'msg-789',
	 *   context: {}
	 * });
	 * ```
	 */
	add(event: AnalyticsEvent): void {
		this.events.push(event);

		// Clear existing timeout
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout);
		}

		// Set new timeout to flush events
		this.debounceTimeout = setTimeout(() => {
			this.flush();
		}, this.config.debounceInterval);
	}

	/**
	 * Immediately flush all queued events.
	 *
	 * @returns Promise that resolves when upload is complete
	 *
	 * @example
	 * ```typescript
	 * await queue.flush();
	 * ```
	 */
	async flush(): Promise<void> {
		if (this.events.length === 0) {
			return;
		}

		// Clear timeout
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout);
			this.debounceTimeout = null;
		}

		// Get events to send
		const eventsToSend = [...this.events];
		this.events = [];

		// Deduplicate if enabled
		const deduplicatedEvents = this.config.enableDeduplication
			? this.deduplicateEvents(eventsToSend)
			: eventsToSend;

		if (deduplicatedEvents.length === 0) {
			return;
		}

		// Create upload request
		const uploadRequest: UploadRequest = {
			events: deduplicatedEvents,
			sentAt: new Date().toISOString(),
			version: this.version,
		};

		try {
			await this.uploader.send(uploadRequest);
		} catch (error) {
			// If upload fails and offline queue is enabled, store events
			if (this.config.enableOfflineQueue) {
				this.storeOfflineEvents(deduplicatedEvents);
			}
			throw error;
		}
	}

	/**
	 * Deduplicate events based on type, name, properties, and timestamp.
	 *
	 * @param events - Array of events to deduplicate
	 * @returns Array of unique events
	 *
	 * @example
	 * ```typescript
	 * const uniqueEvents = queue.deduplicateEvents(events);
	 * ```
	 */
	private deduplicateEvents(events: AnalyticsEvent[]): AnalyticsEvent[] {
		const uniqueEvents: Record<string, AnalyticsEvent> = {};

		for (const event of events) {
			// Create a key for deduplication
			const key = this.createEventKey(event);
			uniqueEvents[key] = event;
		}

		return Object.values(uniqueEvents);
	}

	/**
	 * Create a unique key for event deduplication.
	 *
	 * @param event - The event to create a key for
	 * @returns Unique key string
	 */
	private createEventKey(event: AnalyticsEvent): string {
		const { type, name, properties, timestamp, anonymousId } = event;

		// Create a deterministic key
		const keyParts = [
			type,
			name || '',
			JSON.stringify(properties),
			timestamp,
			anonymousId,
		];

		return keyParts.join('|');
	}

	/**
	 * Store events offline for later retry.
	 *
	 * @param events - Events to store offline
	 */
	private storeOfflineEvents(events: AnalyticsEvent[]): void {
		if (typeof window === 'undefined') {
			return;
		}

		try {
			const stored = localStorage.getItem('c15t-analytics-offline');
			const offlineEvents: AnalyticsEvent[] = stored ? JSON.parse(stored) : [];

			// Add new events
			offlineEvents.push(...events);

			// Limit to max offline events
			if (offlineEvents.length > this.config.maxOfflineEvents) {
				offlineEvents.splice(
					0,
					offlineEvents.length - this.config.maxOfflineEvents
				);
			}

			localStorage.setItem(
				'c15t-analytics-offline',
				JSON.stringify(offlineEvents)
			);
		} catch (error) {
			console.warn('Failed to store events offline:', error);
		}
	}

	/**
	 * Retry sending offline events.
	 *
	 * @returns Promise that resolves when retry is complete
	 */
	async retryOfflineEvents(): Promise<void> {
		if (typeof window === 'undefined') {
			return;
		}

		try {
			const stored = localStorage.getItem('c15t-analytics-offline');
			if (!stored) {
				return;
			}

			const offlineEvents: AnalyticsEvent[] = JSON.parse(stored);
			if (offlineEvents.length === 0) {
				return;
			}

			// Try to send offline events
			const uploadRequest: UploadRequest = {
				events: offlineEvents,
				sentAt: new Date().toISOString(),
				version: this.version,
			};

			await this.uploader.send(uploadRequest);

			// Clear offline events on success
			localStorage.removeItem('c15t-analytics-offline');
		} catch (error) {
			console.warn('Failed to retry offline events:', error);
		}
	}

	/**
	 * Get the number of queued events.
	 *
	 * @returns Number of events in queue
	 */
	getQueueSize(): number {
		return this.events.length;
	}

	/**
	 * Clear all queued events.
	 */
	clear(): void {
		this.events = [];
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout);
			this.debounceTimeout = null;
		}
	}

	/**
	 * Destroy the queue and clean up resources.
	 */
	destroy(): void {
		this.clear();
	}
}
