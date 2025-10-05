# Ticket 4.3: Update Frontend Consent Flow

## 📋 Ticket Details
**Phase**: 4 - Unified Consent & Migration  
**Estimate**: 2 days  
**Priority**: High  
**Assignee**: TBD  
**Status**: Ready  

## 🎯 Description
Unify consent management across the platform by updating the frontend consent flow to integrate seamlessly with the new analytics system. This creates a single, consistent consent experience that handles both analytics tracking and compliance requirements while supporting gradual migration from existing consent systems.

## 🧠 Context & Background
This ticket unifies consent management across the platform where:

- **Unified consent flow** connects frontend consent UI with analytics system
- **Single consent call** handles both analytics tracking and compliance database updates
- **Dynamic script management** loads/unloads analytics scripts based on consent changes
- **Consent state synchronization** ensures consistency across all components
- **Automatic destination sync** handles multiple consent destinations automatically
- **Two deployment models** coexist:
  - **Consent.io SaaS**: Unified consent flow with control plane
  - **Self-hosted**: Integration with existing consent systems

The unified consent flow must:
- Update ConsentManagerProvider to use analytics consent system
- Provide unified consent state management across components
- Handle consent change notifications and script management
- Automatically sync with all configured consent destinations
- Ensure error handling and fallback mechanisms
- Maintain backward compatibility during transition

## ✅ Acceptance Criteria
- [ ] Update ConsentManagerProvider to use analytics consent
- [ ] Add unified consent state management
- [ ] Add consent change notifications
- [ ] Add script loading/unloading on consent change
- [ ] Add error handling for consent failures
- [ ] Add automatic destination sync
- [ ] Unit tests for unified consent flow

## 📁 Files to Modify
- `packages/react/src/consent-manager-provider.tsx`
- `packages/core/src/consent-manager.ts`
- `packages/react/src/hooks/use-consent.ts` (new)
- `packages/react/src/components/consent-banner.tsx` (update)

## 🔧 Implementation Details

