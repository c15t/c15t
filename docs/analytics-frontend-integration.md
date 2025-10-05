# Frontend Integration: Unified Consent Flow

## The Problem: Two Separate Paths

**Current architecture (❌ Duplicate logic):**

```
User clicks "Accept All" in cookie banner
    ↓
Two separate API calls:
    ├─→ POST /consent/set (consent management)
    └─→ POST /analytics/process (if analytics enabled)

Problem: Duplicate logic, can get out of sync
```

**New architecture (✅ Unified):**

```
User clicks "Accept All" in cookie banner
    ↓
ONE API call:
    └─→ POST /analytics/process with consent event
        ↓
        Backend automatically:
        ├─→ Sends to analytics destinations
        ├─→ Calls POST /consent/set internally
        └─→ Updates consent state
        
Result: Single source of truth, no duplication
```

## Migration Strategy

### Phase 1: Add Analytics Consent Path (New)

Keep old path working, add new analytics path in parallel.

### Phase 2: Deprecate Old Path

Mark `saveConsents()` and direct `/consent/set` calls as deprecated.

### Phase 3: Remove Old Path

Remove deprecated code after migration period.

## Implementation

### 1. Update Analytics Utils

```typescript
// packages/core/src/analytics/utils.ts

import type { AllConsentNames } from '../types/gdpr';
import type { AnalyticsConsent, ConsentEvent } from './types';

/**
 * Create a consent event from cookie banner interaction
 * This replaces the old saveConsents() → POST /consent/set flow
 * 
 * @param preferences - User's consent preferences
 * @param action - What happened to consent
 * @param source - Where consent came from
 * @returns Consent event ready to send to analytics
 * 
 * @example
 * ```typescript
 * // User clicks "Accept All"
 * const consentEvent = createConsentEvent(
 *   { necessary: true, measurement: true, marketing: true, ... },
 *   'granted',
 *   'cookie_banner'
 * );
 * 
 * // Send via analytics (replaces old manager.setConsent())
 * await analytics.consent(consentEvent);
 * ```
 */
export function createConsentEvent(
	preferences: Record<AllConsentNames, boolean>,
	action: 'granted' | 'updated' | 'revoked',
	source: 'cookie_banner' | 'preferences_page' | 'api' = 'cookie_banner'
): ConsentEvent {
	return {
		type: 'consent',
		consentType: 'cookie_banner',
		action,
		preferences,
		domain: typeof window !== 'undefined' ? window.location.hostname : '',
		source,
		subjectId: undefined, // Set by backend from session
		externalSubjectId: undefined, // Set by backend if available
		metadata: {
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
			timestamp: new Date().toISOString(),
			url: typeof window !== 'undefined' ? window.location.href : '',
		},
	};
}

/**
 * Update analytics methods to include consent tracking
 */
export function createAnalyticsMethods(
	queue: EventQueue,
	state: () => AnalyticsState
) {
	return {
		/**
		 * Track a custom event
		 */
		track: async (name: string, properties?: Record<string, unknown>) => {
			// ... existing track implementation
		},
		
		/**
		 * Track a page view
		 */
		page: async (name?: string, properties?: Record<string, unknown>) => {
			// ... existing page implementation
		},
		
		/**
		 * Identify a user
		 */
		identify: async (traits?: Record<string, unknown>) => {
			// ... existing identify implementation
		},
		
		/**
		 * NEW: Update consent preferences
		 * This replaces the old manager.setConsent() call
		 * 
		 * @param preferences - User's consent preferences
		 * @param action - What happened to consent
		 * 
		 * @example
		 * ```typescript
		 * // User clicks "Accept All"
		 * await analytics.consent(
		 *   { necessary: true, measurement: true, marketing: true, functionality: true, experience: true },
		 *   'granted'
		 * );
		 * 
		 * // User revokes marketing consent
		 * await analytics.consent(
		 *   { ...currentConsent, marketing: false },
		 *   'updated'
		 * );
		 * ```
		 */
		consent: async (
			preferences: Record<AllConsentNames, boolean>,
			action: 'granted' | 'updated' | 'revoked' = 'updated'
		) => {
			// Create consent event
			const consentEvent = createConsentEvent(preferences, action, 'cookie_banner');
			
			// Update local consent state immediately (optimistic update)
			const newState = state();
			newState.consent = createAnalyticsConsent(preferences);
			
			// Queue consent event (will be sent with next batch)
			const fullEvent: AnalyticsEvent = {
				...consentEvent,
				anonymousId: newState.anonymousId,
				sessionId: newState.sessionId,
				timestamp: new Date().toISOString(),
				messageId: generateMessageId(),
				context: {
					page: {
						path: typeof window !== 'undefined' ? window.location.pathname : '',
						title: typeof window !== 'undefined' ? document.title : '',
						url: typeof window !== 'undefined' ? window.location.href : '',
					},
					userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
				},
			};
			
			queue.add(fullEvent);
			
			// Flush immediately (consent changes should be sent ASAP)
			await queue.flush();
		},
	};
}
```

