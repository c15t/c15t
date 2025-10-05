# Ticket 3.6: Consent State Synchronization

## 📋 Ticket Details
**Phase**: 3 - Advanced Features  
**Story Points**: 2  
**Priority**: High  
**Assignee**: TBD  
**Status**: Ready

## 🔗 Dependencies
**Depends on**: Phase 2 Complete  
**Blocking**: None  

## 🎯 Description
Implement real-time consent state synchronization across all components and browser tabs. This ensures consistent consent state management throughout the application and provides seamless user experience across different parts of the system.

## 🧠 Context & Background
Consent state synchronization is crucial for GDPR compliance and user experience:
- **Cross-tab synchronization** - Consent changes in one tab affect all tabs
- **Component synchronization** - All React components share the same consent state
- **Real-time updates** - Consent changes are immediately reflected everywhere
- **Persistence** - Consent state persists across browser sessions
- **Conflict resolution** - Handles conflicting consent states gracefully
- **Audit trail** - Tracks consent changes for compliance

The synchronization system must:
- Use localStorage/sessionStorage for persistence
- Use custom events for real-time updates
- Handle browser tab focus/blur events
- Provide conflict resolution strategies
- Maintain consent change history
- Work with existing consent management

## ✅ Acceptance Criteria
- [ ] Create `ConsentStateManager` class
- [ ] Implement cross-tab synchronization
- [ ] Add real-time consent updates
- [ ] Add consent persistence
- [ ] Add conflict resolution
- [ ] Add consent change history
- [ ] Unit tests for state synchronization
- [ ] Integration tests with consent system

## 📁 Files to Update
- `packages/core/src/libs/consent-utils.ts` (extend existing consent utils)

## 🔧 Implementation Details