### Enhanced ConsentManagerProvider
```typescript
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AnalyticsConsent, ConsentState, ConsentEvent } from '@c15t/analytics-types';
import { Logger } from '@c15t/logger';

interface ConsentManagerContextType {
  consent: ConsentState;
  updateConsent: (updates: Partial<ConsentState>) => Promise<void>;
  resetConsent: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isConsentGiven: (purpose: string) => boolean;
  hasConsentForEvent: (eventType: string) => boolean;
  getConsentStatus: () => ConsentStatus;
}

interface ConsentManagerProviderProps {
  children: React.ReactNode;
  initialConsent?: ConsentState;
  onConsentChange?: (consent: ConsentState) => void;
  enableAnalyticsIntegration?: boolean;
  fallbackToLegacy?: boolean;
}

const ConsentManagerContext = createContext<ConsentManagerContextType | null>(null);

export function ConsentManagerProvider({
  children,
  initialConsent,
  onConsentChange,
  enableAnalyticsIntegration = true,
  fallbackToLegacy = true,
}: ConsentManagerProviderProps) {
  const [consent, setConsent] = useState<ConsentState>(initialConsent || getDefaultConsent());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logger = new Logger({ component: 'consent-manager' });

  // Initialize consent from storage
  useEffect(() => {
    const initializeConsent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to load from localStorage
        const stored = localStorage.getItem('c15t-consent');
        const storedConsent = stored ? JSON.parse(stored) : null;

        // Use stored consent or default
        const finalConsent = storedConsent || getDefaultConsent();
        setConsent(finalConsent);

        // Notify analytics system of current consent state
        if (enableAnalyticsIntegration) {
          await notifyAnalyticsConsent(finalConsent, 'initialized');
        }

        logger.info('Consent initialized', {
          consent: finalConsent,
          source: storedConsent ? 'storage' : 'default',
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize consent';
        setError(errorMessage);
        logger.error('Consent initialization failed', { error: errorMessage });

        if (fallbackToLegacy) {
          logger.warn('Falling back to legacy consent system');
          // Fallback to legacy consent system
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeConsent();
  }, [enableAnalyticsIntegration, fallbackToLegacy]);

  // Update consent state
  const updateConsent = useCallback(async (updates: Partial<ConsentState>) => {
    try {
      setIsLoading(true);
      setError(null);

      const newConsent = { ...consent, ...updates };
      setConsent(newConsent);

      // Store in localStorage
      localStorage.setItem('c15t-consent', JSON.stringify(newConsent));

      // Notify analytics system - this will automatically sync with all configured consent destinations
      if (enableAnalyticsIntegration) {
        await notifyAnalyticsConsent(newConsent, 'updated');
      }

      // Notify parent component
      onConsentChange?.(newConsent);

      logger.info('Consent updated', {
        updates,
        newConsent,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update consent';
      setError(errorMessage);
      logger.error('Consent update failed', { error: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [consent, enableAnalyticsIntegration, onConsentChange]);

  // Reset consent to default
  const resetConsent = useCallback(async () => {
    await updateConsent(getDefaultConsent());
  }, [updateConsent]);

  // Check if consent is given for a specific purpose
  const isConsentGiven = useCallback((purpose: string) => {
    return consent[purpose as keyof ConsentState] === true;
  }, [consent]);

  // Check if consent is sufficient for an event type
  const hasConsentForEvent = useCallback((eventType: string) => {
    const requiredConsent = getRequiredConsentForEvent(eventType);
    return requiredConsent.every(purpose => consent[purpose as keyof ConsentState] === true);
  }, [consent]);

  // Get current consent status
  const getConsentStatus = useCallback((): ConsentStatus => {
    const purposes = Object.keys(consent) as Array<keyof ConsentState>;
    const givenPurposes = purposes.filter(purpose => consent[purpose] === true);
    const totalPurposes = purposes.length;

    return {
      isComplete: givenPurposes.length === totalPurposes,
      givenPurposes,
      totalPurposes,
      percentage: Math.round((givenPurposes.length / totalPurposes) * 100),
    };
  }, [consent]);

  const contextValue: ConsentManagerContextType = {
    consent,
    updateConsent,
    resetConsent,
    isLoading,
    error,
    isConsentGiven,
    hasConsentForEvent,
    getConsentStatus,
  };

  return (
    <ConsentManagerContext.Provider value={contextValue}>
      {children}
    </ConsentManagerContext.Provider>
  );
}

// Hook to use consent manager
export function useConsentManager(): ConsentManagerContextType {
  const context = useContext(ConsentManagerContext);
  if (!context) {
    throw new Error('useConsentManager must be used within a ConsentManagerProvider');
  }
  return context;
}

// Helper functions
function getDefaultConsent(): ConsentState {
  return {
    necessary: true, // Always true
    measurement: false,
    marketing: false,
    functionality: false,
    experience: false,
  };
}

function getRequiredConsentForEvent(eventType: string): string[] {
  const eventConsentMap: Record<string, string[]> = {
    'page_view': ['necessary', 'measurement'],
    'click': ['necessary', 'measurement'],
    'scroll': ['necessary', 'measurement'],
    'purchase': ['necessary', 'measurement', 'marketing'],
    'add_to_cart': ['necessary', 'measurement', 'marketing'],
    'sign_up': ['necessary', 'measurement'],
    'login': ['necessary', 'measurement'],
    'custom_event': ['necessary'],
  };

  return eventConsentMap[eventType] || ['necessary'];
}

// Notify analytics system of consent changes
async function notifyAnalyticsConsent(consent: ConsentState, action: 'initialized' | 'updated'): Promise<void> {
  try {
    const consentEvent: ConsentEvent = {
      type: 'consent',
      action: action === 'initialized' ? 'granted' : 'updated',
      preferences: consent,
      source: 'banner',
      timestamp: new Date().toISOString(),
    };

    // Send to analytics endpoint - this will automatically sync with all configured consent destinations
    await fetch('/analytics/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [consentEvent],
        userId: getCurrentUserId(),
        sessionId: getCurrentSessionId(),
      }),
    });

  } catch (error) {
    console.error('Failed to notify analytics of consent change:', error);
  }
}

// Utility functions
function getCurrentUserId(): string {
  // Implementation depends on your user identification system
  return 'user-' + Math.random().toString(36).substr(2, 9);
}

function getCurrentSessionId(): string {
  // Implementation depends on your session management
  return 'session-' + Math.random().toString(36).substr(2, 9);
}

// Types
interface ConsentStatus {
  isComplete: boolean;
  givenPurposes: string[];
  totalPurposes: number;
  percentage: number;
}
```