### 2. Update Store to Use Analytics Consent

```typescript
// packages/core/src/store.ts

export const createConsentManagerStore = (
	manager: ConsentManagerInterface,
	options: StoreOptions = {}
) => {
	// ... existing setup
	
	const store = createStore<PrivacyConsentState>((set, get) => ({
		// ... existing state
		
		/**
		 * NEW: Save consents via analytics
		 * This replaces the old flow that called manager.setConsent() directly
		 */
		saveConsents: async (type: 'all' | 'custom' | 'necessary') => {
			const {
				callbacks,
				selectedConsents,
				consents,
				consentTypes,
				updateScripts,
				updateIframeConsents,
				analytics,
			} = get();
			
			const newConsents = selectedConsents ?? consents ?? {};
			
			// Determine which consents to grant
			if (type === 'all') {
				for (const consent of consentTypes) {
					newConsents[consent.name] = true;
				}
			} else if (type === 'necessary') {
				for (const consent of consentTypes) {
					newConsents[consent.name] = consent.name === 'necessary';
				}
			}
			
			const consentInfo = {
				time: Date.now(),
				type: type as 'necessary' | 'all' | 'custom',
			};
			
			// Immediately update UI state (optimistic update)
			set({
				consents: newConsents,
				selectedConsents: newConsents,
				showPopup: false,
				consentInfo,
			});
			
			// Yield to let UI update
			await new Promise<void>((resolve) => setTimeout(resolve, 0));
			
			// Update tracking blocker and scripts
			trackingBlocker?.updateConsents(newConsents);
			updateIframeConsents();
			updateGTMConsent(newConsents);
			updateScripts();
			
			// Save to localStorage
			try {
				localStorage.setItem(
					STORAGE_KEY,
					JSON.stringify({
						consents: newConsents,
						consentInfo,
					})
				);
			} catch (e) {
				console.warn('Failed to persist consents to localStorage:', e);
			}
			
			// Call callback
			callbacks.onConsentSet?.({
				preferences: newConsents,
			});
			
			// NEW: Send consent via analytics instead of direct API call
			if (analytics && analytics.enabled) {
				try {
					await analytics.consent(
						newConsents,
						type === 'all' || type === 'custom' ? 'granted' : 'updated'
					);
					
					// Success! Consent saved via analytics
					// Backend will handle:
					// 1. Sending to analytics destinations
					// 2. Calling POST /consent/set internally
					// 3. Recording in compliance database
				} catch (error) {
					console.error('Failed to save consent via analytics:', error);
					
					// FALLBACK: Use old path if analytics fails
					// This ensures consent is still saved even if analytics is down
					await manager.setConsent({
						body: {
							type: 'cookie_banner',
							domain: window.location.hostname,
							preferences: newConsents,
							metadata: {
								source: 'consent_widget',
								acceptanceMethod: type,
								fallback: true, // Indicate this is fallback
							},
						},
					});
				}
			} else {
				// Analytics not enabled, use old path
				// (For backwards compatibility during migration)
				await manager.setConsent({
					body: {
						type: 'cookie_banner',
						domain: window.location.hostname,
						preferences: newConsents,
						metadata: {
							source: 'consent_widget',
							acceptanceMethod: type,
						},
					},
				});
			}
		},
		
		/**
		 * DEPRECATED: Old setConsent method
		 * Use analytics.consent() instead
		 * 
		 * @deprecated Will be removed in v2.0.0. Use analytics.consent() instead.
		 */
		setConsent: (name, value) => {
			console.warn(
				'[c15t] setConsent() is deprecated. Use analytics.consent() instead. ' +
				'See https://c15t.com/docs/migration/analytics-consent'
			);
			
			set((state) => {
				const consentType = state.consentTypes.find(
					(type) => type.name === name
				);
				
				if (consentType?.disabled) {
					return state;
				}
				
				const newConsents = { ...state.consents, [name]: value };
				const analyticsConsent = updateAnalyticsConsentFromGdpr(newConsents);
				
				return {
					selectedConsents: newConsents,
					analytics: { ...state.analytics, consent: analyticsConsent },
				};
			});
			
			// Use new analytics path
			const analytics = get().analytics;
			if (analytics && analytics.enabled) {
				analytics.consent(get().selectedConsents, 'updated');
			} else {
				// Fallback to old path
				get().saveConsents('custom');
			}
		},
	}));
	
	return store;
};
```

