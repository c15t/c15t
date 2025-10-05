# Ticket 3.1: Event Queue & Offline Support

## 📋 Ticket Details
**Phase**: 3 - Advanced Features  
**Story Points**: 5  
**Priority**: High  
**Assignee**: TBD  
**Status**: Ready

## 🔗 Dependencies
**Depends on**: Phase 2 Complete  
**Blocking**: Ticket 3.2 (Debug API)  

## 🎯 Description
Implement a comprehensive event queuing system with offline support that queues events until consent is given, then fires all queued events. This system is based on event-detective's queue implementation but enhanced for consent-aware analytics.

## 🧠 Context & Background
This ticket implements the core event queuing system that:
- **Queues events before consent** - All events are stored locally until user grants consent
- **Fires queued events on consent** - When consent is given, all queued events are sent to analytics
- **Handles offline scenarios** - Events are queued when offline and sent when connection is restored
- **Based on event-detective** - Uses existing queue system as foundation
- **Consent-aware flushing** - Only sends events to destinations user has consented to

The queue system must:
- Store events in localStorage/IndexedDB for persistence
- Handle consent changes and flush appropriate events
- Retry failed events with exponential backoff
- Maintain event order and prevent duplicates
- Work across browser tabs/windows

## ✅ Acceptance Criteria
- [ ] Create `EventQueue` class based on event-detective
- [ ] Implement consent-aware event queuing
- [ ] Add offline detection and queuing
- [ ] Add retry logic with exponential backoff
- [ ] Add event deduplication
- [ ] Add cross-tab synchronization
- [ ] Unit tests for queue operations
- [ ] Integration tests with consent system

## 📁 Files to Update
- `packages/core/src/analytics/queue.ts` (extend existing queue)

## 🔧 Implementation Details