### Enhanced Consent Banner Component
```typescript
import React, { useState } from 'react';
import { useConsentManager } from '../hooks/use-consent';

interface ConsentBannerProps {
  onAccept?: (consent: ConsentState) => void;
  onReject?: () => void;
  onCustomize?: () => void;
  showCustomizeButton?: boolean;
  theme?: 'light' | 'dark';
  position?: 'bottom' | 'top' | 'center';
}

export function ConsentBanner({
  onAccept,
  onReject,
  onCustomize,
  showCustomizeButton = true,
  theme = 'light',
  position = 'bottom',
}: ConsentBannerProps) {
  const { consent, updateConsent, isLoading, error } = useConsentManager();
  const [showDetails, setShowDetails] = useState(false);
  const [customConsent, setCustomConsent] = useState(consent);

  const handleAcceptAll = async () => {
    try {
      const allConsent = {
        necessary: true,
        measurement: true,
        marketing: true,
        functionality: true,
        experience: true,
      };
      
      await updateConsent(allConsent);
      onAccept?.(allConsent);
    } catch (error) {
      console.error('Failed to accept all consent:', error);
    }
  };

  const handleRejectAll = async () => {
    try {
      const minimalConsent = {
        necessary: true,
        measurement: false,
        marketing: false,
        functionality: false,
        experience: false,
      };
      
      await updateConsent(minimalConsent);
      onReject?.();
    } catch (error) {
      console.error('Failed to reject consent:', error);
    }
  };

  const handleCustomSave = async () => {
    try {
      await updateConsent(customConsent);
      onAccept?.(customConsent);
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to save custom consent:', error);
    }
  };

  const handleCustomConsentChange = (purpose: string, value: boolean) => {
    setCustomConsent(prev => ({
      ...prev,
      [purpose]: value,
    }));
  };

  if (error) {
    return (
      <div className={`consent-banner consent-banner--error consent-banner--${theme} consent-banner--${position}`}>
        <div className="consent-banner__content">
          <h3>Consent Error</h3>
          <p>There was an error managing your consent preferences. Please refresh the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`consent-banner consent-banner--${theme} consent-banner--${position}`}>
      <div className="consent-banner__content">
        <div className="consent-banner__header">
          <h3>Cookie & Privacy Preferences</h3>
          <p>
            We use cookies and similar technologies to provide, protect, and improve our services.
            You can choose to accept all, reject all, or customize your preferences.
          </p>
        </div>

        {!showDetails ? (
          <div className="consent-banner__actions">
            <button
              onClick={handleRejectAll}
              disabled={isLoading}
              className="consent-banner__button consent-banner__button--reject"
            >
              Reject All
            </button>
            
            {showCustomizeButton && (
              <button
                onClick={() => setShowDetails(true)}
                className="consent-banner__button consent-banner__button--customize"
              >
                Customize
              </button>
            )}
            
            <button
              onClick={handleAcceptAll}
              disabled={isLoading}
              className="consent-banner__button consent-banner__button--accept"
            >
              Accept All
            </button>
          </div>
        ) : (
          <div className="consent-banner__details">
            <div className="consent-banner__purposes">
              <div className="consent-banner__purpose">
                <label>
                  <input
                    type="checkbox"
                    checked={customConsent.necessary}
                    disabled
                    readOnly
                  />
                  <span className="consent-banner__purpose-label">
                    <strong>Necessary</strong>
                    <small>Essential for website functionality</small>
                  </span>
                </label>
              </div>

              <div className="consent-banner__purpose">
                <label>
                  <input
                    type="checkbox"
                    checked={customConsent.measurement}
                    onChange={(e) => handleCustomConsentChange('measurement', e.target.checked)}
                  />
                  <span className="consent-banner__purpose-label">
                    <strong>Analytics</strong>
                    <small>Website usage and performance data</small>
                  </span>
                </label>
              </div>

              <div className="consent-banner__purpose">
                <label>
                  <input
                    type="checkbox"
                    checked={customConsent.marketing}
                    onChange={(e) => handleCustomConsentChange('marketing', e.target.checked)}
                  />
                  <span className="consent-banner__purpose-label">
                    <strong>Marketing</strong>
                    <small>Advertising and promotional content</small>
                  </span>
                </label>
              </div>

              <div className="consent-banner__purpose">
                <label>
                  <input
                    type="checkbox"
                    checked={customConsent.functionality}
                    onChange={(e) => handleCustomConsentChange('functionality', e.target.checked)}
                  />
                  <span className="consent-banner__purpose-label">
                    <strong>Functionality</strong>
                    <small>Enhanced features and personalization</small>
                  </span>
                </label>
              </div>

              <div className="consent-banner__purpose">
                <label>
                  <input
                    type="checkbox"
                    checked={customConsent.experience}
                    onChange={(e) => handleCustomConsentChange('experience', e.target.checked)}
                  />
                  <span className="consent-banner__purpose-label">
                    <strong>Experience</strong>
                    <small>User experience improvements</small>
                  </span>
                </label>
              </div>
            </div>

            <div className="consent-banner__actions">
              <button
                onClick={() => setShowDetails(false)}
                className="consent-banner__button consent-banner__button--cancel"
              >
                Cancel
              </button>
              
              <button
                onClick={handleCustomSave}
                disabled={isLoading}
                className="consent-banner__button consent-banner__button--save"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Script Management Hook
```typescript
import { useEffect, useRef } from 'react';
import { useConsentManager } from './use-consent';