### 3. Update Backend to Handle Consent Events

```typescript
// packages/backend/src/v2/handlers/analytics/process.handler.ts

import { postConsentContract } from '../consent/post.contract';

export async function processAnalyticsEvents(
	input: { events: AnalyticsEvent[]; consent: AnalyticsConsent },
	context: C15TContext
) {
	const results = [];
	
	for (const event of input.events) {
		// Special handling for consent events
		if (event.type === 'consent') {
			// 1. Send to analytics destinations (for tracking)
			await context.destinationManager?.processEvent(event, {
				...event,
				consent: input.consent,
			});
			
			// 2. Save to consent management system (for compliance)
			try {
				await context.registry.consent.set({
					body: {
						type: event.consentType,
						domain: event.domain,
						subjectId: event.subjectId,
						externalSubjectId: event.externalSubjectId,
						preferences: event.preferences,
						policyId: event.policyId,
						metadata: {
							...event.metadata,
							source: 'analytics_event',
							analyticsEventId: event.messageId,
						},
					},
				});
				
				results.push({
					eventId: event.messageId,
					status: 'processed',
					destination: 'consent-management',
				});
			} catch (error) {
				context.logger.error('Failed to save consent via /consent/set:', error);
				results.push({
					eventId: event.messageId,
					status: 'error',
					destination: 'consent-management',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		} else {
			// Normal event processing
			await context.destinationManager?.processEvent(event, {
				...event,
				consent: input.consent,
			});
			
			results.push({
				eventId: event.messageId,
				status: 'processed',
			});
		}
	}
	
	return {
		success: true,
		processed: results.filter(r => r.status === 'processed').length,
		filtered: 0,
		errors: results.filter(r => r.status === 'error').length,
		results,
		processedAt: new Date().toISOString(),
	};
}
```

## Migration Guide

### Old Flow (Deprecated)

```typescript
// packages/core/src/libs/save-consents.ts (OLD)

export async function saveConsents({ manager, type, get, set }) {
	const newConsents = /* ... */;
	
	// Update UI
	set({ consents: newConsents });
	
	// Direct API call to /consent/set (❌ DEPRECATED)
	await manager.setConsent({
		body: {
			type: 'cookie_banner',
			domain: window.location.hostname,
			preferences: newConsents,
		},
	});
}
```

### New Flow (Recommended)

