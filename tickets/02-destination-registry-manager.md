# Ticket 1.2: Destination Registry & Manager

## 📋 Ticket Details
**Phase**: 1 - Core Analytics Infrastructure  
**Story Points**: 5  
**Priority**: Critical  
**Assignee**: TBD  
**Status**: Ready

## 🔗 Dependencies
**Depends on**: Ticket 1.1 (Core Analytics Types)  
**Blocking**: Ticket 1.3 (Event Processor), Ticket 1.4 (Core Server Destinations)  

## 🎯 Description
Build the core destination management system that handles registration, loading, and processing of analytics destinations. This is the heart of the analytics system that orchestrates all destination plugins.

## 🧠 Context & Background
The Destination Registry and Manager are the core orchestration components that:
- Register destination factories globally
- Load destinations from configuration
- Process events through multiple destinations
- Handle errors per destination (isolated failures)
- Manage destination lifecycle

This system must be:
- Thread-safe for concurrent access
- Error-resilient (one destination failure shouldn't break others)
- Extensible (easy to add new destinations)
- Performant (minimal overhead per event)
- Observable (comprehensive logging)

## ✅ Acceptance Criteria
- [ ] Create `DestinationRegistry` class with register/get methods
- [ ] Create `DestinationManager` class with loadDestinations/processEvents
- [ ] Implement eager loading (lazy loading in Phase 2)
- [ ] Add error handling per destination
- [ ] Add comprehensive logging
- [ ] Unit tests with 90%+ coverage
- [ ] Integration tests with mock destinations

## 📁 Files to Update
- `packages/backend/src/v2/plugins/destination-registry.ts` (extend existing registry)
- `packages/backend/src/v2/handlers/analytics/` (add manager)

## 🔧 Implementation Details

### Extend Existing Destination Registry
The backend already has a destination registry plugin. This ticket focuses on:

1. **Extending the existing registry** with additional methods
2. **Adding destination manager** for processing events
3. **Implementing error isolation** per destination
4. **Adding comprehensive logging**

### Key Changes Needed
```typescript
// Extend packages/backend/src/v2/plugins/destination-registry.ts
export class DestinationRegistry {
  // Add to existing registry:
  async loadDestinations(configs: DestinationConfig[]): Promise<void> {
    // Implementation for loading destinations from config
  }
  
  async processEvents(events: AnalyticsEvent[], context: EventContext): Promise<void> {
    // Implementation for processing events through destinations
  }
  
  getLoadedDestinations(): DestinationInstance[] {
    // Return loaded destination instances
  }
}

// Add to packages/backend/src/v2/handlers/analytics/destination-manager.ts
export class DestinationManager {
  private destinations = new Map<string, DestinationInstance>();
  
  async loadDestinations(configs: DestinationConfig[]): Promise<void> {
    // Load destinations from configuration
  }
  
  async processEvents(events: AnalyticsEvent[], context: EventContext): Promise<void> {
    // Process events through all loaded destinations
  }
}
```

### Destination Manager
```typescript
export interface DestinationInstance {
  plugin: DestinationPlugin;
  config: DestinationConfig;
  loaded: boolean;
  lastError?: Error;
}

export class DestinationManager {
  private destinations = new Map<string, DestinationInstance>();
  private logger: Logger;
  
  constructor(
    private registry: DestinationRegistry,
    logger: Logger
  ) {
    this.logger = logger.child({ component: 'DestinationManager' });
  }
  
  /**
   * Load destinations from configuration
   */
  async loadDestinations(configs: DestinationConfig[]): Promise<void> {
    this.logger.info('Loading destinations', { count: configs.length });
    
    for (const config of configs) {
      try {
        await this.loadDestination(config);
        this.logger.info('Destination loaded', { type: config.type });
      } catch (error) {
        this.logger.error('Failed to load destination', { 
          type: config.type, 
          error: error.message 
        });
        // Continue loading other destinations
      }
    }
  }
  
  /**
   * Load a single destination
   */
  async loadDestination(config: DestinationConfig): Promise<void> {
    const factory = this.registry.get(config.type);
    if (!factory) {
      throw new Error(`Unknown destination type: ${config.type}`);
    }
    
    // Create destination instance
    const plugin = await factory(config.settings);
    
    // Initialize the destination
    await plugin.initialize(config.settings);
    
    // Store the instance
    this.destinations.set(config.type, {
      plugin,
      config,
      loaded: true
    });
    
    this.logger.info('Destination loaded successfully', { 
      type: config.type,
      version: plugin.version
    });
  }
  
  /**
   * Process events through all loaded destinations
   */
  async processEvents(
    events: AnalyticsEvent[], 
    context: EventContext
  ): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const [type, instance] of this.destinations) {
      if (!instance.loaded) continue;
      
      // Filter events by consent
      const filteredEvents = this.filterEventsByConsent(
        events, 
        instance.config.requiredConsent, 
        context.consent
      );
      
      if (filteredEvents.length === 0) continue;
      
      // Process events for this destination
      promises.push(
        this.processEventsForDestination(instance, filteredEvents, context)
      );
    }
    
    // Wait for all destinations to complete
    await Promise.allSettled(promises);
  }
  
  /**
   * Process events for a specific destination
   */
  private async processEventsForDestination(
    instance: DestinationInstance,
    events: AnalyticsEvent[],
    context: EventContext
  ): Promise<void> {
    try {
      for (const event of events) {
        await this.processEventForDestination(instance, event, context);
      }
    } catch (error) {
      this.logger.error('Destination processing failed', {
        type: instance.config.type,
        error: error.message
      });
      instance.lastError = error;
    }
  }
  
  /**
   * Process a single event for a destination
   */
  private async processEventForDestination(
    instance: DestinationInstance,
    event: AnalyticsEvent,
    context: EventContext
  ): Promise<void> {
    const { plugin } = instance;
    
    try {
      // Call before hook
      const processedEvent = await plugin.onBeforeEvent?.(event) ?? event;
      
      // Route to appropriate handler
      switch (event.type) {
        case 'track':
          await plugin.track?.(processedEvent as TrackEvent, context);
          break;
        case 'page':
          await plugin.page?.(processedEvent as PageEvent, context);
          break;
        case 'identify':
          await plugin.identify?.(processedEvent as IdentifyEvent, context);
          break;
        case 'group':
          await plugin.group?.(processedEvent as GroupEvent, context);
          break;
        case 'alias':
          await plugin.alias?.(processedEvent as AliasEvent, context);
          break;
        case 'consent':
          await plugin.consent?.(processedEvent as ConsentEvent, context);
          break;
      }
      
      // Call after hook
      await plugin.onAfterEvent?.(processedEvent, { success: true });
      
    } catch (error) {
      this.logger.error('Event processing failed', {
        type: instance.config.type,
        eventType: event.type,
        error: error.message
      });
      
      // Call error hook
      await plugin.onError?.(error, event);
      
      throw error;
    }
  }
  
  /**
   * Filter events by consent requirements
   */
  private filterEventsByConsent(
    events: AnalyticsEvent[],
    requiredConsent: ReadonlyArray<ConsentPurpose>,
    userConsent: AnalyticsConsent
  ): AnalyticsEvent[] {
    return events.filter(event => {
      // Consent events always go through
      if (event.type === 'consent') return true;
      
      // Check if user has required consent
      return requiredConsent.every(purpose => userConsent[purpose]);
    });
  }
  
  /**
   * Get destination status
   */
  getDestinationStatus(type: string): DestinationInstance | undefined {
    return this.destinations.get(type);
  }
  
  /**
   * Get all loaded destinations
   */
  getLoadedDestinations(): DestinationInstance[] {
    return Array.from(this.destinations.values()).filter(d => d.loaded);
  }
  
  /**
   * Test connection for a destination
   */
  async testDestination(type: string): Promise<boolean> {
    const instance = this.destinations.get(type);
    if (!instance) return false;
    
    try {
      return await instance.plugin.testConnection();
    } catch (error) {
      this.logger.error('Destination test failed', { type, error: error.message });
      return false;
    }
  }
}
```

## 🧪 Testing Requirements
- Unit tests for registry operations
- Unit tests for manager operations
- Integration tests with mock destinations
- Error handling tests
- Performance tests
- Concurrent access tests

## 🔍 Definition of Done
- [ ] Registry can register and retrieve destination factories
- [ ] Manager can load destinations from config
- [ ] Manager can process events through destinations
- [ ] Error handling isolates failures per destination
- [ ] Comprehensive logging for debugging
- [ ] Unit tests with 90%+ coverage
- [ ] Integration tests passing
- [ ] Code review completed

## 📚 Related Documentation
- [Analytics Architecture Diagram](../docs/analytics-architecture-diagram.md)
- [Analytics Package Architecture](../docs/analytics-package-architecture.md)

## 🔗 Dependencies
- [1.1: Core Analytics Types](./01-core-analytics-types.md) ✅

## 🚀 Next Ticket
[1.3: Create Event Processor](./03-event-processor.md)