### Consent State Manager Implementation
```typescript
import { AnalyticsConsent } from '@c15t/core';
import { EventEmitter } from 'events';

export interface ConsentChangeEvent {
  timestamp: number;
  oldConsent: AnalyticsConsent;
  newConsent: AnalyticsConsent;
  source: string;
  tabId: string;
  reason?: string;
}

export interface ConsentState {
  consent: AnalyticsConsent;
  lastUpdated: number;
  tabId: string;
  source: string;
  version: number;
}

export interface ConsentSyncOptions {
  storageKey: string;
  enablePersistence: boolean;
  enableCrossTabSync: boolean;
  conflictResolution: 'latest' | 'user-choice' | 'merge';
  syncInterval: number;
  maxHistorySize: number;
}

export class ConsentStateManager extends EventEmitter {
  private currentState: ConsentState;
  private changeHistory: ConsentChangeEvent[] = [];
  private syncInterval?: NodeJS.Timeout;
  private tabId: string;
  private options: ConsentSyncOptions;

  constructor(options: Partial<ConsentSyncOptions> = {}) {
    super();

    this.options = {
      storageKey: 'c15t-consent-state',
      enablePersistence: true,
      enableCrossTabSync: true,
      conflictResolution: 'latest',
      syncInterval: 1000,
      maxHistorySize: 100,
      ...options,
    };

    this.tabId = this.generateTabId();
    this.currentState = this.initializeState();

    this.setupEventListeners();
    this.startSyncInterval();
  }

  /**
   * Initialize consent state
   */
  private initializeState(): ConsentState {
    // Try to load from storage first
    if (this.options.enablePersistence) {
      const stored = this.loadFromStorage();
      if (stored) {
        return stored;
      }
    }

    // Return default state
    return {
      consent: this.getDefaultConsent(),
      lastUpdated: Date.now(),
      tabId: this.tabId,
      source: 'initialization',
      version: 1,
    };
  }

  /**
   * Get current consent state
   */
  getConsent(): AnalyticsConsent {
    return { ...this.currentState.consent };
  }

  /**
   * Update consent state
   */
  async updateConsent(
    newConsent: AnalyticsConsent,
    source: string = 'user-action',
    reason?: string
  ): Promise<void> {
    const oldConsent = { ...this.currentState.consent };
    
    // Check if consent actually changed
    if (this.isConsentEqual(oldConsent, newConsent)) {
      return;
    }

    // Create change event
    const changeEvent: ConsentChangeEvent = {
      timestamp: Date.now(),
      oldConsent,
      newConsent,
      source,
      tabId: this.tabId,
      reason,
    };

    // Update state
    this.currentState = {
      consent: { ...newConsent },
      lastUpdated: Date.now(),
      tabId: this.tabId,
      source,
      version: this.currentState.version + 1,
    };

    // Add to history
    this.addToHistory(changeEvent);

    // Persist to storage
    if (this.options.enablePersistence) {
      await this.persistToStorage();
    }

    // Emit change event
    this.emit('consent-change', changeEvent);

    // Sync to other tabs
    if (this.options.enableCrossTabSync) {
      this.syncToOtherTabs(changeEvent);
    }

    console.log('Consent updated', {
      oldConsent,
      newConsent,
      source,
      tabId: this.tabId,
    });
  }

  /**
   * Handle consent change from another tab
   */
  private handleExternalConsentChange(event: ConsentChangeEvent): void {
    // Don't process our own changes
    if (event.tabId === this.tabId) {
      return;
    }

    console.log('Received consent change from another tab', event);

    // Resolve conflicts if needed
    const resolvedConsent = this.resolveConflict(event.newConsent, event.source);

    // Update our state
    this.currentState = {
      consent: resolvedConsent,
      lastUpdated: Date.now(),
      tabId: this.tabId,
      source: 'external-sync',
      version: this.currentState.version + 1,
    };

    // Add to history
    this.addToHistory({
      ...event,
      source: 'external-sync',
    });

    // Persist to storage
    if (this.options.enablePersistence) {
      this.persistToStorage();
    }

    // Emit change event
    this.emit('consent-change', {
      ...event,
      newConsent: resolvedConsent,
    });
  }

  /**
   * Resolve consent conflicts
   */
  private resolveConflict(
    externalConsent: AnalyticsConsent,
    source: string
  ): AnalyticsConsent {
    const currentConsent = this.currentState.consent;

    switch (this.options.conflictResolution) {
      case 'latest':
        // Use the most recent consent
        return externalConsent;

      case 'user-choice':
        // Let user choose (implementation would show UI)
        return this.promptUserForChoice(currentConsent, externalConsent, source);

      case 'merge':
        // Merge consents (more permissive)
        return this.mergeConsents(currentConsent, externalConsent);

      default:
        return externalConsent;
    }
  }

  /**
   * Merge two consent states (more permissive)
   */
  private mergeConsents(
    consent1: AnalyticsConsent,
    consent2: AnalyticsConsent
  ): AnalyticsConsent {
    return {
      necessary: consent1.necessary || consent2.necessary,
      measurement: consent1.measurement || consent2.measurement,
      marketing: consent1.marketing || consent2.marketing,
      functionality: consent1.functionality || consent2.functionality,
      experience: consent1.experience || consent2.experience,
    };
  }

  /**
   * Prompt user for conflict resolution
   */
  private promptUserForChoice(
    currentConsent: AnalyticsConsent,
    externalConsent: AnalyticsConsent,
    source: string
  ): AnalyticsConsent {
    // Implementation would show a UI prompt
    // For now, return the external consent
    console.log('Consent conflict detected, using external consent', {
      currentConsent,
      externalConsent,
      source,
    });
    return externalConsent;
  }

  /**
   * Add change to history
   */
  private addToHistory(change: ConsentChangeEvent): void {
    this.changeHistory.push(change);

    // Keep history size manageable
    if (this.changeHistory.length > this.options.maxHistorySize) {
      this.changeHistory.shift();
    }
  }

  /**
   * Get consent change history
   */
  getChangeHistory(): ConsentChangeEvent[] {
    return [...this.changeHistory];
  }

  /**
   * Get consent statistics
   */
  getConsentStats(): {
    totalChanges: number;
    lastChange: number;
    sources: Record<string, number>;
    tabChanges: Record<string, number>;
  } {
    const sources: Record<string, number> = {};
    const tabChanges: Record<string, number> = {};

    this.changeHistory.forEach(change => {
      sources[change.source] = (sources[change.source] || 0) + 1;
      tabChanges[change.tabId] = (tabChanges[change.tabId] || 0) + 1;
    });

    return {
      totalChanges: this.changeHistory.length,
      lastChange: this.changeHistory[this.changeHistory.length - 1]?.timestamp || 0,
      sources,
      tabChanges,
    };
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.options.enableCrossTabSync) return;

    // Listen for storage changes (other tabs)
    window.addEventListener('storage', (event) => {
      if (event.key === this.options.storageKey && event.newValue) {
        try {
          const state: ConsentState = JSON.parse(event.newValue);
          if (state.tabId !== this.tabId) {
            this.handleExternalConsentChange({
              timestamp: state.lastUpdated,
              oldConsent: this.currentState.consent,
              newConsent: state.consent,
              source: state.source,
              tabId: state.tabId,
            });
          }
        } catch (error) {
          console.error('Failed to parse consent state from storage', error);
        }
      }
    });

    // Listen for custom consent change events
    window.addEventListener('c15t-consent-change', (event: CustomEvent) => {
      if (event.detail && event.detail.tabId !== this.tabId) {
        this.handleExternalConsentChange(event.detail);
      }
    });

    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncFromStorage();
      }
    });
  }

  /**
   * Start sync interval
   */
  private startSyncInterval(): void {
    if (!this.options.enableCrossTabSync) return;

    this.syncInterval = setInterval(() => {
      this.syncFromStorage();
    }, this.options.syncInterval);
  }

  /**
   * Sync from storage
   */
  private syncFromStorage(): void {
    if (!this.options.enablePersistence) return;

    const stored = this.loadFromStorage();
    if (stored && stored.tabId !== this.tabId) {
      // Check if stored state is newer
      if (stored.lastUpdated > this.currentState.lastUpdated) {
        this.handleExternalConsentChange({
          timestamp: stored.lastUpdated,
          oldConsent: this.currentState.consent,
          newConsent: stored.consent,
          source: stored.source,
          tabId: stored.tabId,
        });
      }
    }
  }

  /**
   * Sync to other tabs
   */
  private syncToOtherTabs(change: ConsentChangeEvent): void {
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('c15t-consent-change', {
      detail: change,
    }));
  }

  /**
   * Load state from storage
   */
  private loadFromStorage(): ConsentState | null {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load consent state from storage', error);
      return null;
    }
  }

  /**
   * Persist state to storage
   */
  private async persistToStorage(): Promise<void> {
    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.currentState));
    } catch (error) {
      console.error('Failed to persist consent state to storage', error);
    }
  }

  /**
   * Check if two consent states are equal
   */
  private isConsentEqual(consent1: AnalyticsConsent, consent2: AnalyticsConsent): boolean {
    return Object.keys(consent1).every(key => 
      consent1[key as keyof AnalyticsConsent] === consent2[key as keyof AnalyticsConsent]
    );
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
   * Generate unique tab ID
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.removeAllListeners();
  }
}
```