```typescript
// packages/core/src/libs/save-consents.ts (NEW)

export async function saveConsents({ manager, type, get, set, analytics }) {
	const newConsents = /* ... */;
	
	// Update UI
	set({ consents: newConsents });
	
	// Use analytics consent event (✅ NEW WAY)
	if (analytics && analytics.enabled) {
		await analytics.consent(newConsents, 'granted');
		// Backend will:
		// 1. Send to analytics destinations
		// 2. Call /consent/set internally
		// 3. Return success
	} else {
		// Fallback to old path if analytics not enabled
		await manager.setConsent({
			body: {
				type: 'cookie_banner',
				domain: window.location.hostname,
				preferences: newConsents,
			},
		});
	}
}
```

## Frontend Usage

### React Integration

```tsx
// app/components/cookie-banner.tsx

'use client';

import { useConsentManager } from '@c15t/react';

export function CookieBanner() {
	const { consent, analytics, saveConsents } = useConsentManager();
	
	const handleAcceptAll = async () => {
		// OLD WAY (deprecated):
		// await saveConsents('all');  // Calls POST /consent/set directly
		
		// NEW WAY (recommended):
		await analytics.consent({
			necessary: true,
			measurement: true,
			marketing: true,
			functionality: true,
			experience: true,
		}, 'granted');
		
		// Or use the wrapper (does the same thing):
		await saveConsents('all');  // Now uses analytics.consent() internally
	};
	
	const handleAcceptNecessary = async () => {
		await analytics.consent({
			necessary: true,
			measurement: false,
			marketing: false,
			functionality: false,
			experience: false,
		}, 'granted');
	};
	
	const handleAcceptCustom = async () => {
		// User selected specific consents
		await analytics.consent(consent, 'granted');
	};
	
	return (
		<div className="cookie-banner">
			<p>We use cookies...</p>
			<button onClick={handleAcceptAll}>Accept All</button>
			<button onClick={handleAcceptNecessary}>Necessary Only</button>
			<button onClick={handleAcceptCustom}>Save Preferences</button>
		</div>
	);
}
```

### Next.js Integration

```tsx
// app/layout.tsx

import { ConsentManagerProvider } from '@c15t/react';

export default function RootLayout({ children }) {
	return (
		<ConsentManagerProvider
			options={{
				backendUrl: '/api/c15t',
				// Enable analytics (activates new consent flow)
				analytics: {
					enabled: true,
					uploadUrl: '/api/c15t/analytics/process',
					debug: process.env.NODE_ENV === 'development',
					queueConfig: {
						maxBatchSize: 50,
						debounceInterval: 300,
					},
				},
			}}
		>
			{children}
		</ConsentManagerProvider>
	);
}
```

### Vanilla JavaScript Integration

```javascript
// app.js

import { createConsentManager } from '@c15t/core';

const manager = createConsentManager({
	backendUrl: 'https://api.example.com/c15t',
	analytics: {
		enabled: true,
		uploadUrl: 'https://api.example.com/c15t/analytics/process',
	},
});

// Get store
const store = manager.getStore();

// Subscribe to consent changes
store.subscribe((state) => {
	console.log('Consent updated:', state.consents);
});

// User clicks "Accept All"
document.getElementById('accept-all').addEventListener('click', async () => {
	// NEW WAY: Via analytics
	await store.analytics.consent({
		necessary: true,
		measurement: true,
		marketing: true,
		functionality: true,
		experience: true,
	}, 'granted');
	
	// Banner automatically closes
	// Consent saved to backend
	// Scripts load based on consent
});
```

## Backwards Compatibility

### Graceful Degradation

