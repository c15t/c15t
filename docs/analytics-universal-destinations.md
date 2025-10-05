# Universal Destinations: Server + Client Scripts

## The Problem

Many analytics destinations need **BOTH** a server-side handler AND a client-side script:

- **Meta Pixel**: Backend Conversions API + Frontend pixel script
- **Google Analytics**: Backend Measurement Protocol + Frontend gtag.js
- **TikTok Pixel**: Backend Events API + Frontend pixel script
- **LinkedIn**: Backend Conversions API + Frontend insight tag

**Current problem**: These are configured separately:
- `@c15t/destinations` for backend handlers
- `@c15t/scripts` for frontend scripts

**Desired solution**: **Single configuration controls both**, with full type safety.

## The Solution: Universal Destination Protocol

### Architecture

```typescript
/**
 * Universal destination extends DestinationPlugin
 * with optional client-side script generation
 */
export interface UniversalDestinationPlugin<TSettings = Record<string, unknown>>
	extends DestinationPlugin<TSettings> {
	/**
	 * Optional: Generate client-side script configuration
	 * If provided, this destination has both server and client components
	 * 
	 * @param settings - Validated destination settings
	 * @param consent - Current consent state
	 * @returns Script configuration for c15t script loader
	 */
	generateScript?(
		settings: TSettings,
		consent: AnalyticsConsent
	): Script | Script[] | null;
	
	/**
	 * Optional: Script category for consent-based loading
	 * If not provided, inferred from requiredConsent
	 */
	readonly scriptCategory?: AllConsentNames;
}

/**
 * Script configuration from c15t
 */
export interface Script {
	id: string;
	category: AllConsentNames;
	src?: string;
	textContent?: string;
	async?: boolean;
	defer?: boolean;
	callbackOnly?: boolean;
	persistAfterConsentRevoked?: boolean;
	onBeforeLoad?: (payload: ScriptPayload) => void;
	onConsentChange?: (args: ConsentChangeArgs) => void;
	onDelete?: (payload: ScriptPayload) => void;
}
```

## Implementation Pattern

### 1. Backend Package (Protocol)

```typescript
// packages/backend/src/v2/handlers/analytics/destination-plugin.ts

import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { Script } from 'c15t';

export interface UniversalDestinationPlugin<TSettings = Record<string, unknown>>
	extends DestinationPlugin<TSettings> {
	/**
	 * Generate client-side script for this destination
	 * Return null if script shouldn't be loaded (based on consent/settings)
	 */
	generateScript?(
		settings: TSettings,
		consent: AnalyticsConsent
	): Script | Script[] | null;
}
```

### 2. Destinations Package (Implementation)

