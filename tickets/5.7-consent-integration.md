# Ticket 4.1: Integrate with Existing Consent System

## 📋 Ticket Details
**Phase**: 4 - Unified Consent & Migration  
**Estimate**: 2 days  
**Priority**: High  
**Assignee**: TBD  
**Status**: Ready  

## 🎯 Description
Integrate analytics system with existing consent management infrastructure. This creates a unified consent flow where analytics tracking and consent management work together seamlessly, supporting both consent.io control plane and self-hosted deployments.

## 🧠 Context & Background
This ticket integrates the analytics system with the existing consent management infrastructure where:

- **Unified consent flow** connects analytics tracking with consent management
- **Consent events** trigger both analytics tracking and compliance database updates
- **Multi-CMP support** allows running alongside existing CMPs like OneTrust
- **Consent state management** ensures analytics respects user preferences
- **Audit logging** tracks all consent changes for compliance
- **Two deployment models** coexist:
  - **Consent.io SaaS**: Unified consent flow with control plane
  - **Self-hosted**: Integration with existing consent systems

The integration must:
- Connect analytics handlers to existing consent endpoints
- Handle consent events as special analytics events
- Ensure consent changes are tracked across all destinations
- Maintain consent state for analytics decisions
- Provide audit trails for compliance requirements
- Support gradual migration from existing CMPs

## ✅ Acceptance Criteria
- [ ] Update analytics handler to call existing consent endpoints
- [ ] Add consent event special handling
- [ ] Ensure consent events are sent to all destinations
- [ ] Add consent state management
- [ ] Add audit logging for consent changes
- [ ] Support multi-CMP integration
- [ ] Unit tests for consent integration

## 📁 Files to Modify
- `packages/backend/src/v2/handlers/analytics/process.handler.ts`
- `packages/backend/src/v2/analytics/event-processor.ts`
- `packages/backend/src/v2/analytics/consent-manager.ts` (new)

## 🔧 Implementation Details