interface ScriptManagerOptions {
  scriptsEndpoint?: string;
  onScriptsLoaded?: (scripts: Script[]) => void;
  onScriptsError?: (error: Error) => void;
}

export function useScriptManager(options: ScriptManagerOptions = {}) {
  const { consent, hasConsentForEvent } = useConsentManager();
  const scriptsRef = useRef<Script[]>([]);
  const loadedScriptsRef = useRef<Set<string>>(new Set());

  // Load scripts based on current consent
  useEffect(() => {
    const loadScripts = async () => {
      try {
        const scriptsEndpoint = options.scriptsEndpoint || '/analytics/scripts';
        const consentString = encodeURIComponent(JSON.stringify(consent));
        
        const response = await fetch(`${scriptsEndpoint}?consent=${consentString}`);
        if (!response.ok) {
          throw new Error(`Failed to load scripts: ${response.status}`);
        }

        const data = await response.json();
        const scripts: Script[] = data.scripts || [];

        // Remove scripts that are no longer needed
        await removeUnusedScripts(scripts);

        // Load new scripts
        await loadNewScripts(scripts);

        scriptsRef.current = scripts;
        options.onScriptsLoaded?.(scripts);

      } catch (error) {
        console.error('Failed to load analytics scripts:', error);
        options.onScriptsError?.(error as Error);
      }
    };

    loadScripts();
  }, [consent, options.scriptsEndpoint]);

  // Remove scripts that are no longer needed
  const removeUnusedScripts = async (newScripts: Script[]) => {
    const currentScriptIds = new Set(newScripts.map(s => s.id));
    
    for (const scriptId of loadedScriptsRef.current) {
      if (!currentScriptIds.has(scriptId)) {
        await removeScript(scriptId);
        loadedScriptsRef.current.delete(scriptId);
      }
    }
  };

  // Load new scripts
  const loadNewScripts = async (scripts: Script[]) => {
    for (const script of scripts) {
      if (!loadedScriptsRef.current.has(script.id)) {
        await loadScript(script);
        loadedScriptsRef.current.add(script.id);
      }
    }
  };

  // Load individual script
  const loadScript = async (script: Script): Promise<void> => {
    return new Promise((resolve, reject) => {
      const scriptElement = document.createElement('script');
      scriptElement.src = script.src;
      scriptElement.async = true;
      scriptElement.defer = script.defer || false;
      
      if (script.attributes) {
        Object.entries(script.attributes).forEach(([key, value]) => {
          scriptElement.setAttribute(key, value);
        });
      }

      scriptElement.onload = () => {
        console.log(`Script loaded: ${script.id}`);
        resolve();
      };

      scriptElement.onerror = () => {
        console.error(`Failed to load script: ${script.id}`);
        reject(new Error(`Failed to load script: ${script.id}`));
      };

      document.head.appendChild(scriptElement);
    });
  };

  // Remove individual script
  const removeScript = async (scriptId: string): Promise<void> => {
    const scriptElement = document.querySelector(`script[data-script-id="${scriptId}"]`);
    if (scriptElement) {
      scriptElement.remove();
      console.log(`Script removed: ${scriptId}`);
    }
  };

  return {
    scripts: scriptsRef.current,
    loadedScripts: Array.from(loadedScriptsRef.current),
    hasConsentForEvent,
  };
}