```typescript
// packages/destinations/src/meta-pixel/index.ts

import { z } from 'zod';
import type { 
	UniversalDestinationPlugin,
	TrackEvent,
	EventContext,
	Script 
} from '@c15t/backend/v2/types';

/**
 * Meta Pixel settings
 */
export const MetaPixelSettingsSchema = z.object({
	pixelId: z.string().min(1, 'Pixel ID is required'),
	accessToken: z.string().optional(), // For Conversions API
	testEventCode: z.string().optional(), // For testing
});

export type MetaPixelSettings = z.infer<typeof MetaPixelSettingsSchema>;

/**
 * Meta Pixel destination - supports BOTH server and client
 */
class MetaPixelDestination implements UniversalDestinationPlugin<MetaPixelSettings> {
	readonly type = 'meta-pixel';
	readonly version = '1.0.0';
	readonly gdprCompliant = true;
	readonly settingsSchema = MetaPixelSettingsSchema;
	readonly requiredConsent = ['marketing'] as const;
	readonly scriptCategory = 'marketing';
	
	private settings!: MetaPixelSettings;
	
	async initialize(settings: MetaPixelSettings): Promise<void> {
		this.settings = this.settingsSchema.parse(settings);
	}
	
	async testConnection(): Promise<boolean> {
		if (!this.settings.accessToken) {
			return false; // Need access token for server-side API
		}
		
		// Test Meta Conversions API
		const response = await fetch(
			`https://graph.facebook.com/v18.0/${this.settings.pixelId}/events`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					data: [],
					test_event_code: this.settings.testEventCode,
					access_token: this.settings.accessToken,
				}),
			}
		);
		
		return response.ok;
	}
	
	/**
	 * Server-side: Send event via Conversions API
	 */
	async track(event: TrackEvent, context: EventContext): Promise<void> {
		if (!this.settings.accessToken) {
			console.log('[meta-pixel] Skipping server-side (no access token)');
			return;
		}
		
		// Map c15t event to Meta event
		const metaEvent = {
			event_name: event.name,
			event_time: Math.floor(new Date(context.timestamp).getTime() / 1000),
			action_source: 'website',
			event_source_url: context.page?.url,
			user_data: {
				client_ip_address: context.ip,
				client_user_agent: context.userAgent,
				fbc: context.cookies?.['_fbc'],
				fbp: context.cookies?.['_fbp'],
				external_id: context.userId,
			},
			custom_data: event.properties,
		};
		
		// Send to Meta Conversions API
		await fetch(
			`https://graph.facebook.com/v18.0/${this.settings.pixelId}/events`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					data: [metaEvent],
					test_event_code: this.settings.testEventCode,
					access_token: this.settings.accessToken,
				}),
			}
		);
	}
	
	/**
	 * Client-side: Generate Meta Pixel script
	 * This is loaded in the browser via c15t script loader
	 */
	generateScript(
		settings: MetaPixelSettings,
		consent: AnalyticsConsent
	): Script | null {
		// Only load script if marketing consent granted
		if (!consent.marketing) {
			return null;
		}
		
		return {
			id: 'meta-pixel',
			category: 'marketing',
			textContent: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('consent', 'grant');
fbq('init', '${settings.pixelId}');
fbq('track', 'PageView');
			`.trim(),
			persistAfterConsentRevoked: true,
			onDelete: () => {
				if (window.fbq) {
					window.fbq('consent', 'revoke');
				}
			},
		};
	}
}

/**
 * Factory and builder exports
 */
export const metaPixelDestination: DestinationFactory<MetaPixelSettings> = 
	async (settings) => {
		const dest = new MetaPixelDestination();
		await dest.initialize(settings);
		return dest;
	};

export function metaPixel(
	settings: MetaPixelSettings,
	enabled = true
): DestinationConfig<MetaPixelSettings> {
	return createDestinationConfig('meta-pixel', settings, enabled);
}
```

## Usage: Universal Configuration

### Single Config for Server + Client

```typescript
// app/server.ts (Backend)
import { c15tInstance } from '@c15t/backend/v2';
import { metaPixel, googleAnalytics, posthog } from '@c15t/destinations';

const instance = c15tInstance({
	analytics: {
		destinations: [
			// Meta Pixel: Server-side Conversions API + Client-side pixel
			metaPixel({
				pixelId: env.META_PIXEL_ID,
				accessToken: env.META_ACCESS_TOKEN,  // For server-side
			}),
			
			// Google Analytics: Server-side + Client-side gtag.js
			googleAnalytics({
				measurementId: env.GA_MEASUREMENT_ID,
				apiSecret: env.GA_API_SECRET,  // For server-side
			}),
			
			// PostHog: Server-side only (no client script needed)
			posthog({
				apiKey: env.POSTHOG_KEY,
			}),
		]
	}
});

// Export scripts for frontend
export const analyticsScripts = instance.getClientScripts();
```

```typescript
// app/layout.tsx (Frontend)
'use client';

import { ConsentManagerProvider } from '@c15t/react';
import { analyticsScripts } from './server';

export function RootLayout({ children }) {
	return (
		<ConsentManagerProvider
			options={{
				backendUrl: '/api/c15t',
				// Scripts automatically loaded based on consent!
				scripts: analyticsScripts,
			}}
		>
			{children}
		</ConsentManagerProvider>
	);
}
```

**Result**: 
- ✅ Single source of truth (one config)
- ✅ Server-side events sent to Meta Conversions API
- ✅ Client-side pixel loaded automatically (if marketing consent)
- ✅ Both controlled by same consent state
- ✅ Type-safe configuration

## Script Generation API

### Backend: Generate Scripts Endpoint

```typescript
// packages/backend/src/v2/handlers/analytics/scripts.handler.ts

import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Contract for getting client scripts based on consent
 */
export const getScriptsContract = oc
	.route({
		method: 'GET',
		path: '/analytics/scripts',
		description: 'Get client-side scripts for configured destinations based on consent',
		tags: ['analytics', 'scripts'],
	})
	.input(
		z.object({
			consent: z.object({
				necessary: z.boolean(),
				measurement: z.boolean(),
				marketing: z.boolean(),
				functionality: z.boolean(),
				experience: z.boolean(),
			}),
		})
	)
	.output(
		z.object({
			scripts: z.array(
				z.object({
					id: z.string(),
					category: z.enum(['necessary', 'measurement', 'marketing', 'functionality', 'experience']),
					src: z.string().optional(),
					textContent: z.string().optional(),
					async: z.boolean().optional(),
					defer: z.boolean().optional(),
				})
			),
		})
	);

/**
 * Handler: Generate scripts from configured destinations
 */
export async function getScripts(
	input: { consent: AnalyticsConsent },
	context: C15TContext
): Promise<{ scripts: Script[] }> {
	const scripts: Script[] = [];
	
	if (!context.destinationManager) {
		return { scripts };
	}
	
	// Get all configured destinations
	const destinations = context.destinationManager.getDestinations();
	
	for (const [type, destination] of destinations) {
		// Check if destination supports client scripts
		if ('generateScript' in destination && destination.generateScript) {
			const universalDest = destination as UniversalDestinationPlugin;
			
			try {
				const script = await universalDest.generateScript(
					destination.settings,
					input.consent
				);
				
				if (script) {
					if (Array.isArray(script)) {
						scripts.push(...script);
					} else {
						scripts.push(script);
					}
				}
			} catch (error) {
				context.logger.error(`Failed to generate script for ${type}`, { error });
			}
		}
	}
	
	return { scripts };
}
```

### Frontend: Fetch and Load Scripts

```typescript
// packages/core/src/analytics/script-loader.ts

/**
 * Fetch scripts from backend based on current consent
 */
export async function fetchAnalyticsScripts(
	backendUrl: string,
	consent: AnalyticsConsent
): Promise<Script[]> {
	const response = await fetch(`${backendUrl}/analytics/scripts`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ consent }),
	});
	
	if (!response.ok) {
		throw new Error('Failed to fetch analytics scripts');
	}
	
	const data = await response.json();
	return data.scripts;
}

/**
 * Load scripts into script loader
 */
export async function loadAnalyticsScripts(
	scriptLoader: ScriptLoader,
	backendUrl: string,
	consent: AnalyticsConsent
): Promise<void> {
	const scripts = await fetchAnalyticsScripts(backendUrl, consent);
	
	for (const script of scripts) {
		scriptLoader.add(script);
	}
}
```

## Real-World Examples

### Example 1: Meta Pixel (Server + Client)

```typescript
// Backend config
import { metaPixel } from '@c15t/destinations';

const instance = c15tInstance({
	analytics: {
		destinations: [
			metaPixel({
				pixelId: '1234567890',
				accessToken: 'EAAxxxx',  // For Conversions API
			}),
		]
	}
});

// What happens:
// 1. Server-side: Conversions API receives events from backend
// 2. Client-side: Pixel script auto-generated and loaded
// 3. Both controlled by marketing consent
// 4. Deduplication via event_id (server and client send same ID)
```

**Implementation in Meta Pixel destination:**

```typescript
class MetaPixelDestination implements UniversalDestinationPlugin<MetaPixelSettings> {
	// Server-side handler
	async track(event: TrackEvent, context: EventContext): Promise<void> {
		// Send to Conversions API
		await fetch(`https://graph.facebook.com/v18.0/${this.settings.pixelId}/events`, {
			method: 'POST',
			body: JSON.stringify({
				data: [{
					event_name: event.name,
					event_id: context.messageId,  // ← Deduplication
					// ... other fields
				}],
				access_token: this.settings.accessToken,
			}),
		});
	}
	
	// Client-side script generator
	generateScript(settings: MetaPixelSettings, consent: AnalyticsConsent): Script | null {
		if (!consent.marketing) {
			return null;  // Don't load if no marketing consent
		}
		
		return {
			id: 'meta-pixel',
			category: 'marketing',
			textContent: `
				!function(f,b,e,v,n,t,s){...}(window, document,'script',
				'https://connect.facebook.net/en_US/fbevents.js');
				fbq('init', '${settings.pixelId}');
				fbq('track', 'PageView');
			`,
			persistAfterConsentRevoked: true,
			onDelete: () => {
				window.fbq('consent', 'revoke');
			},
		};
	}
}
```

### Example 2: PostHog (Server Only)

```typescript
class PostHogDestination implements UniversalDestinationPlugin<PostHogSettings> {
	// Server-side handler
	async track(event: TrackEvent, context: EventContext): Promise<void> {
		// Send to PostHog API
	}
	