```typescript
// packages/core/src/libs/save-consents.ts

export async function saveConsents(props: SaveConsentsProps) {
	const { analytics } = get();
	
	// Determine consent action
	const action = type === 'all' || type === 'custom' ? 'granted' : 'updated';
	
	// Try new analytics path first
	if (analytics?.enabled && analytics.consent) {
		try {
			await analytics.consent(newConsents, action);
			// Success! Used new path
			return;
		} catch (error) {
			console.warn('[c15t] Analytics consent failed, falling back to direct API:', error);
			// Fall through to old path
		}
	}
	
	// Fallback: Use old direct API call
	await manager.setConsent({
		body: {
			type: 'cookie_banner',
			domain: window.location.hostname,
			preferences: newConsents,
			metadata: {
				source: 'consent_widget',
				acceptanceMethod: type,
				// Indicate this is fallback (for debugging)
				analyticsDisabled: !analytics?.enabled,
			},
		},
	});
}
```

### Feature Flag

```typescript
// packages/core/src/store.ts

export interface StoreOptions {
	// ... existing options
	
	/**
	 * Use analytics path for consent saving
	 * @default true
	 * @deprecated Will be removed in v2.0.0 (always true)
	 */
	useAnalyticsConsent?: boolean;
}

// In saveConsents():
const useAnalytics = options.useAnalyticsConsent ?? true;

if (useAnalytics && analytics?.enabled) {
	await analytics.consent(newConsents, action);
} else {
	await manager.setConsent({ /* old path */ });
}
```

## Backend: Dual Write During Migration

```typescript
// packages/backend/src/v2/handlers/analytics/process.handler.ts

/**
 * Process consent events
 */
async function processConsentEvent(
	event: ConsentEvent,
	context: C15TContext
) {
	const results = [];
	
	// 1. Send to analytics destinations
	try {
		await context.destinationManager?.processEvent(event, {
			consent: event.preferences,
			// ... other context
		});
		
		results.push({
			destination: 'analytics',
			status: 'success',
		});
	} catch (error) {
		context.logger.error('Failed to send consent event to analytics:', error);
		results.push({
			destination: 'analytics',
			status: 'error',
			error: error instanceof Error ? error.message : String(error),
		});
	}
	
	// 2. Save to consent management system
	try {
		const consentRecord = await context.registry.consent.set({
			body: {
				type: event.consentType,
				domain: event.domain,
				subjectId: event.subjectId,
				externalSubjectId: event.externalSubjectId,
				preferences: event.preferences,
				policyId: event.policyId,
				metadata: {
					...event.metadata,
					source: 'analytics_event',
					analyticsEventId: event.messageId,
				},
			},
		});
		
		results.push({
			destination: 'consent-management',
			status: 'success',
			recordId: consentRecord.recordId,
		});
	} catch (error) {
		context.logger.error('Failed to save consent to database:', error);
		results.push({
			destination: 'consent-management',
			status: 'error',
			error: error instanceof Error ? error.message : String(error),
		});
		
		// IMPORTANT: Even if consent DB save fails, don't fail the whole request
		// Analytics destinations already received the event
		// Can retry consent DB save later
	}
	
	return {
		eventId: event.messageId,
		status: results.every(r => r.status === 'success') ? 'success' : 'partial',
		results,
	};
}
```

## Testing Strategy

### Phase 1: Dual Write (Validate Parity)

```typescript
// Send consent via BOTH paths, compare results

async function saveConsents_TESTING(newConsents) {
	// Old path
	const oldResult = await manager.setConsent({
		body: {
			type: 'cookie_banner',
			preferences: newConsents,
		}
	});
	
	// New path
	const newResult = await analytics.consent(newConsents, 'granted');
	
	// Compare results
	if (oldResult.data.id !== newResult.data.id) {
		console.error('[TEST] Consent IDs do not match!', { oldResult, newResult });
	}
	
	console.log('[TEST] Both paths successful ✓');
}
```

### Phase 2: Switch to Analytics (Monitor Errors)

```typescript
async function saveConsents(newConsents) {
	try {
		// Use new analytics path
		await analytics.consent(newConsents, 'granted');
	} catch (error) {
		// Log error but don't block user
		console.error('[c15t] Analytics consent failed:', error);
		
		// Fallback to old path
		await manager.setConsent({ /* ... */ });
		
		// Report to monitoring
		reportError('analytics_consent_failed', error);
	}
}
```