### Enhanced Analytics Handler with Consent Integration
```typescript
import { Request, Response } from 'express';
import { EventProcessor } from '../../analytics/event-processor';
import { DestinationManager } from '../../analytics/destination-manager';
import { ConsentManager } from '../../analytics/consent-manager';
import { Logger } from '../../logger';
import { AnalyticsEvent, ConsentEvent, ConsentState } from '../../analytics/types';

interface ConsentIntegrationContext {
  eventProcessor: EventProcessor;
  destinationManager: DestinationManager;
  consentManager: ConsentManager;
  logger: Logger;
}

export async function processEventsHandler(
  req: Request,
  res: Response,
  context: ConsentIntegrationContext
): Promise<void> {
  try {
    const events: AnalyticsEvent[] = req.body.events || [];
    const userId = req.body.userId;
    const sessionId = req.body.sessionId;
    const consent = req.body.consent as ConsentState;

    context.logger.info('Processing analytics events', {
      eventCount: events.length,
      userId,
      sessionId,
      hasConsent: !!consent,
    });

    // Process each event
    const results = await Promise.allSettled(
      events.map(async (event) => {
        // Check if this is a consent event
        if (isConsentEvent(event)) {
          return await handleConsentEvent(event, context, { userId, sessionId });
        }

        // Regular analytics event
        return await handleAnalyticsEvent(event, context, { userId, sessionId, consent });
      })
    );

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    context.logger.info('Event processing completed', {
      total: events.length,
      successful,
      failed,
    });

    res.json({
      success: true,
      processed: successful,
      failed,
      results: results.map(r => 
        r.status === 'fulfilled' ? { success: true } : { success: false, error: r.reason }
      ),
    });

  } catch (error) {
    context.logger.error('Failed to process analytics events', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process events',
      message: error.message,
    });
  }
}

// Check if event is a consent-related event
function isConsentEvent(event: AnalyticsEvent): boolean {
  return event.type === 'consent_given' || 
         event.type === 'consent_withdrawn' ||
         event.type === 'consent_updated' ||
         event.properties?.consent_action !== undefined;
}

// Handle consent events specially
async function handleConsentEvent(
  event: ConsentEvent,
  context: ConsentIntegrationContext,
  metadata: { userId?: string; sessionId?: string }
): Promise<void> {
  const { eventProcessor, destinationManager, consentManager, logger } = context;

  logger.info('Processing consent event', {
    eventType: event.type,
    userId: metadata.userId,
    sessionId: metadata.sessionId,
    consentAction: event.properties?.consent_action,
  });

  try {
    // Update consent state in consent manager
    await consentManager.updateConsentState(event, metadata);

    // Send consent event to ALL destinations (regardless of consent preferences)
    // This ensures compliance tracking across all analytics platforms
    const destinations = destinationManager.getLoadedDestinations();
    
    const consentEventResults = await Promise.allSettled(
      destinations.map(async (destination) => {
        try {
          // Create consent-specific event for this destination
          const consentEventForDestination = {
            ...event,
            properties: {
              ...event.properties,
              destination_type: destination.type,
              consent_tracking: true,
            },
          };

          await destination.track(consentEventForDestination, {
            userId: metadata.userId,
            sessionId: metadata.sessionId,
            timestamp: new Date().toISOString(),
          });

          logger.debug('Consent event sent to destination', {
            destinationType: destination.type,
            eventType: event.type,
          });

        } catch (error) {
          logger.error('Failed to send consent event to destination', {
            destinationType: destination.type,
            error: error.message,
          });
          throw error;
        }
      })
    );

    // Log audit trail for compliance
    await consentManager.logConsentAudit({
      event,
      userId: metadata.userId,
      sessionId: metadata.sessionId,
      destinationsProcessed: destinations.length,
      destinationsSuccessful: consentEventResults.filter(r => r.status === 'fulfilled').length,
      timestamp: new Date().toISOString(),
    });

    logger.info('Consent event processing completed', {
      eventType: event.type,
      destinationsProcessed: destinations.length,
    });

  } catch (error) {
    logger.error('Failed to process consent event', {
      eventType: event.type,
      error: error.message,
    });
    throw error;
  }
}

// Handle regular analytics events
async function handleAnalyticsEvent(
  event: AnalyticsEvent,
  context: ConsentIntegrationContext,
  metadata: { userId?: string; sessionId?: string; consent?: ConsentState }
): Promise<void> {
  const { eventProcessor, destinationManager, consentManager, logger } = context;

  // Check consent requirements for this event
  const consentCheck = await consentManager.checkEventConsent(event, metadata.consent);
  
  if (!consentCheck.allowed) {
    logger.debug('Event blocked due to consent', {
      eventType: event.type,
      requiredConsent: consentCheck.requiredConsent,
      userConsent: metadata.consent,
    });
    return;
  }

  // Process event through normal analytics pipeline
  await eventProcessor.processEvent(event, {
    userId: metadata.userId,
    sessionId: metadata.sessionId,
    consent: metadata.consent,
  });
}
```

