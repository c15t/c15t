# Ticket 2.5: Frontend Integration

## 📋 Ticket Details
**Phase**: 2 - Universal Destinations  
**Story Points**: 3  
**Priority**: High  
**Assignee**: TBD  
**Status**: Ready

## 🔗 Dependencies
**Depends on**: Ticket 2.1 (Universal Destination Interface), Ticket 2.2 (Scripts Endpoint)  
**Blocking**: Phase 3 (Advanced Features)  

## 🎯 Description
Update React components to use the new scripts endpoint for dynamic script loading based on user consent. This ticket bridges the gap between the backend scripts endpoint and the frontend consent management system.

## 🧠 Context & Background
This ticket is crucial for completing the universal destinations feature. The frontend must:
- **Dynamic script loading**: Fetch scripts from the backend based on consent
- **Consent-aware loading**: Only load scripts the user has consented to
- **Script management**: Load, unload, and reload scripts as consent changes
- **Error handling**: Gracefully handle script loading failures
- **Loading states**: Provide user feedback during script operations
- **Performance**: Cache scripts and avoid unnecessary reloads

The integration connects:
- Backend scripts endpoint for script generation
- Frontend consent management for user preferences
- Universal destinations for script execution
- Error handling for robust user experience

## ✅ Acceptance Criteria
- [ ] Update `ConsentManagerProvider` to fetch scripts dynamically
- [ ] Add script loading/unloading based on consent
- [ ] Add error handling for script failures
- [ ] Add loading states
- [ ] Unit tests for script management
- [ ] Integration tests with real scripts

## 📁 Files to Update
- `packages/core/src/client/` (extend existing client)

## 🔧 Implementation Details