	// NO generateScript method!
	// PostHog only needs server-side tracking
}
```

### Example 3: Google Analytics (Server + Client)

```typescript
class GoogleAnalyticsDestination implements UniversalDestinationPlugin<GASettings> {
	// Server-side handler
	async track(event: TrackEvent, context: EventContext): Promise<void> {
		// Send to GA4 Measurement Protocol
		await fetch(`https://www.google-analytics.com/mp/collect`, {
			method: 'POST',
			body: JSON.stringify({
				client_id: context.anonymousId,
				events: [{
					name: event.name,
					params: event.properties,
				}],
			}),
		});
	}
	
	// Client-side script generator
	generateScript(settings: GASettings, consent: AnalyticsConsent): Script[] {
		if (!consent.measurement) {
			return [];
		}
		
		return [
			{
				id: 'gtag-js',
				category: 'measurement',
				src: `https://www.googletagmanager.com/gtag/js?id=${settings.measurementId}`,
				async: true,
			},
			{
				id: 'gtag-config',
				category: 'measurement',
				textContent: `
					window.dataLayer = window.dataLayer || [];
					function gtag(){dataLayer.push(arguments);}
					gtag('js', new Date());
					gtag('config', '${settings.measurementId}');
				`,
			},
		];
	}
}
```

## Frontend Integration

### Option 1: Static Script Generation (SSR)

```typescript
// app/layout.tsx (Next.js App Router)
import { c15tInstance } from '@c15t/backend/v2';
import { metaPixel, googleAnalytics } from '@c15t/destinations';
import { ConsentManagerProvider } from '@c15t/react';