### Phase 3: Remove Old Path

```typescript
async function saveConsents(newConsents) {
	// Only analytics path, no fallback
	await analytics.consent(newConsents, 'granted');
	
	// Old manager.setConsent() removed
}
```

## Benefits of Unified Flow

### 1. Single Source of Truth
```
Before: Two ways to save consent
  ├─ POST /consent/set (consent management)
  └─ POST /analytics/process (analytics)

After: One way
  └─ POST /analytics/process (does both)
      ├─→ Analytics destinations
      └─→ Consent management (internal)
```

### 2. Automatic Analytics Tracking
```
Before: Consent changes not tracked in analytics
After: Every consent change is an analytics event
  → See consent funnel in PostHog
  → Track "Accept All" conversion rate
  → Monitor consent revocations
```

### 3. Guaranteed Consistency
```
Before: Consent DB and analytics can get out of sync
After: Impossible - same event updates both
```

### 4. Better Error Handling
```
Before: If /consent/set fails, user sees error
After: If analytics fails, backend still saves consent
  → Better UX (user doesn't see errors)
  → Retry logic for analytics
  → Consent always saved
```

## Deprecation Timeline

### Month 1: Add Analytics Path (Non-Breaking)
- ✅ Add `analytics.consent()` method
- ✅ Update `saveConsents()` to try analytics first
- ✅ Keep old path as fallback
- ✅ Add feature flag `useAnalyticsConsent`

### Month 2-3: Encourage Migration
- ✅ Add deprecation warnings to console
- ✅ Update documentation
- ✅ Show migration examples
- ✅ Collect metrics on old vs new path usage

### Month 4: Make Analytics Path Default
- ✅ Change default to `useAnalyticsConsent: true`
- ✅ Old path only used if analytics disabled
- ✅ Add prominent warnings for old path usage

### Month 5-6: Remove Old Path
- ✅ Remove `useAnalyticsConsent` flag (always true)
- ✅ Remove fallback to direct `/consent/set`
- ✅ Update to v2.0.0 (breaking change)

## Migration Checklist

### For c15t Core Package
- [ ] Add `createConsentEvent()` utility
- [ ] Add `consent()` method to analytics
- [ ] Update `saveConsents()` to use analytics path
- [ ] Add deprecation warnings to old methods
- [ ] Add `useAnalyticsConsent` feature flag
- [ ] Update TypeScript types
- [ ] Write migration guide
- [ ] Add tests for new flow

### For c15t Backend
- [ ] Update analytics process handler to handle consent events
- [ ] Add internal call to `/consent/set` for consent events
- [ ] Add error handling (analytics fails but consent saves)
- [ ] Add logging for consent event processing
- [ ] Update contracts to include consent event type
- [ ] Write tests for consent event flow

### For Documentation
- [ ] Document new analytics.consent() API
- [ ] Explain deprecation of old flow
- [ ] Provide migration examples
- [ ] Update all examples to use new flow
- [ ] Add troubleshooting guide

## Example: Complete Integration

### Frontend