### Updated ConsentManagerProvider
```typescript
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AnalyticsConsent, ConsentPurpose } from '@c15t/analytics-types';

// Script management types
interface Script {
  type: 'inline' | 'external' | 'module';
  content?: string;
  src?: string;
  async?: boolean;
  defer?: boolean;
  crossorigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
  requiredConsent: ReadonlyArray<ConsentPurpose>;
  name: string;
  description?: string;
  version?: string;
}

interface ScriptsResponse {
  scripts: Script[];
  metadata: {
    generatedAt: string;
    consent: AnalyticsConsent;
    destinationCount: number;
  };
}

interface ScriptManager {
  loadedScripts: Map<string, HTMLScriptElement>;
  loadingScripts: Set<string>;
  failedScripts: Set<string>;
  loadScript: (script: Script) => Promise<void>;
  unloadScript: (scriptName: string) => void;
  reloadScripts: (scripts: Script[]) => Promise<void>;
  clearAllScripts: () => void;
}

// Context types
interface ConsentManagerContextType {
  consent: AnalyticsConsent;
  setConsent: (consent: AnalyticsConsent) => void;
  updateConsent: (purpose: ConsentPurpose, granted: boolean) => void;
  scriptManager: ScriptManager;
  isLoading: boolean;
  error: string | null;
  scripts: Script[];
}

const ConsentManagerContext = createContext<ConsentManagerContextType | null>(null);

// Props interface
interface ConsentManagerProviderProps {
  children: React.ReactNode;
  initialConsent?: AnalyticsConsent;
  scriptsEndpoint?: string;
  organizationId?: string;
  environment?: string;
  onConsentChange?: (consent: AnalyticsConsent) => void;
  onScriptsLoaded?: (scripts: Script[]) => void;
  onError?: (error: Error) => void;
}

export function ConsentManagerProvider({
  children,
  initialConsent = {
    necessary: true,
    measurement: false,
    marketing: false,
    functionality: false,
    experience: false,
  },
  scriptsEndpoint = '/analytics/scripts',
  organizationId,
  environment,
  onConsentChange,
  onScriptsLoaded,
  onError,
}: ConsentManagerProviderProps) {
  const [consent, setConsentState] = useState<AnalyticsConsent>(initialConsent);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Script manager implementation
  const scriptManager: ScriptManager = {
    loadedScripts: new Map(),
    loadingScripts: new Set(),
    failedScripts: new Set(),

    async loadScript(script: Script): Promise<void> {
      if (this.loadedScripts.has(script.name) || this.loadingScripts.has(script.name)) {
        return;
      }

      this.loadingScripts.add(script.name);

      try {
        const scriptElement = await this.createScriptElement(script);
        document.head.appendChild(scriptElement);
        this.loadedScripts.set(script.name, scriptElement);
        this.failedScripts.delete(script.name);
      } catch (error) {
        this.failedScripts.add(script.name);
        throw error;
      } finally {
        this.loadingScripts.delete(script.name);
      }
    },

    unloadScript(scriptName: string): void {
      const scriptElement = this.loadedScripts.get(scriptName);
      if (scriptElement) {
        scriptElement.remove();
        this.loadedScripts.delete(scriptName);
        this.failedScripts.delete(scriptName);
      }
    },

    async reloadScripts(newScripts: Script[]): Promise<void> {
      // Unload all current scripts
      this.clearAllScripts();

      // Load new scripts
      const loadPromises = newScripts.map(script => this.loadScript(script));
      await Promise.allSettled(loadPromises);
    },

    clearAllScripts(): void {
      this.loadedScripts.forEach(script => script.remove());
      this.loadedScripts.clear();
      this.failedScripts.clear();
    },

    async createScriptElement(script: Script): Promise<HTMLScriptElement> {
      return new Promise((resolve, reject) => {
        const scriptElement = document.createElement('script');

        switch (script.type) {
          case 'inline':
            if (script.content) {
              scriptElement.textContent = script.content;
              resolve(scriptElement);
            } else {
              reject(new Error('Inline script missing content'));
            }
            break;

          case 'external':
            if (script.src) {
              scriptElement.src = script.src;
              scriptElement.async = script.async || false;
              scriptElement.defer = script.defer || false;

              if (script.crossorigin) {
                scriptElement.crossOrigin = script.crossorigin;
              }

              if (script.integrity) {
                scriptElement.integrity = script.integrity;
              }

              scriptElement.onload = () => resolve(scriptElement);
              scriptElement.onerror = () => reject(new Error(`Failed to load script: ${script.src}`));
            } else {
              reject(new Error('External script missing src'));
            }
            break;

          case 'module':
            if (script.src) {
              scriptElement.type = 'module';
              scriptElement.src = script.src;
              scriptElement.onload = () => resolve(scriptElement);
              scriptElement.onerror = () => reject(new Error(`Failed to load module: ${script.src}`));
            } else if (script.content) {
              scriptElement.type = 'module';
              scriptElement.textContent = script.content;
              resolve(scriptElement);
            } else {
              reject(new Error('Module script missing src or content'));
            }
            break;

          default:
            reject(new Error(`Unknown script type: ${script.type}`));
        }
      });
    },
  };

  // Fetch scripts from backend
  const fetchScripts = useCallback(async (currentConsent: AnalyticsConsent): Promise<Script[]> => {
    try {
      const params = new URLSearchParams({
        consent: JSON.stringify(currentConsent),
        ...(organizationId && { organizationId }),
        ...(environment && { environment }),
      });

      const response = await fetch(`${scriptsEndpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch scripts: ${response.status} ${response.statusText}`);
      }

      const data: ScriptsResponse = await response.json();
      return data.scripts;
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
      throw error;
    }
  }, [scriptsEndpoint, organizationId, environment]);

  // Load scripts based on consent
  const loadScriptsForConsent = useCallback(async (currentConsent: AnalyticsConsent) => {
    setIsLoading(true);
    setError(null);

    try {
      const newScripts = await fetchScripts(currentConsent);
      
      // Filter scripts by consent
      const allowedScripts = newScripts.filter(script =>
        script.requiredConsent.every(purpose => currentConsent[purpose])
      );

      // Reload scripts
      await scriptManager.reloadScripts(allowedScripts);
      
      setScripts(allowedScripts);
      onScriptsLoaded?.(allowedScripts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load scripts';
      setError(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [fetchScripts, scriptManager, onScriptsLoaded, onError]);

  // Update consent and reload scripts
  const setConsent = useCallback((newConsent: AnalyticsConsent) => {
    setConsentState(newConsent);
    onConsentChange?.(newConsent);
    loadScriptsForConsent(newConsent);
  }, [onConsentChange, loadScriptsForConsent]);

  // Update specific consent purpose
  const updateConsent = useCallback((purpose: ConsentPurpose, granted: boolean) => {
    const newConsent = { ...consent, [purpose]: granted };
    setConsent(newConsent);
  }, [consent, setConsent]);

  // Load scripts on mount
  useEffect(() => {
    loadScriptsForConsent(consent);
  }, []); // Only run on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scriptManager.clearAllScripts();
    };
  }, []);

  const contextValue: ConsentManagerContextType = {
    consent,
    setConsent,
    updateConsent,
    scriptManager,
    isLoading,
    error,
    scripts,
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

// Hook for script management
export function useScriptManager() {
  const { scriptManager, scripts, isLoading, error } = useConsentManager();
  return { scriptManager, scripts, isLoading, error };
}
```

### Consent Banner Component
```typescript
import React from 'react';
import { useConsentManager } from './consent-manager-provider';

interface ConsentBannerProps {
  onAccept?: () => void;
  onReject?: () => void;
  onCustomize?: () => void;
}

export function ConsentBanner({ onAccept, onReject, onCustomize }: ConsentBannerProps) {
  const { consent, updateConsent, isLoading } = useConsentManager();

  const handleAcceptAll = () => {
    updateConsent('measurement', true);
    updateConsent('marketing', true);
    updateConsent('functionality', true);
    updateConsent('experience', true);
    onAccept?.();
  };

  const handleRejectAll = () => {
    updateConsent('measurement', false);
    updateConsent('marketing', false);
    updateConsent('functionality', false);
    updateConsent('experience', false);
    onReject?.();
  };

  return (
    <div className="consent-banner">
      <div className="consent-content">
        <h3>Cookie Preferences</h3>
        <p>We use cookies to improve your experience and analyze our traffic.</p>
        
        <div className="consent-options">
          <label>
            <input
              type="checkbox"
              checked={consent.measurement}
              onChange={(e) => updateConsent('measurement', e.target.checked)}
              disabled={isLoading}
            />
            Analytics & Performance
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={consent.marketing}
              onChange={(e) => updateConsent('marketing', e.target.checked)}
              disabled={isLoading}
            />
            Marketing & Advertising
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={consent.functionality}
              onChange={(e) => updateConsent('functionality', e.target.checked)}
              disabled={isLoading}
            />
            Functionality
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={consent.experience}
              onChange={(e) => updateConsent('experience', e.target.checked)}
              disabled={isLoading}
            />
            Personalization
          </label>
        </div>
        
        <div className="consent-actions">
          <button onClick={handleRejectAll} disabled={isLoading}>
            Reject All
          </button>
          <button onClick={onCustomize}>
            Customize
          </button>
          <button onClick={handleAcceptAll} disabled={isLoading}>
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Script Loading Status Component
```typescript
import React from 'react';
import { useScriptManager } from './consent-manager-provider';

export function ScriptLoadingStatus() {
  const { scripts, isLoading, error } = useScriptManager();

  if (isLoading) {
    return (
      <div className="script-loading">
        <div className="loading-spinner" />
        <span>Loading analytics scripts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="script-error">
        <span>⚠️ Failed to load some analytics scripts: {error}</span>
      </div>
    );
  }

  return (
    <div className="script-status">
      <span>✅ {scripts.length} analytics scripts loaded</span>
    </div>
  );
}
```

### Error Handling
```typescript
// Error types for script management
export class ScriptLoadingError extends Error {
  constructor(
    message: string,
    public scriptName: string,
    public scriptType: string
  ) {
    super(message);
    this.name = 'ScriptLoadingError';
  }
}

export class ScriptFetchError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ScriptFetchError';
  }
}