### Consent Sync Hook Implementation
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnalyticsConsent } from '@c15t/core';
import { ConsentStateManager, ConsentChangeEvent } from '../utils/consent-state-manager';

export interface UseConsentSyncOptions {
  enablePersistence?: boolean;
  enableCrossTabSync?: boolean;
  conflictResolution?: 'latest' | 'user-choice' | 'merge';
  onConsentChange?: (change: ConsentChangeEvent) => void;
  onConflict?: (current: AnalyticsConsent, external: AnalyticsConsent) => AnalyticsConsent;
}

export interface ConsentSyncState {
  consent: AnalyticsConsent;
  loading: boolean;
  error?: string;
  lastUpdated: number;
  source: string;
  tabId: string;
}

export interface ConsentSyncActions {
  updateConsent: (consent: AnalyticsConsent, source?: string, reason?: string) => Promise<void>;
  resetConsent: () => Promise<void>;
  getChangeHistory: () => ConsentChangeEvent[];
  getConsentStats: () => any;
}

export function useConsentSync(
  options: UseConsentSyncOptions = {}
): ConsentSyncState & ConsentSyncActions {
  const {
    enablePersistence = true,
    enableCrossTabSync = true,
    conflictResolution = 'latest',
    onConsentChange,
    onConflict,
  } = options;

  const [state, setState] = useState<ConsentSyncState>({
    consent: getDefaultConsent(),
    loading: true,
    lastUpdated: 0,
    source: 'initialization',
    tabId: '',
  });

  const managerRef = useRef<ConsentStateManager>();
  const isInitializedRef = useRef(false);

  // Initialize consent state manager
  useEffect(() => {
    if (!isInitializedRef.current) {
      managerRef.current = new ConsentStateManager({
        enablePersistence,
        enableCrossTabSync,
        conflictResolution,
      });

      // Set initial state
      setState({
        consent: managerRef.current.getConsent(),
        loading: false,
        lastUpdated: Date.now(),
        source: 'initialization',
        tabId: managerRef.current['tabId'],
      });

      // Listen for consent changes
      managerRef.current.on('consent-change', (change: ConsentChangeEvent) => {
        setState(prev => ({
          ...prev,
          consent: change.newConsent,
          lastUpdated: change.timestamp,
          source: change.source,
        }));

        onConsentChange?.(change);
      });

      isInitializedRef.current = true;
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
  }, []);

  // Update consent
  const updateConsent = useCallback(async (
    newConsent: AnalyticsConsent,
    source: string = 'user-action',
    reason?: string
  ) => {
    if (!managerRef.current) return;

    try {
      await managerRef.current.updateConsent(newConsent, source, reason);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update consent',
      }));
    }
  }, []);

  // Reset consent to default
  const resetConsent = useCallback(async () => {
    await updateConsent(getDefaultConsent(), 'reset');
  }, [updateConsent]);

  // Get change history
  const getChangeHistory = useCallback((): ConsentChangeEvent[] => {
    return managerRef.current?.getChangeHistory() || [];
  }, []);

  // Get consent statistics
  const getConsentStats = useCallback(() => {
    return managerRef.current?.getConsentStats() || {
      totalChanges: 0,
      lastChange: 0,
      sources: {},
      tabChanges: {},
    };
  }, []);

  return {
    ...state,
    updateConsent,
    resetConsent,
    getChangeHistory,
    getConsentStats,
  };
}