### Consent Manager Implementation
```typescript
import { Logger } from '../logger';
import { ConsentEvent, ConsentState, AnalyticsEvent } from '../types';

export class ConsentManager {
  private consentState = new Map<string, ConsentState>();
  private auditLog: ConsentAuditEntry[] = [];

  constructor(private logger: Logger) {}

  // Update consent state from consent events
  async updateConsentState(
    event: ConsentEvent,
    metadata: { userId?: string; sessionId?: string }
  ): Promise<void> {
    const userId = metadata.userId || 'anonymous';
    
    try {
      let currentState = this.consentState.get(userId) || this.getDefaultConsentState();
      
      // Update consent state based on event
      switch (event.type) {
        case 'consent_given':
          currentState = this.updateConsentGiven(currentState, event);
          break;
        case 'consent_withdrawn':
          currentState = this.updateConsentWithdrawn(currentState, event);
          break;
        case 'consent_updated':
          currentState = this.updateConsentUpdated(currentState, event);
          break;
        default:
          this.logger.warn('Unknown consent event type', { eventType: event.type });
      }

      // Store updated state
      this.consentState.set(userId, currentState);

      this.logger.info('Consent state updated', {
        userId,
        eventType: event.type,
        newState: currentState,
      });

    } catch (error) {
      this.logger.error('Failed to update consent state', {
        userId,
        eventType: event.type,
        error: error.message,
      });
      throw error;
    }
  }

  // Check if event is allowed based on consent
  async checkEventConsent(
    event: AnalyticsEvent,
    userConsent?: ConsentState
  ): Promise<{ allowed: boolean; requiredConsent: string[] }> {
    // Get required consent for this event type
    const requiredConsent = this.getRequiredConsentForEvent(event);
    
    if (requiredConsent.length === 0) {
      return { allowed: true, requiredConsent: [] };
    }

    // Use provided consent or get from state
    const consent = userConsent || this.getCurrentConsentState();
    
    // Check if user has given required consent
    const allowed = requiredConsent.every(purpose => consent[purpose] === true);
    
    return { allowed, requiredConsent };
  }

  // Log consent audit trail
  async logConsentAudit(auditData: ConsentAuditData): Promise<void> {
    const auditEntry: ConsentAuditEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...auditData,
    };

    this.auditLog.push(auditEntry);

    // In production, this would be stored in a database
    this.logger.info('Consent audit logged', {
      auditId: auditEntry.id,
      eventType: auditData.event.type,
      userId: auditData.userId,
    });
  }

  // Get current consent state for user
  getCurrentConsentState(userId?: string): ConsentState {
    return this.consentState.get(userId || 'anonymous') || this.getDefaultConsentState();
  }

  // Get required consent for event type
  private getRequiredConsentForEvent(event: AnalyticsEvent): string[] {
    // This would typically come from destination configuration
    // For now, return based on event type
    switch (event.type) {
      case 'page_view':
        return ['necessary', 'measurement'];
      case 'click':
      case 'scroll':
        return ['necessary', 'measurement'];
      case 'purchase':
      case 'add_to_cart':
        return ['necessary', 'measurement', 'marketing'];
      case 'custom_event':
        return ['necessary']; // Custom events default to necessary only
      default:
        return ['necessary'];
    }
  }

  // Update consent state for consent_given events
  private updateConsentGiven(current: ConsentState, event: ConsentEvent): ConsentState {
    const purposes = event.properties?.purposes || [];
    const newState = { ...current };
    
    purposes.forEach(purpose => {
      newState[purpose] = true;
    });
    
    return newState;
  }

  // Update consent state for consent_withdrawn events
  private updateConsentWithdrawn(current: ConsentState, event: ConsentEvent): ConsentState {
    const purposes = event.properties?.purposes || [];
    const newState = { ...current };
    
    purposes.forEach(purpose => {
      newState[purpose] = false;
    });
    
    return newState;
  }

  // Update consent state for consent_updated events
  private updateConsentUpdated(current: ConsentState, event: ConsentEvent): ConsentState {
    const updates = event.properties?.consent_updates || {};
    return { ...current, ...updates };
  }

  // Get default consent state
  private getDefaultConsentState(): ConsentState {
    return {
      necessary: true, // Always true
      measurement: false,
      marketing: false,
      functionality: false,
      experience: false,
    };
  }

  // Get audit log (for compliance reporting)
  getAuditLog(userId?: string, startDate?: Date, endDate?: Date): ConsentAuditEntry[] {
    let filtered = this.auditLog;
    
    if (userId) {
      filtered = filtered.filter(entry => entry.userId === userId);
    }
    
    if (startDate) {
      filtered = filtered.filter(entry => new Date(entry.timestamp) >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(entry => new Date(entry.timestamp) <= endDate);
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

// Types for consent management
interface ConsentAuditData {
  event: ConsentEvent;
  userId?: string;
  sessionId?: string;
  destinationsProcessed: number;
  destinationsSuccessful: number;
  timestamp: string;
}

interface ConsentAuditEntry extends ConsentAuditData {
  id: string;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
```

