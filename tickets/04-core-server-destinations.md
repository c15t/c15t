# Ticket 1.4: Core Server Destinations

## 📋 Ticket Details
**Phase**: 1 - Core Analytics Infrastructure  
**Story Points**: 5  
**Priority**: Critical  
**Assignee**: TBD  
**Status**: Ready

## 🔗 Dependencies
**Depends on**: Ticket 1.1 (Core Analytics Types), Ticket 1.2 (Destination Registry & Manager), Ticket 1.3 (Event Processor)  
**Blocking**: Ticket 1.6 (c15tInstance Factory)  

## 🎯 Description
Implement PostHog and Console destinations as the first concrete implementations of the DestinationPlugin interface. These destinations will validate the plugin architecture and provide immediate value for analytics tracking.

## 🧠 Context & Background
This ticket creates the first two destination implementations:
- **PostHog**: Production-ready analytics destination for product analytics
- **Console**: Development/debugging destination for local testing

These destinations must:
- Implement the DestinationPlugin interface correctly
- Handle all event types (track, page, identify, group, alias, consent)
- Validate settings using Zod schemas
- Provide connection testing capabilities
- Handle errors gracefully
- Support GDPR consent filtering

The PostHog destination will be used by customers for real analytics, while Console will be used for development and debugging.

## ✅ Acceptance Criteria
- [ ] Create `PostHogDestination` class implementing `DestinationPlugin`
- [ ] Create `ConsoleDestination` class for debugging
- [ ] Implement Zod validation for settings
- [ ] Add connection testing
- [ ] Add proper error handling
- [ ] Unit tests for both destinations
- [ ] Integration tests with real APIs

## 📁 Files to Update
- `packages/destinations/` (add new destinations)

## 🔧 Implementation Details

### PostHog Destination
```typescript
import { z } from 'zod';
import { DestinationPlugin, TrackEvent, PageEvent, IdentifyEvent, GroupEvent, AliasEvent, ConsentEvent, EventContext } from '@c15t/backend/v2';

const PostHogSettingsSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  host: z.string().url().optional().default('https://app.posthog.com'),
  flushAt: z.number().min(1).max(1000).optional().default(20),
  flushInterval: z.number().min(1000).optional().default(10000),
});

type PostHogSettings = z.infer<typeof PostHogSettingsSchema>;

export class PostHogDestination implements DestinationPlugin<PostHogSettings> {
  readonly type = 'posthog';
  readonly version = '1.0.0';
  readonly gdprCompliant = true;
  readonly settingsSchema = PostHogSettingsSchema;
  readonly requiredConsent = ['measurement'] as const;
  
  private settings: PostHogSettings;
  private client: PostHogClient;
  
  constructor(settings: PostHogSettings) {
    this.settings = settings;
  }
  
  async initialize(settings: PostHogSettings): Promise<void> {
    // Validate settings
    this.settings = this.settingsSchema.parse(settings);
    
    // Initialize PostHog client
    this.client = new PostHogClient({
      apiKey: this.settings.apiKey,
      host: this.settings.host,
      flushAt: this.settings.flushAt,
      flushInterval: this.settings.flushInterval,
    });
  }
  
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple identify call
      await this.client.identify({
        distinctId: 'test-connection',
        properties: { test: true }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async track(event: TrackEvent, context: EventContext): Promise<void> {
    await this.client.capture({
      distinctId: context.userId || context.anonymousId || 'anonymous',
      event: event.event,
      properties: {
        ...event.properties,
        $lib: 'c15t',
        $lib_version: this.version,
        session_id: context.sessionId,
        timestamp: event.timestamp,
      },
      timestamp: event.timestamp,
    });
  }
  
  async page(event: PageEvent, context: EventContext): Promise<void> {
    await this.client.capture({
      distinctId: context.userId || context.anonymousId || 'anonymous',
      event: '$pageview',
      properties: {
        $current_url: event.name,
        ...event.properties,
        $lib: 'c15t',
        $lib_version: this.version,
        session_id: context.sessionId,
        timestamp: event.timestamp,
      },
      timestamp: event.timestamp,
    });
  }
  
  async identify(event: IdentifyEvent, context: EventContext): Promise<void> {
    await this.client.identify({
      distinctId: event.userId,
      properties: event.traits,
    });
  }
  
  async group(event: GroupEvent, context: EventContext): Promise<void> {
    await this.client.groupIdentify({
      groupType: 'organization',
      groupKey: event.groupId,
      properties: event.traits,
    });
  }
  
  async alias(event: AliasEvent, context: EventContext): Promise<void> {
    await this.client.alias({
      distinctId: event.userId,
      alias: event.previousId,
    });
  }
  
  async consent(event: ConsentEvent, context: EventContext): Promise<void> {
    await this.client.capture({
      distinctId: context.userId || context.anonymousId || 'anonymous',
      event: 'Consent Updated',
      properties: {
        action: event.action,
        preferences: event.preferences,
        source: event.source,
        $lib: 'c15t',
        $lib_version: this.version,
        timestamp: event.timestamp,
      },
      timestamp: event.timestamp,
    });
  }
  
  async onError(error: Error, event: AnalyticsEvent): Promise<void> {
    // Log error but don't throw - let the system continue
    console.error(`PostHog destination error for ${event.type}:`, error);
  }
  
  async destroy(): Promise<void> {
    await this.client.shutdown();
  }
}

// Factory function
export function posthog(settings: PostHogSettings): DestinationConfig<PostHogSettings> {
  return {
    type: 'posthog',
    enabled: true,
    settings,
    requiredConsent: ['measurement'],
  };
}
```

