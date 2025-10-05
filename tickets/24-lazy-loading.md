# Ticket 3.3: Lazy Loading

## 📋 Ticket Details
**Phase**: 3 - Advanced Features  
**Story Points**: 3  
**Priority**: Medium  
**Assignee**: TBD  
**Status**: Ready

## 🔗 Dependencies
**Depends on**: Phase 2 Complete  
**Blocking**: None  

## 🎯 Description
Implement lazy loading for analytics destinations to improve performance by loading destinations only when they are first needed. This replaces the eager loading approach from Phase 1 with a more efficient on-demand loading system.

## 🧠 Context & Background
Lazy loading is a key performance optimization for the analytics system:
- **On-demand loading** - Destinations are loaded only when first event is sent to them
- **Performance improvement** - Reduces initial bundle size and startup time
- **Memory efficiency** - Only loads destinations that are actually used
- **Consent-aware loading** - Only loads destinations user has consented to
- **Error isolation** - Failed destination loading doesn't affect other destinations

The lazy loading system must:
- Load destinations asynchronously when first needed
- Cache loaded destinations to avoid reloading
- Handle loading errors gracefully
- Support both server-side and client-side destinations
- Maintain destination state and configuration
- Provide loading status and error information

## ✅ Acceptance Criteria
- [ ] Create `LazyDestinationLoader` class
- [ ] Implement on-demand destination loading
- [ ] Add destination caching mechanism
- [ ] Add loading status tracking
- [ ] Add error handling for failed loads
- [ ] Update `DestinationManager` to use lazy loading
- [ ] Unit tests for lazy loading
- [ ] Integration tests with destination system

## 📁 Files to Update
- `packages/backend/src/v2/plugins/destination-registry.ts` (add lazy loading)

## 🔧 Implementation Details