```tsx
// app/layout.tsx

'use client';

import { ConsentManagerProvider } from '@c15t/react';
import { useEffect } from 'react';

export function RootLayout({ children }) {
	return (
		<ConsentManagerProvider
			options={{
				backendUrl: '/api/c15t',
				// Enable analytics (activates unified consent flow)
				analytics: {
					enabled: true,
					uploadUrl: '/api/c15t/analytics/process',
				},
				// Opt into new flow (will be default in v2.0)
				useAnalyticsConsent: true,
			}}
		>
			<CookieBanner />
			{children}
		</ConsentManagerProvider>
	);
}

function CookieBanner() {
	const { showPopup, analytics, consents } = useConsentManager();
	
	if (!showPopup) return null;
	
	return (
		<div className="cookie-banner">
			<h3>Cookie Preferences</h3>
			<p>We use cookies to improve your experience...</p>
			
			<button
				onClick={async () => {
					// Unified consent flow via analytics
					await analytics.consent({
						necessary: true,
						measurement: true,
						marketing: true,
						functionality: true,
						experience: true,
					}, 'granted');
					
					// Banner automatically closes
					// Consent automatically saved to DB
					// Analytics automatically track the event
					// Scripts automatically load
				}}
			>
				Accept All
			</button>
			
			<button
				onClick={async () => {
					await analytics.consent({
						necessary: true,
						measurement: false,
						marketing: false,
						functionality: false,
						experience: false,
					}, 'granted');
				}}
			>
				Necessary Only
			</button>
		</div>
	);
}
```

### Backend

```typescript
// examples/cloudflare-worker/src/index.ts

import { c15tInstance } from '@c15t/backend/v2';
import { posthog, metaPixel } from '@c15t/destinations';

const instance = c15tInstance({
	adapter: kyselyAdapter({ /* ... */ }),
	trustedOrigins: ['https://example.com'],
	analytics: {
		destinations: [
			posthog({ apiKey: env.POSTHOG_KEY }),
			metaPixel({ 
				pixelId: env.META_PIXEL_ID,
				accessToken: env.META_ACCESS_TOKEN 
			}),
		],
	},
});

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// When POST /analytics/process receives consent event:
		// 1. Sends to PostHog (tracks "Consent Granted" event)
		// 2. Sends to Meta Pixel (tracks consent for attribution)
		// 3. Calls POST /consent/set internally (saves to DB)
		// 4. Returns success
		
		return await instance.handler(request);
	},
};
```

## Monitoring & Rollback

### Success Metrics

```typescript
// Monitor both paths during migration

interface ConsentMetrics {
	analyticsPath: {
		attempts: number;
		successes: number;
		failures: number;
	};
	oldPath: {
		attempts: number;
		successes: number;
		failures: number;
	};
	fallbacks: number; // Analytics failed, used old path
}

// Goal: 
// Week 1: 10% analytics path
// Week 2: 50% analytics path
// Week 3: 90% analytics path
// Week 4: 100% analytics path, remove old path
```

### Instant Rollback

```typescript
// If analytics path has issues, instant rollback via feature flag

// Option 1: Environment variable
DISABLE_ANALYTICS_CONSENT=true

// Option 2: Runtime flag (via admin UI)
await fetch('/api/admin/feature-flags', {
	method: 'POST',
	body: JSON.stringify({
		flag: 'use_analytics_consent',
		enabled: false  // ← Rollback
	})
});

// Option 3: Code change (1 line)
analytics: {
	enabled: false  // ← Disables analytics consent path
}
```

## Summary

### Problem Solved

**Before**: Two separate paths for saving consent
1. Cookie banner → `saveConsents()` → `POST /consent/set`
2. (Optional) Separate analytics call

**After**: One unified path
1. Cookie banner → `analytics.consent()` → `POST /analytics/process`
   - Backend sends to analytics destinations
   - Backend calls `/consent/set` internally
   - One event, two outcomes

### Benefits

- ✅ **Single source of truth**: One way to save consent
- ✅ **No duplication**: Logic only in one place
- ✅ **Automatic tracking**: Consent changes are analytics events
- ✅ **Better insights**: See consent funnel in analytics
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Backwards compatible**: Old path still works during migration
- ✅ **Graceful degradation**: Falls back if analytics fails
- ✅ **Easy rollback**: Feature flag to disable new path

### Migration Path

1. **Week 1-2**: Add analytics path, keep old path as fallback
2. **Week 3-4**: Make analytics path default, monitor metrics
3. **Week 5-6**: Remove old path (v2.0.0 breaking change)

---

**This unifies c15t's consent and analytics systems into one cohesive flow!** 🎯