### Event Queue Implementation
```typescript
import { EventDetective } from '@c15t/event-detective';
import { AnalyticsEvent, AnalyticsConsent, EventContext } from '../types';

interface QueuedEvent {
  id: string;
  event: AnalyticsEvent;
  context: EventContext;
  timestamp: number;
  retryCount: number;
  lastRetry?: number;
  consentAtTime: AnalyticsConsent;
}

interface QueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelayMs: number;
  flushIntervalMs: number;
  storageKey: string;
}

export class EventQueue {
  private queue: QueuedEvent[] = [];
  private config: QueueConfig;
  private storage: StorageAdapter;
  private offlineDetector: OfflineDetector;
  private flushTimer?: NodeJS.Timeout;
  private isFlushing = false;
  private currentConsent: AnalyticsConsent;

  constructor(
    config: Partial<QueueConfig> = {},
    private logger: Logger
  ) {
    this.config = {
      maxQueueSize: 1000,
      maxRetries: 3,
      retryDelayMs: 1000,
      flushIntervalMs: 5000,
      storageKey: 'c15t-event-queue',
      ...config,
    };

    this.storage = new StorageAdapter(this.config.storageKey);
    this.offlineDetector = new OfflineDetector();
    this.currentConsent = this.getDefaultConsent();

    this.initialize();
  }

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
   * Queue an event for later processing
   */
  async queueEvent(event: AnalyticsEvent, context: EventContext): Promise<void> {
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
   * Update consent and flush appropriate events
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
   * Flush all queued events
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
      const batchSize = 10;
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
      this.logger.error('Queue flush failed', { error: error.message });
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Process a batch of events
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
          error: error.message,
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
   * Send event to analytics endpoint
   */
  private async sendEvent(queuedEvent: QueuedEvent): Promise<void> {
    const payload = {
      events: [queuedEvent.event],
      consent: this.currentConsent,
      sessionId: queuedEvent.context.sessionId,
      userId: queuedEvent.context.userId,
      context: {
        userAgent: queuedEvent.context.userAgent,
        ip: queuedEvent.context.ip,
        referrer: queuedEvent.context.referrer,
        custom: queuedEvent.context.custom,
      },
    };

    const response = await fetch('/analytics/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Analytics endpoint error: ${response.status}`);
    }
  }

  /**
   * Check if event should be sent based on consent
   */
  private shouldSendEvent(queuedEvent: QueuedEvent): boolean {
    // Get required consent for this event type
    const requiredConsent = this.getRequiredConsentForEvent(queuedEvent.event);
    
    // Check if current consent allows this event
    return requiredConsent.every(purpose => this.currentConsent[purpose]);
  }

  /**
   * Flush events that are now allowed due to consent change
   */
  private async flushEventsForConsent(consent: AnalyticsConsent): Promise<void> {
    const eventsToFlush = this.queue.filter(queuedEvent => {
      const requiredConsent = this.getRequiredConsentForEvent(queuedEvent.event);
      return requiredConsent.every(purpose => consent[purpose]);
    });

    if (eventsToFlush.length > 0) {
      this.logger.info('Flushing events for new consent', {
        eventCount: eventsToFlush.length,
        consent,
      });

      const results = await this.processBatch(eventsToFlush);
      
      // Remove successful events from queue
      this.queue = this.queue.filter(event => 
        !results.successful.includes(event.id)
      );
      
      await this.persistToStorage();
    }
  }

  /**
   * Remove events that are no longer allowed
   */
  private removeEventsForRevokedConsent(
    oldConsent: AnalyticsConsent,
    newConsent: AnalyticsConsent
  ): void {
    const revokedPurposes = Object.keys(newConsent).filter(
      purpose => oldConsent[purpose as keyof AnalyticsConsent] && 
                !newConsent[purpose as keyof AnalyticsConsent]
    );

    if (revokedPurposes.length > 0) {
      const initialLength = this.queue.length;
      
      this.queue = this.queue.filter(queuedEvent => {
        const requiredConsent = this.getRequiredConsentForEvent(queuedEvent.event);
        return !requiredConsent.some(purpose => revokedPurposes.includes(purpose));
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
   * Listen for consent changes from other tabs
   */
  private listenForConsentChanges(): void {
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
    window.addEventListener('c15t-consent-changed', (event: CustomEvent) => {
      if (event.detail?.consent) {
        this.updateConsent(event.detail.consent);
      }
    });
  }

  /**
   * Check if we should flush immediately
   */
  private shouldFlushImmediately(): boolean {
    return this.queue.length >= this.config.maxQueueSize ||
           this.offlineDetector.isOnline();
  }

  /**
   * Start the flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.offlineDetector.isOnline() && this.queue.length > 0) {
        this.flush();
      }
    }, this.config.flushIntervalMs);
  }

  /**
   * Load queue from storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await this.storage.getItem('queue');
      if (stored) {
        this.queue = JSON.parse(stored);
        this.logger.info('Loaded queue from storage', { 
          eventCount: this.queue.length 
        });
      }
    } catch (error) {
      this.logger.error('Failed to load queue from storage', { error });
    }
  }

  /**
   * Persist queue to storage
   */
  private async persistToStorage(): Promise<void> {
    try {
      await this.storage.setItem('queue', JSON.stringify(this.queue));
    } catch (error) {
      this.logger.error('Failed to persist queue to storage', { error });
    }
  }

  /**
   * Get required consent for event type
   */
  private getRequiredConsentForEvent(event: AnalyticsEvent): string[] {
    const eventConsentMap: Record<string, string[]> = {
      'track': ['necessary', 'measurement'],
      'page': ['necessary', 'measurement'],
      'identify': ['necessary'],
      'group': ['necessary'],
      'alias': ['necessary'],
      'consent': ['necessary'], // Consent events always allowed
    };

    return eventConsentMap[event.type] || ['necessary'];
  }

  /**
   * Get default consent state
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
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue statistics
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

    this.queue.forEach(event => {
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
   * Clear the queue
   */
  async clear(): Promise<void> {
    this.queue = [];
    await this.persistToStorage();
    this.logger.info('Queue cleared');
  }

  /**
   * Destroy the queue
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.offlineDetector.destroy();
  }
}
```

### Storage Adapter
```typescript
export class StorageAdapter {
  constructor(private key: string) {}

  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(`${this.key}_${key}`);
    } catch (error) {
      console.warn('localStorage not available, falling back to memory');
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(`${this.key}_${key}`, value);
    } catch (error) {
      console.warn('localStorage not available, data not persisted');
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(`${this.key}_${key}`);
    } catch (error) {
      console.warn('localStorage not available');
    }
  }
}
```

### Offline Detector
```typescript
import { EventEmitter } from 'events';

export class OfflineDetector extends EventEmitter {
  private isOnline = navigator.onLine;

  constructor() {
    super();
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('offline');
    });
  }

  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}
```

## 🧪 Testing Requirements
- Unit tests for event queuing
- Unit tests for consent-aware flushing
- Unit tests for offline/online handling
- Unit tests for retry logic
- Unit tests for cross-tab synchronization
- Integration tests with consent system
- Performance tests for large queues

## 🔍 Definition of Done
- [ ] EventQueue class queues events before consent
- [ ] Events are flushed when consent is given
- [ ] Offline detection and queuing implemented
- [ ] Retry logic with exponential backoff
- [ ] Event deduplication prevents duplicates
- [ ] Cross-tab synchronization works
- [ ] Unit tests for all queue operations
- [ ] Integration tests with consent system
- [ ] Code review completed

## 📚 Related Documentation
- [Analytics Architecture Diagram](../docs/analytics-architecture-diagram.md)
- [Analytics Frontend Integration](../docs/analytics-frontend-integration.md)

## 🔗 Dependencies
- event-detective package (existing)
- Core analytics types ✅

## 🚀 Next Ticket
[5.2: Implement Debug API](./23-debug-api.md)