// Script type definition
interface Script {
  id: string;
  src: string;
  defer?: boolean;
  attributes?: Record<string, string>;
}
```

### Usage Examples
```typescript
// App with unified consent flow
function App() {
  return (
    <ConsentManagerProvider
      enableAnalyticsIntegration={true}
      onConsentChange={(consent) => {
        console.log('Consent changed:', consent);
      }}
    >
      <ConsentBanner
        showCustomizeButton={true}
        theme="light"
        position="bottom"
        onAccept={(consent) => {
          console.log('User accepted consent:', consent);
        }}
        onReject={() => {
          console.log('User rejected consent');
        }}
      />
      
      <MainContent />
    </ConsentManagerProvider>
  );
}

// Component using consent manager
function AnalyticsComponent() {
  const { consent, hasConsentForEvent, getConsentStatus } = useConsentManager();
  const { scripts } = useScriptManager({
    scriptsEndpoint: '/analytics/scripts',
    onScriptsLoaded: (scripts) => {
      console.log('Analytics scripts loaded:', scripts.length);
    },
  });

  const handleTrackEvent = (eventType: string) => {
    if (hasConsentForEvent(eventType)) {
      // Track event
      console.log('Tracking event:', eventType);
    } else {
      console.log('Event blocked due to consent:', eventType);
    }
  };

  const consentStatus = getConsentStatus();

  return (
    <div>
      <h3>Analytics Status</h3>
      <p>Consent: {consentStatus.percentage}% complete</p>
      <p>Scripts loaded: {scripts.length}</p>
      
      <button onClick={() => handleTrackEvent('page_view')}>
        Track Page View
      </button>
    </div>
  );
}
```

## 🧪 Testing Requirements
- Unit tests for ConsentManagerProvider updates
- Unit tests for unified consent state management
- Consent change notification tests
- Script loading/unloading tests
- Automatic destination sync tests
- Error handling tests
- Integration tests with analytics system

## 🔍 Definition of Done
- [ ] ConsentManagerProvider uses analytics consent
- [ ] Unified consent state management implemented
- [ ] Consent change notifications added
- [ ] Script loading/unloading on consent change
- [ ] Error handling for consent failures
- [ ] Automatic destination sync implemented
- [ ] Unit tests for unified consent flow
- [ ] Code review completed

## 📚 Related Documentation
- [Analytics Frontend Integration](../docs/analytics-frontend-integration.md)
- [Analytics Architecture Diagram](../docs/analytics-architecture-diagram.md)
- [Unified Consent Flow](../docs/unified-consent-flow.md)

## 🔗 Dependencies
- [4.1: Integrate with Existing Consent System](./18-consent-integration.md) ✅
- [4.2: Create Migration Tooling](./19-migration-tooling.md) ✅

## 🚀 Next Ticket
[4.4: Add Deprecation Warnings](./21-deprecation-warnings.md)