### Lazy Destination Loader Implementation
```typescript
import { DestinationPlugin, DestinationConfig, DestinationInstance } from './types';
import { DestinationRegistry } from './destination-registry';
import { Logger } from './logger';

interface LoadingStatus {
  loading: boolean;
  loaded: boolean;
  error?: string;
  lastAttempt?: number;
  retryCount: number;
}

interface LazyDestinationInfo {
  config: DestinationConfig;
  status: LoadingStatus;
  instance?: DestinationInstance;
  loadPromise?: Promise<DestinationInstance>;
}

export class LazyDestinationLoader {
  private destinations = new Map<string, LazyDestinationInfo>();
  private loadingPromises = new Map<string, Promise<DestinationInstance>>();
  private cache: DestinationCache;
  private maxRetries = 3;
  private retryDelayMs = 1000;

  constructor(
    private registry: DestinationRegistry,
    private logger: Logger,
    cacheConfig?: Partial<CacheConfig>
  ) {
    this.cache = new DestinationCache(cacheConfig);
  }

  /**
   * Register a destination configuration for lazy loading
   */
  registerDestination(config: DestinationConfig): void {
    this.destinations.set(config.type, {
      config,
      status: {
        loading: false,
        loaded: false,
        retryCount: 0,
      },
    });

    this.logger.debug('Destination registered for lazy loading', {
      type: config.type,
      enabled: config.enabled,
    });
  }

  /**
   * Load a destination on-demand
   */
  async loadDestination(type: string): Promise<DestinationInstance> {
    const destInfo = this.destinations.get(type);
    if (!destInfo) {
      throw new Error(`Destination ${type} not registered for lazy loading`);
    }

    // Return cached instance if already loaded
    if (destInfo.instance && destInfo.status.loaded) {
      return destInfo.instance;
    }

    // Return existing loading promise if already loading
    if (destInfo.loadPromise) {
      return destInfo.loadPromise;
    }

    // Check cache first
    const cachedInstance = await this.cache.get(type);
    if (cachedInstance) {
      destInfo.instance = cachedInstance;
      destInfo.status.loaded = true;
      destInfo.status.loading = false;
      
      this.logger.debug('Destination loaded from cache', { type });
      return cachedInstance;
    }

    // Start loading
    destInfo.status.loading = true;
    destInfo.status.lastAttempt = Date.now();

    const loadPromise = this.performLoad(destInfo);
    destInfo.loadPromise = loadPromise;

    try {
      const instance = await loadPromise;
      
      // Cache the loaded instance
      await this.cache.set(type, instance);
      
      destInfo.instance = instance;
      destInfo.status.loaded = true;
      destInfo.status.loading = false;
      destInfo.status.error = undefined;
      destInfo.status.retryCount = 0;

      this.logger.info('Destination loaded successfully', {
        type,
        version: instance.plugin.version,
      });

      return instance;

    } catch (error) {
      destInfo.status.loading = false;
      destInfo.status.error = error.message;
      destInfo.status.retryCount++;

      this.logger.error('Failed to load destination', {
        type,
        error: error.message,
        retryCount: destInfo.status.retryCount,
      });

      // Clear the loading promise so it can be retried
      destInfo.loadPromise = undefined;

      throw error;
    }
  }

  /**
   * Perform the actual destination loading
   */
  private async performLoad(destInfo: LazyDestinationInfo): Promise<DestinationInstance> {
    const { config } = destInfo;

    // Get the destination factory from registry
    const factory = this.registry.getFactory(config.type);
    if (!factory) {
      throw new Error(`Destination factory not found: ${config.type}`);
    }

    // Create the destination instance
    const instance = await factory.createInstance(config);

    // Initialize the destination
    await instance.initialize();

    // Test the destination if configured
    if (config.testOnLoad) {
      const isHealthy = await instance.test();
      if (!isHealthy) {
        throw new Error(`Destination test failed: ${config.type}`);
      }
    }

    return instance;
  }

  /**
   * Preload destinations based on consent
   */
  async preloadDestinations(consent: AnalyticsConsent): Promise<void> {
    const destinationsToPreload = Array.from(this.destinations.values())
      .filter(dest => {
        // Only preload if destination is enabled
        if (!dest.config.enabled) return false;
        
        // Only preload if user has consented to required purposes
        const hasConsent = dest.config.requiredConsent.every(
          purpose => consent[purpose as keyof AnalyticsConsent]
        );
        
        return hasConsent;
      })
      .map(dest => dest.config.type);

    this.logger.info('Preloading destinations', {
      destinations: destinationsToPreload,
      consent,
    });

    // Load destinations in parallel
    const loadPromises = destinationsToPreload.map(type => 
      this.loadDestination(type).catch(error => {
        this.logger.warn('Failed to preload destination', { type, error });
        return null;
      })
    );

    await Promise.allSettled(loadPromises);
  }

  /**
   * Unload a destination to free memory
   */
  async unloadDestination(type: string): Promise<void> {
    const destInfo = this.destinations.get(type);
    if (!destInfo || !destInfo.instance) {
      return;
    }

    try {
      // Destroy the instance
      await destInfo.instance.destroy();
      
      // Clear from cache
      await this.cache.remove(type);
      
      // Reset status
      destInfo.instance = undefined;
      destInfo.status.loaded = false;
      destInfo.status.loading = false;
      destInfo.loadPromise = undefined;

      this.logger.info('Destination unloaded', { type });

    } catch (error) {
      this.logger.error('Failed to unload destination', { type, error });
    }
  }

  /**
   * Get loading status for a destination
   */
  getLoadingStatus(type: string): LoadingStatus | null {
    const destInfo = this.destinations.get(type);
    return destInfo ? destInfo.status : null;
  }

  /**
   * Get all loading statuses
   */
  getAllLoadingStatuses(): Map<string, LoadingStatus> {
    const statuses = new Map<string, LoadingStatus>();
    
    for (const [type, destInfo] of this.destinations) {
      statuses.set(type, destInfo.status);
    }
    
    return statuses;
  }

  /**
   * Check if destination is loaded
   */
  isLoaded(type: string): boolean {
    const destInfo = this.destinations.get(type);
    return destInfo ? destInfo.status.loaded : false;
  }

  /**
   * Get loaded destination instance
   */
  getLoadedInstance(type: string): DestinationInstance | null {
    const destInfo = this.destinations.get(type);
    return destInfo?.instance || null;
  }

  /**
   * Retry loading a failed destination
   */
  async retryDestination(type: string): Promise<DestinationInstance> {
    const destInfo = this.destinations.get(type);
    if (!destInfo) {
      throw new Error(`Destination ${type} not registered`);
    }

    if (destInfo.status.retryCount >= this.maxRetries) {
      throw new Error(`Destination ${type} exceeded max retries`);
    }

    // Wait before retry
    await this.delay(this.retryDelayMs * Math.pow(2, destInfo.status.retryCount));

    this.logger.info('Retrying destination load', {
      type,
      attempt: destInfo.status.retryCount + 1,
    });

    return this.loadDestination(type);
  }

  /**
   * Load destinations in batches to avoid overwhelming the system
   */
  async loadDestinationsBatch(
    types: string[],
    batchSize: number = 3
  ): Promise<Map<string, DestinationInstance | Error>> {
    const results = new Map<string, DestinationInstance | Error>();
    
    for (let i = 0; i < types.length; i += batchSize) {
      const batch = types.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (type) => {
        try {
          const instance = await this.loadDestination(type);
          return { type, result: instance };
        } catch (error) {
          return { type, result: error };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.set(result.value.type, result.value.result);
        }
      });
    }

    return results;
  }

  /**
   * Clear all loaded destinations
   */
  async clearAll(): Promise<void> {
    const unloadPromises = Array.from(this.destinations.keys()).map(type =>
      this.unloadDestination(type)
    );

    await Promise.allSettled(unloadPromises);
    
    this.logger.info('All destinations cleared');
  }

  /**
   * Get statistics about lazy loading
   */
  getStats(): {
    totalRegistered: number;
    loaded: number;
    loading: number;
    failed: number;
    cached: number;
  } {
    let loaded = 0;
    let loading = 0;
    let failed = 0;

    for (const destInfo of this.destinations.values()) {
      if (destInfo.status.loaded) {
        loaded++;
      } else if (destInfo.status.loading) {
        loading++;
      } else if (destInfo.status.error) {
        failed++;
      }
    }

    return {
      totalRegistered: this.destinations.size,
      loaded,
      loading,
      failed,
      cached: this.cache.size(),
    };
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Destination Cache Implementation
```typescript
interface CacheConfig {
  maxSize: number;
  ttlMs: number;
  storageKey: string;
}