### Multi-CMP Integration Support
```typescript
// Support for running alongside existing CMPs
export class MultiCMPIntegration {
  constructor(
    private consentManager: ConsentManager,
    private logger: Logger
  ) {}

  // Integrate with OneTrust
  async integrateWithOneTrust(): Promise<void> {
    // Listen for OneTrust consent changes
    if (typeof window !== 'undefined' && window.OptanonWrapper) {
      window.OptanonWrapper = (() => {
        const originalWrapper = window.OptanonWrapper;
        return function() {
          if (originalWrapper) {
            originalWrapper();
          }
          
          // Send consent event to analytics
          this.sendConsentEventToAnalytics('onetrust');
        };
      })();
    }
  }

  // Integrate with Cookiebot
  async integrateWithCookiebot(): Promise<void> {
    if (typeof window !== 'undefined' && window.cookiebot) {
      window.addEventListener('CookiebotOnConsentReady', () => {
        this.sendConsentEventToAnalytics('cookiebot');
      });
    }
  }

  // Send consent event to analytics system
  private async sendConsentEventToAnalytics(cmpSource: string): Promise<void> {
    try {
      const consentEvent: ConsentEvent = {
        type: 'consent_updated',
        properties: {
          cmp_source: cmpSource,
          consent_action: 'updated',
          timestamp: new Date().toISOString(),
        },
      };

      // Send to analytics endpoint
      await fetch('/analytics/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [consentEvent],
          userId: this.getCurrentUserId(),
          sessionId: this.getCurrentSessionId(),
        }),
      });

      this.logger.info('Consent event sent to analytics', { cmpSource });

    } catch (error) {
      this.logger.error('Failed to send consent event to analytics', {
        cmpSource,
        error: error.message,
      });
    }
  }

  private getCurrentUserId(): string {
    // Implementation depends on your user identification system
    return 'user-' + Math.random().toString(36).substr(2, 9);
  }

  private getCurrentSessionId(): string {
    // Implementation depends on your session management
    return 'session-' + Math.random().toString(36).substr(2, 9);
  }
}
```

### Usage Examples
```typescript
// Consent.io deployed instance with unified consent
const backendInstance = await createC15TBackendInstance({
  organizationId: 'org-123',
  environment: 'production',
  databaseUrl: process.env.DATABASE_URL,
  databaseEncryptionKey: process.env.ENCRYPTION_KEY,
});

// Analytics handler with consent integration
app.post('/analytics/process', backendInstance.handlers.processEvents);

// Self-hosted with existing consent system
const instance = await c15tInstance({
  analytics: {
    destinations: [
      posthog({ apiKey: 'phc_xxx' }),
      metaPixel({ pixelId: '123', accessToken: 'token' }),
    ],
  },
  consent: {
    // Integrate with existing CMP
    integrateWithExistingCMP: true,
    cmpType: 'onetrust', // or 'cookiebot', 'custom'
  },
});
```

## 🧪 Testing Requirements
- Unit tests for consent integration
- Integration tests with existing consent system
- Consent event handling tests
- Multi-CMP integration tests
- Audit logging tests
- Consent state management tests
- Error handling tests

## 🔍 Definition of Done
- [ ] Analytics handler calls existing consent endpoints
- [ ] Consent event special handling implemented
- [ ] Consent events sent to all destinations
- [ ] Consent state management added
- [ ] Audit logging for consent changes
- [ ] Multi-CMP integration support
- [ ] Unit tests for consent integration
- [ ] Code review completed

## 📚 Related Documentation
- [Analytics Architecture Diagram](../docs/analytics-architecture-diagram.md)
- [Analytics Frontend Integration](../docs/analytics-frontend-integration.md)
- [Unified Consent Flow](../docs/unified-consent-flow.md)

## 🔗 Dependencies
- Phase 3 Complete ✅

## 🚀 Next Ticket
[4.2: Create Migration Tooling](./19-migration-tooling.md)