// Error boundary for script errors
export class ScriptErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Script error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="script-error-boundary">
          <h3>Script Loading Error</h3>
          <p>There was an error loading analytics scripts.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Performance Optimizations
```typescript
// Script caching and deduplication
class ScriptCache {
  private cache = new Map<string, { script: Script; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  get(consent: AnalyticsConsent): Script[] | null {
    const key = this.getCacheKey(consent);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.script;
    }
    
    return null;
  }

  set(consent: AnalyticsConsent, scripts: Script[]): void {
    const key = this.getCacheKey(consent);
    this.cache.set(key, { script: scripts, timestamp: Date.now() });
  }

  private getCacheKey(consent: AnalyticsConsent): string {
    return JSON.stringify(consent);
  }
}

// Debounced script loading
function useDebouncedScriptLoading(delay: number = 300) {
  const [debouncedConsent, setDebouncedConsent] = useState<AnalyticsConsent | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConsent(debouncedConsent);
    }, delay);

    return () => clearTimeout(timer);
  }, [debouncedConsent, delay]);

  return debouncedConsent;
}
```

## 🧪 Testing Requirements
- Unit tests for ConsentManagerProvider updates
- Integration tests with scripts endpoint
- Script loading/unloading tests
- Error handling tests
- Loading state tests
- Consent change tests
- Script caching tests
- Performance tests

## 🔍 Definition of Done
- [ ] ConsentManagerProvider fetches scripts dynamically
- [ ] Scripts loaded/unloaded based on consent changes
- [ ] Error handling for script failures
- [ ] Loading states implemented
- [ ] Unit tests for script management
- [ ] Integration tests with real scripts
- [ ] Code review completed

## 📚 Related Documentation
- [Analytics Frontend Integration](../docs/analytics-frontend-integration.md)
- [Universal Destinations](../docs/analytics-universal-destinations.md)

## 🔗 Dependencies
- [2.1: Universal Destination Interface](./07-universal-destination-interface.md) ✅
- [2.2: Scripts Endpoint](./08-scripts-endpoint.md) ✅
- [2.3: Meta Pixel Universal Destination](./09-meta-pixel-universal.md) ✅
- [2.4: Google Analytics Universal Destination](./10-google-analytics-universal.md) ✅

## 🚀 Next Phase
[Phase 3: Advanced Features](./22-event-queue-offline-support.md)

## 🎯 Phase 2 Complete
Once this ticket is done, Phase 2 is complete! You should have:
- ✅ Universal destinations working with both server-side events and client-side scripts
- ✅ Meta Pixel + Google Analytics working end-to-end
- ✅ Frontend integration updated
- ✅ All tests passing