export class DestinationCache {
  private cache = new Map<string, { instance: DestinationInstance; expires: number }>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50,
      ttlMs: 5 * 60 * 1000, // 5 minutes
      storageKey: 'c15t-destination-cache',
      ...config,
    };

    this.startCleanupTimer();
  }

  async get(type: string): Promise<DestinationInstance | null> {
    const cached = this.cache.get(type);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expires) {
      this.cache.delete(type);
      return null;
    }

    return cached.instance;
  }

  async set(type: string, instance: DestinationInstance): Promise<void> {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(type, {
      instance,
      expires: Date.now() + this.config.ttlMs,
    });
  }

  async remove(type: string): Promise<void> {
    this.cache.delete(type);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.cache) {
        if (now > cached.expires) {
          this.cache.delete(key);
        }
      }
    }, this.config.ttlMs);
  }
}
```

### Updated Destination Manager Integration
```typescript
// Updated DestinationManager to use lazy loading
export class DestinationManager {
  private lazyLoader: LazyDestinationLoader;
  private loadedDestinations = new Map<string, DestinationInstance>();

  constructor(
    private registry: DestinationRegistry,
    private logger: Logger
  ) {
    this.lazyLoader = new LazyDestinationLoader(registry, logger);
  }

  /**
   * Register destinations for lazy loading instead of eager loading
   */
  registerDestinations(configs: DestinationConfig[]): void {
    configs.forEach(config => {
      this.lazyLoader.registerDestination(config);
    });

    this.logger.info('Destinations registered for lazy loading', {
      count: configs.length,
    });
  }

  /**
   * Process events with lazy loading
   */
  async processEvents(events: AnalyticsEvent[], consent: AnalyticsConsent): Promise<void> {
    // Get unique destination types needed for these events
    const destinationTypes = this.getRequiredDestinationTypes(events, consent);
    
    // Load destinations on-demand
    const loadResults = await this.lazyLoader.loadDestinationsBatch(destinationTypes);
    
    // Process events with loaded destinations
    for (const event of events) {
      await this.processEventWithLazyDestinations(event, consent, loadResults);
    }
  }

  private async processEventWithLazyDestinations(
    event: AnalyticsEvent,
    consent: AnalyticsConsent,
    loadedDestinations: Map<string, DestinationInstance | Error>
  ): Promise<void> {
    const requiredDestinations = this.getDestinationsForEvent(event, consent);
    
    for (const destType of requiredDestinations) {
      const destination = loadedDestinations.get(destType);
      
      if (destination instanceof Error) {
        this.logger.error('Skipping event due to destination load failure', {
          eventType: event.type,
          destination: destType,
          error: destination.message,
        });
        continue;
      }

      try {
        await destination.processEvent(event, consent);
      } catch (error) {
        this.logger.error('Failed to process event with destination', {
          eventType: event.type,
          destination: destType,
          error: error.message,
        });
      }
    }
  }

  private getRequiredDestinationTypes(events: AnalyticsEvent[], consent: AnalyticsConsent): string[] {
    const types = new Set<string>();
    
    events.forEach(event => {
      const eventDestinations = this.getDestinationsForEvent(event, consent);
      eventDestinations.forEach(type => types.add(type));
    });
    
    return Array.from(types);
  }

  private getDestinationsForEvent(event: AnalyticsEvent, consent: AnalyticsConsent): string[] {
    // Implementation would determine which destinations are needed for this event
    // based on event type and consent
    return [];
  }
}
```

## 🧪 Testing Requirements
- Unit tests for lazy loading functionality
- Unit tests for destination caching
- Unit tests for batch loading
- Unit tests for error handling and retries
- Unit tests for preloading based on consent
- Integration tests with destination system
- Performance tests for lazy loading overhead

## 🔍 Definition of Done
- [ ] LazyDestinationLoader class implemented
- [ ] On-demand destination loading working
- [ ] Destination caching mechanism implemented
- [ ] Loading status tracking implemented
- [ ] Error handling for failed loads implemented
- [ ] DestinationManager updated to use lazy loading
- [ ] Unit tests for lazy loading
- [ ] Integration tests with destination system
- [ ] Code review completed

## 📚 Related Documentation
- [Analytics Architecture Diagram](../docs/analytics-architecture-diagram.md)
- [Analytics Package Architecture](../docs/analytics-package-architecture.md)

## 🔗 Dependencies
- [5.2: Debug API](./23-debug-api.md) ✅

## 🚀 Next Ticket
[5.4: Implement Error Handling & Retry Logic](./25-error-handling-retry.md)