// Initialize backend (in server component)
const instance = c15tInstance({
	analytics: {
		destinations: [
			metaPixel({ pixelId: process.env.META_PIXEL_ID! }),
			googleAnalytics({ measurementId: process.env.GA_ID! }),
		]
	}
});

// Generate scripts with default consent (necessary only)
const defaultScripts = await instance.getClientScripts({
	necessary: true,
	measurement: false,
	marketing: false,
	functionality: false,
	experience: false,
});

export default function RootLayout({ children }) {
	return (
		<html>
			<body>
				<ConsentManagerProvider
					options={{
						backendUrl: '/api/c15t',
						// Scripts loaded based on consent
						scripts: defaultScripts,
					}}
				>
					{children}
				</ConsentManagerProvider>
			</body>
		</html>
	);
}
```

### Option 2: Dynamic Script Loading (CSR)

```typescript
// app/providers.tsx
'use client';

import { ConsentManagerProvider } from '@c15t/react';
import { useEffect, useState } from 'react';

export function Providers({ children }) {
	const [scripts, setScripts] = useState<Script[]>([]);
	
	useEffect(() => {
		// Fetch scripts dynamically based on consent
		async function loadScripts() {
			const response = await fetch('/api/c15t/analytics/scripts', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			
			const data = await response.json();
			setScripts(data.scripts);
		}
		
		loadScripts();
	}, []);
	
	return (
		<ConsentManagerProvider
			options={{
				backendUrl: '/api/c15t',
				scripts,
			}}
		>
			{children}
		</ConsentManagerProvider>
	);
}
```

### Option 3: Hybrid Destinations Endpoint (Recommended)

```typescript
// packages/backend/src/v2/contracts/analytics.ts

export const analyticsContracts = {
	// ... existing contracts
	
	/**
	 * Get destination configurations for frontend
	 * Includes both destination metadata and client scripts
	 */
	getDestinationConfig: oc
		.input(
			z.object({
				consent: ConsentSchema,
			})
		)
		.output(
			z.object({
				destinations: z.array(
					z.object({
						type: z.string(),
						enabled: z.boolean(),
						hasServerHandler: z.boolean(),
						hasClientScript: z.boolean(),
						requiredConsent: z.array(z.string()),
					})
				),
				scripts: z.array(ScriptSchema),
			})
		)
		.meta({
			description: 'Get destination configuration and client scripts',
			tags: ['analytics', 'destinations'],
		}),
};
```

## Type Safety Across Packages

### Shared Types

```typescript
// packages/backend/src/v2/types/script.ts

/**
 * Script configuration for client-side loading
 * Shared between backend (generation) and frontend (loading)
 */
export interface Script {
	id: string;
	category: 'necessary' | 'measurement' | 'marketing' | 'functionality' | 'experience';
	src?: string;
	textContent?: string;
	async?: boolean;
	defer?: boolean;
	type?: string;
	crossOrigin?: 'anonymous' | 'use-credentials';
	integrity?: string;
	callbackOnly?: boolean;
	persistAfterConsentRevoked?: boolean;
	onBeforeLoad?: (payload: ScriptPayload) => void;
	onConsentChange?: (args: ConsentChangeArgs) => void;
	onDelete?: (payload: ScriptPayload) => void;
}

/**
 * Script payload for callbacks
 */
export interface ScriptPayload {
	elementId: string;
	consents: AnalyticsConsent;
	[key: string]: unknown;
}

/**
 * Consent change arguments for script updates
 */
export interface ConsentChangeArgs {
	consents: AnalyticsConsent;
	previousConsents?: AnalyticsConsent;
}
```

### Type Inference

```typescript
/**
 * Infer if a destination has client scripts
 */
export type HasClientScript<TPlugin> = 
	TPlugin extends { generateScript: (...args: any[]) => any }
		? true
		: false;

/**
 * Extract script-capable destinations
 */
export type ScriptDestinations<TDestinations extends readonly DestinationConfig[]> = 
	Extract<TDestinations[number], { hasClientScript: true }>;
```

## Benefits of Universal Destinations

### 1. Single Configuration
```typescript
// ❌ Before: Separate configs
// Backend
const instance = c15tInstance({
	analytics: {
		destinations: [{ type: 'meta-pixel', settings: { accessToken: 'xxx' } }]
	}
});

// Frontend
const scripts = [
	metaPixelScript({ pixelId: '123' })  // Separate config!
];

// ✅ After: Unified config
const instance = c15tInstance({
	analytics: {
		destinations: [
			metaPixel({ 
				pixelId: '123',
				accessToken: 'xxx'
			})
		]
	}
});

const scripts = instance.getClientScripts(consent);  // Generated from destinations!
```

### 2. Consent Sync Guaranteed

```typescript
// Backend and frontend always use same consent state
// because scripts are generated with consent parameter

// User grants marketing consent
analytics.updateConsent({ marketing: true });

// Backend: Immediately sends events to Meta Conversions API
// Frontend: Script loader loads Meta Pixel script
// → Both use the same consent state, no desync possible
```

### 3. Event Deduplication

```typescript
/**
 * Meta Pixel handles deduplication via event_id
 */
class MetaPixelDestination {
	async track(event: TrackEvent, context: EventContext) {
		await fetch('...', {
			body: JSON.stringify({
				data: [{
					event_name: event.name,
					event_id: context.messageId,  // ← Same ID
				}]
			})
		});
	}
	
	generateScript() {
		return {
			textContent: `
				// Frontend also sends with event_id
				fbq('track', eventName, params, eventId);
			`
		};
	}
}

// Result: Meta receives event from both server and client
// with same event_id → automatically deduplicated
```

### 4. Destination Categories

```typescript
/**
 * Destinations automatically categorized for script loading
 */
const destinations = [
	// Marketing destinations → 'marketing' scripts
	metaPixel({ ... }),           // category: 'marketing'
	googleAds({ ... }),           // category: 'marketing'
	tiktokPixel({ ... }),         // category: 'marketing'
	
	// Analytics destinations → 'measurement' scripts
	googleAnalytics({ ... }),     // category: 'measurement'
	mixpanel({ ... }),            // category: 'measurement' (server-only)
	
	// Essential destinations → 'necessary' scripts
	errorTracking({ ... }),       // category: 'necessary'
];

// Scripts automatically assigned to correct consent category
// When user grants marketing consent:
//   → Meta Pixel script loads
//   → Google Ads script loads
//   → TikTok Pixel script loads
// But analytics scripts still blocked (no measurement consent)
```

## Migration from @c15t/scripts Package

### Before (Separate Packages)

```typescript
// Backend
import { c15tInstance } from '@c15t/backend/v2';

const instance = c15tInstance({
	analytics: {
		destinations: [
			{ type: 'meta-pixel', settings: { accessToken: 'xxx' } }
		]
	}
});

// Frontend (separate!)
import { metaPixel } from '@c15t/scripts/meta-pixel';

const scripts = [
	metaPixel({ pixelId: '123456789' })  // Duplicated config!
];
```

### After (Universal Destinations)

```typescript
// Backend
import { c15tInstance } from '@c15t/backend/v2';
import { metaPixel } from '@c15t/destinations';

const instance = c15tInstance({
	analytics: {
		destinations: [
			metaPixel({
				pixelId: '123456789',      // For client script
				accessToken: 'xxx',        // For server API
			})
		]
	}
});

// Frontend
const scripts = await instance.getClientScripts(consent);  // Generated automatically!
```

## Implementation Tasks

### Backend Changes

1. **Add `UniversalDestinationPlugin` interface**
   - Extends `DestinationPlugin`
   - Adds `generateScript()` method
   - Add to: `packages/backend/src/v2/handlers/analytics/destination-plugin.ts`

2. **Add `Script` type definitions**
   - Import from `c15t` or duplicate
   - Add to: `packages/backend/src/v2/types/script.ts`

3. **Add scripts endpoint**
   - Contract: `/analytics/scripts`
   - Handler: Generate scripts from destinations
   - Add to: `packages/backend/src/v2/handlers/analytics/scripts.handler.ts`

4. **Update DestinationManager**
   - Add `getDestinations()` method
   - Add `generateClientScripts(consent)` method
   - Add to: `packages/backend/src/v2/handlers/analytics/destination-manager.ts`

5. **Update C15TInstance**
   - Add `getClientScripts(consent)` method
   - Add to: `packages/backend/src/v2/core.ts`

### Destinations Package Changes

1. **Update destination implementations**
   - Meta Pixel: Add `generateScript()`
   - Google Analytics: Add `generateScript()`
   - Google Ads: Add `generateScript()`
   - TikTok Pixel: Add `generateScript()`
   - LinkedIn Insights: Add `generateScript()`
   - PostHog: No script needed (server-only)
   - Mixpanel: No script needed (server-only)

2. **Deprecate @c15t/scripts package**
   - Add deprecation notice
   - Point to new universal destinations
   - Keep for backwards compatibility (6 months)

### Frontend Changes

1. **Add script fetching utility**
   - `fetchAnalyticsScripts(backendUrl, consent)`
   - Add to: `packages/core/src/analytics/script-loader.ts`

2. **Update ConsentManagerProvider**
   - Support dynamic script loading
   - Fetch scripts from backend on consent change
   - Add to: `packages/react/src/providers/consent-manager-provider.tsx`

3. **Add hooks**
   - `useAnalyticsScripts()` - Fetch scripts based on consent
   - Add to: `packages/react/src/hooks/use-analytics-scripts.ts`

## Developer Experience

### Configuration Once, Works Everywhere

```typescript
// 1. Configure destination on backend
const instance = c15tInstance({
	analytics: {
		destinations: [
			metaPixel({
				pixelId: env.META_PIXEL_ID,
				accessToken: env.META_ACCESS_TOKEN,
			}),
			googleAnalytics({
				measurementId: env.GA_ID,
				apiSecret: env.GA_SECRET,
			}),
			posthog({
				apiKey: env.POSTHOG_KEY,
			}),
		]
	}
});

// 2. Scripts automatically available on frontend
export const scripts = instance.getClientScripts({
	necessary: true,
	measurement: true,
	marketing: true,
	functionality: false,
	experience: false,
});

// Result:
// scripts = [
//   { id: 'meta-pixel', category: 'marketing', ... },      // ← From metaPixel destination
//   { id: 'gtag-js', category: 'measurement', ... },       // ← From googleAnalytics destination
//   { id: 'gtag-config', category: 'measurement', ... },   // ← From googleAnalytics destination
//   // No PostHog script (server-only destination)
// ]
```

### Type Safety End-to-End

```typescript
// Backend enforces settings type
const config = metaPixel({
	pixelId: '123',
	accessToken: 'xxx',
	wrongField: 'yyy',  // ❌ TypeScript error!
});

// Frontend gets properly typed scripts
const scripts = instance.getClientScripts(consent);
scripts.forEach(script => {
	script.id;          // ✅ string
	script.category;    // ✅ AllConsentNames
	script.src;         // ✅ string | undefined
	script.wrongProp;   // ❌ TypeScript error!
});
```

## Advanced: Dynamic Script Updates

```typescript
/**
 * Scripts update automatically when consent changes
 */
import { useConsentManager } from '@c15t/react';
import { useEffect } from 'react';

export function AnalyticsScripts() {
	const { consent, scriptLoader } = useConsentManager();
	
	useEffect(() => {
		async function updateScripts() {
			// Fetch new scripts based on current consent
			const scripts = await fetch('/api/c15t/analytics/scripts', {
				method: 'POST',
				body: JSON.stringify({ consent }),
			}).then(r => r.json());
			
			// Script loader automatically:
			// - Adds new scripts (if consent granted)
			// - Removes old scripts (if consent revoked)
			scriptLoader.update(scripts.scripts);
		}
		
		updateScripts();
	}, [consent, scriptLoader]);
	
	return null;
}
```

## Summary: Scripts Package Integration

### Changes Needed

| Package | Changes | Status |
|---------|---------|--------|
| `@c15t/backend` | Add `UniversalDestinationPlugin`, scripts endpoint | 🆕 New |
| `@c15t/destinations` | Implement `generateScript()` for relevant destinations | 🔄 Update |
| `@c15t/scripts` | Mark as deprecated, point to destinations | ⚠️ Deprecate |
| `c15t` | Add `fetchAnalyticsScripts()` utility | 🆕 New |
| `@c15t/react` | Add `useAnalyticsScripts()` hook | 🆕 New |

### Benefits

- ✅ Single source of truth (one config for server + client)
- ✅ Type-safe across backend and frontend
- ✅ Consent automatically synchronized
- ✅ Event deduplication built-in
- ✅ No manual script configuration needed
- ✅ Scripts load dynamically based on consent
- ✅ Easier maintenance (one place to update)

---

**This creates a truly universal analytics system where destinations control both server-side event handling AND client-side script loading!** 🎯