### Console Destination
```typescript
import { z } from 'zod';
import { DestinationPlugin, AnalyticsEvent, EventContext } from '@c15t/backend/v2';

const ConsoleSettingsSchema = z.object({
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional().default('info'),
  includeContext: z.boolean().optional().default(true),
  includeTimestamp: z.boolean().optional().default(true),
});

type ConsoleSettings = z.infer<typeof ConsoleSettingsSchema>;

export class ConsoleDestination implements DestinationPlugin<ConsoleSettings> {
  readonly type = 'console';
  readonly version = '1.0.0';
  readonly gdprCompliant = true;
  readonly settingsSchema = ConsoleSettingsSchema;
  readonly requiredConsent = ['necessary'] as const;
  
  private settings: ConsoleSettings;
  
  constructor(settings: ConsoleSettings) {
    this.settings = settings;
  }
  
  async initialize(settings: ConsoleSettings): Promise<void> {
    this.settings = this.settingsSchema.parse(settings);
  }
  
  async testConnection(): Promise<boolean> {
    // Console always works
    return true;
  }
  
  async track(event: TrackEvent, context: EventContext): Promise<void> {
    this.log('track', event, context);
  }
  
  async page(event: PageEvent, context: EventContext): Promise<void> {
    this.log('page', event, context);
  }
  
  async identify(event: IdentifyEvent, context: EventContext): Promise<void> {
    this.log('identify', event, context);
  }
  
  async group(event: GroupEvent, context: EventContext): Promise<void> {
    this.log('group', event, context);
  }
  
  async alias(event: AliasEvent, context: EventContext): Promise<void> {
    this.log('alias', event, context);
  }
  
  async consent(event: ConsentEvent, context: EventContext): Promise<void> {
    this.log('consent', event, context);
  }
  
  private log(eventType: string, event: AnalyticsEvent, context: EventContext): void {
    const logData: any = {
      type: eventType,
      event: event,
    };
    
    if (this.settings.includeContext) {
      logData.context = context;
    }
    
    if (this.settings.includeTimestamp) {
      logData.timestamp = new Date().toISOString();
    }
    
    // Use appropriate console method based on log level
    switch (this.settings.logLevel) {
      case 'debug':
        console.debug(`[c15t:console] ${eventType}:`, logData);
        break;
      case 'info':
        console.info(`[c15t:console] ${eventType}:`, logData);
        break;
      case 'warn':
        console.warn(`[c15t:console] ${eventType}:`, logData);
        break;
      case 'error':
        console.error(`[c15t:console] ${eventType}:`, logData);
        break;
    }
  }
  
  async onError(error: Error, event: AnalyticsEvent): Promise<void> {
    console.error(`[c15t:console] Error processing ${event.type}:`, error);
  }
}

// Factory function
export function console(settings: ConsoleSettings = {}): DestinationConfig<ConsoleSettings> {
  return {
    type: 'console',
    enabled: true,
    settings,
    requiredConsent: ['necessary'],
  };
}
```

### PostHog Client Implementation
```typescript
// packages/destinations/src/posthog-client.ts
export class PostHogClient {
  private apiKey: string;
  private host: string;
  private flushAt: number;
  private flushInterval: number;
  private queue: any[] = [];
  private timer?: NodeJS.Timeout;
  
  constructor(options: {
    apiKey: string;
    host: string;
    flushAt: number;
    flushInterval: number;
  }) {
    this.apiKey = options.apiKey;
    this.host = options.host;
    this.flushAt = options.flushAt;
    this.flushInterval = options.flushInterval;
    
    // Start flush timer
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }
  
  async capture(data: any): Promise<void> {
    this.queue.push({
      ...data,
      api_key: this.apiKey,
    });
    
    if (this.queue.length >= this.flushAt) {
      await this.flush();
    }
  }
  
  async identify(data: any): Promise<void> {
    await this.capture({
      ...data,
      event: '$identify',
    });
  }
  
  async groupIdentify(data: any): Promise<void> {
    await this.capture({
      ...data,
      event: '$groupidentify',
    });
  }
  
  async alias(data: any): Promise<void> {
    await this.capture({
      ...data,
      event: '$create_alias',
    });
  }
  
  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.flushAt);
    
    try {
      const response = await fetch(`${this.host}/capture/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batch,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`PostHog API error: ${response.status}`);
      }
    } catch (error) {
      // Re-queue failed events
      this.queue.unshift(...batch);
      throw error;
    }
  }
  
  async shutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
    await this.flush();
  }
}
```

## 🧪 Testing Requirements
- Unit tests for PostHog destination
- Unit tests for Console destination
- Integration tests with PostHog API
- Error handling tests
- Settings validation tests
- Connection testing tests

## 🔍 Definition of Done
- [ ] PostHog destination sends events to PostHog API
- [ ] Console destination logs events to console
- [ ] Settings validated with Zod schemas
- [ ] Connection testing implemented
- [ ] Error handling for API failures
- [ ] Unit tests for both destinations
- [ ] Integration tests with real APIs
- [ ] Code review completed

## 📚 Related Documentation
- [Analytics Package Architecture](../docs/analytics-package-architecture.md)
- [Analytics Destination Packages Strategy](../docs/analytics-destination-packages-strategy.md)

## 🔗 Dependencies
- [1.1: Core Analytics Types](./01-core-analytics-types.md) ✅
- [1.2: Destination Registry & Manager](./02-destination-registry-manager.md) ✅
- [1.3: Event Processor](./03-event-processor.md) ✅

## 🚀 Next Ticket
[1.5: Create Analytics Handler & API](./05-analytics-handler-api.md)
