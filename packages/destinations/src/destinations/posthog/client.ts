import type { Logger } from '@doubletie/logger';

/**
 * PostHog API client with batching and error handling
 */
export class PostHogClient {
	private apiKey: string;
	private host: string;
	private flushAt: number;
	private flushInterval: number;
	private queue: PostHogEvent[] = [];
	private timer?: NodeJS.Timeout;
	private logger: Logger;

	constructor(options: {
		apiKey: string;
		host: string;
		flushAt: number;
		flushInterval: number;
		logger: Logger;
	}) {
		this.apiKey = options.apiKey;
		this.host = options.host;
		this.flushAt = options.flushAt;
		this.flushInterval = options.flushInterval;
		this.logger = options.logger;

		// Start flush timer
		this.timer = setInterval(() => this.flush(), this.flushInterval);

		this.logger.debug('PostHog client initialized', {
			host: this.host,
			flushAt: this.flushAt,
			flushInterval: this.flushInterval,
		});
	}

	/**
	 * Capture an event
	 */
	async capture(data: PostHogCaptureData): Promise<void> {
		const event: PostHogEvent = {
			...data,
			api_key: this.apiKey,
			type: 'capture',
		};

		this.queue.push(event);

		if (this.queue.length >= this.flushAt) {
			await this.flush();
		}
	}

	/**
	 * Identify a user
	 */
	async identify(data: PostHogIdentifyData): Promise<void> {
		const event: PostHogEvent = {
			...data,
			api_key: this.apiKey,
			type: 'identify',
		};

		this.queue.push(event);

		if (this.queue.length >= this.flushAt) {
			await this.flush();
		}
	}

	/**
	 * Group identify
	 */
	async groupIdentify(data: PostHogGroupIdentifyData): Promise<void> {
		const event: PostHogEvent = {
			...data,
			distinctId: 'group', // Group identify doesn't need a specific distinctId
			api_key: this.apiKey,
			type: 'groupidentify',
		};

		this.queue.push(event);

		if (this.queue.length >= this.flushAt) {
			await this.flush();
		}
	}

	/**
	 * Create alias
	 */
	async alias(data: PostHogAliasData): Promise<void> {
		const event: PostHogEvent = {
			...data,
			api_key: this.apiKey,
			type: 'alias',
		};

		this.queue.push(event);

		if (this.queue.length >= this.flushAt) {
			await this.flush();
		}
	}

	/**
	 * Flush queued events to PostHog API
	 */
	private async flush(): Promise<void> {
		if (this.queue.length === 0) return;

		const batch = this.queue.splice(0, this.flushAt);
		const batchSize = batch.length;

		try {
			this.logger.debug('Flushing events to PostHog', { batchSize });

			const response = await fetch(`${this.host}/capture/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'c15t-posthog-client/1.0.0',
				},
				body: JSON.stringify({
					batch,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`PostHog API error: ${response.status} ${response.statusText} - ${errorText}`
				);
			}

			this.logger.debug('Successfully flushed events to PostHog', {
				batchSize,
			});
		} catch (error) {
			// Re-queue failed events
			this.queue.unshift(...batch);

			this.logger.error('Failed to flush events to PostHog', {
				batchSize,
				error: error instanceof Error ? error.message : String(error),
			});

			throw error;
		}
	}

	/**
	 * Shutdown the client and flush remaining events
	 */
	async shutdown(): Promise<void> {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = undefined;
		}

		// Flush any remaining events
		if (this.queue.length > 0) {
			this.logger.debug(
				'Shutting down PostHog client, flushing remaining events',
				{
					remainingEvents: this.queue.length,
				}
			);
			await this.flush();
		}

		this.logger.debug('PostHog client shutdown complete');
	}
}

/**
 * PostHog event types
 */
interface PostHogEvent {
	api_key: string;
	type: 'capture' | 'identify' | 'groupidentify' | 'alias';
	distinctId: string;
	event?: string;
	properties?: Record<string, unknown>;
	timestamp?: string;
	groupType?: string;
	groupKey?: string;
	alias?: string;
}

interface PostHogCaptureData {
	distinctId: string;
	event: string;
	properties?: Record<string, unknown>;
	timestamp?: string;
}

interface PostHogIdentifyData {
	distinctId: string;
	properties?: Record<string, unknown>;
}

interface PostHogGroupIdentifyData {
	groupType: string;
	groupKey: string;
	properties?: Record<string, unknown>;
}

interface PostHogAliasData {
	distinctId: string;
	alias: string;
}