// Helper function
function getDefaultConsent(): AnalyticsConsent {
  return {
    necessary: true,
    measurement: false,
    marketing: false,
    functionality: false,
    experience: false,
  };
}
```

### Consent Conflict Resolver
```typescript
export interface ConflictResolutionStrategy {
  resolve(
    currentConsent: AnalyticsConsent,
    externalConsent: AnalyticsConsent,
    context: ConflictContext
  ): AnalyticsConsent;
}

export interface ConflictContext {
  source: string;
  timestamp: number;
  tabId: string;
  reason?: string;
}

export class LatestWinsResolver implements ConflictResolutionStrategy {
  resolve(
    currentConsent: AnalyticsConsent,
    externalConsent: AnalyticsConsent,
    context: ConflictContext
  ): AnalyticsConsent {
    // Always use the external consent (latest)
    return externalConsent;
  }
}

export class UserChoiceResolver implements ConflictResolutionStrategy {
  resolve(
    currentConsent: AnalyticsConsent,
    externalConsent: AnalyticsConsent,
    context: ConflictContext
  ): AnalyticsConsent {
    // Implementation would show UI for user choice
    // For now, return external consent
    return externalConsent;
  }
}

export class MergeResolver implements ConflictResolutionStrategy {
  resolve(
    currentConsent: AnalyticsConsent,
    externalConsent: AnalyticsConsent,
    context: ConflictContext
  ): AnalyticsConsent {
    // Merge consents (more permissive)
    return {
      necessary: currentConsent.necessary || externalConsent.necessary,
      measurement: currentConsent.measurement || externalConsent.measurement,
      marketing: currentConsent.marketing || externalConsent.marketing,
      functionality: currentConsent.functionality || externalConsent.functionality,
      experience: currentConsent.experience || externalConsent.experience,
    };
  }
}
```

## 🧪 Testing Requirements
- Unit tests for consent state management
- Unit tests for cross-tab synchronization
- Unit tests for conflict resolution
- Unit tests for persistence
- Unit tests for change history
- Integration tests with consent system
- Browser tab testing for synchronization

## 🔍 Definition of Done
- [ ] ConsentStateManager class implemented
- [ ] Cross-tab synchronization working
- [ ] Real-time consent updates implemented
- [ ] Consent persistence implemented
- [ ] Conflict resolution implemented
- [ ] Consent change history implemented
- [ ] Unit tests for state synchronization
- [ ] Integration tests with consent system
- [ ] Code review completed

## 📚 Related Documentation
- [Analytics Frontend Integration](../docs/analytics-frontend-integration.md)
- [Analytics Architecture Diagram](../docs/analytics-architecture-diagram.md)

## 🔗 Dependencies
- [5.5: Dynamic Script Loading Hook](./26-dynamic-script-loading.md) ✅

## 🚀 Next Ticket
[5.7: Implement Frontend Integration Updates](./28-frontend-integration-updates.md)
