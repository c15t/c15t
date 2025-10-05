# Cloud-Configurable Destinations

## The Vision

**Enable non-technical users to configure analytics destinations via UI/API, not just code.**

### Use Cases

1. **Multi-Tenant SaaS**: Each customer configures their own destinations
2. **No-Code Configuration**: Marketing team manages destinations without developer
3. **Dynamic A/B Testing**: Enable/disable destinations via admin panel
4. **Partner Integrations**: Customers connect their own Meta Pixel, GA, etc.
5. **Self-Service Onboarding**: "Connect your analytics tools" wizard

## Architecture

```
┌────────────────────────────────────────────┐
│  Admin UI (Web Dashboard)                  │
│  - Add/edit/remove destinations            │
│  - Configure API keys                      │
│  - Test connections                        │
│  - Enable/disable per environment          │
└─────────────────┬──────────────────────────┘
                  │ POST /admin/destinations
                  ↓
┌────────────────────────────────────────────┐
│  Database (c15t backend)                   │
│  destinations table:                       │
│  - id, organizationId, type                │
│  - settings (JSON), enabled                │
│  - requiredConsent, environment            │
└─────────────────┬──────────────────────────┘
                  │ Query on startup/runtime
                  ↓
┌────────────────────────────────────────────┐
│  Backend: Load destinations from DB        │
│  - Fetch destination configs               │
│  - Validate settings                       │
│  - Initialize destinations                 │
│  - Generate client scripts                 │
└─────────────────┬──────────────────────────┘
                  │
                  ├─→ Server-side events
                  └─→ Client-side scripts
```

## Database Schema

```typescript
// packages/backend/src/v2/db/schema/destinations.ts

import { relations, sql } from 'drizzle-orm';
import { index, json, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createTable } from '../utils';

export const destinations = createTable('destinations', {
	id: text('id')
		.primaryKey()
		.notNull()
		.default(sql`gen_random_uuid()`),
	
	// Multi-tenancy
	organizationId: text('organization_id').notNull(),
	
	// Destination identification
	type: text('type').notNull(), // 'posthog', 'meta-pixel', etc.
	name: text('name').notNull(),  // User-friendly name
	
	// Configuration
	settings: json('settings').$type<Record<string, unknown>>().notNull(),
	enabled: boolean('enabled').notNull().default(true),
	
	// Consent requirements (can override destination default)
	requiredConsent: json('required_consent')
		.$type<string[]>()
		.notNull()
		.default(sql`'[]'::json`),
	
	// Environment targeting
	environment: text('environment'), // 'production', 'staging', 'development', null = all
	
	// Metadata
	description: text('description'),
	metadata: json('metadata').$type<Record<string, unknown>>(),
	
	// Audit
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
	createdBy: text('created_by'),
	
	// Soft delete
	deletedAt: timestamp('deleted_at'),
}, (table) => ({
	organizationIdx: index('destinations_organization_idx').on(table.organizationId),
	typeIdx: index('destinations_type_idx').on(table.type),
	environmentIdx: index('destinations_environment_idx').on(table.environment),
}));

export const destinationsRelations = relations(destinations, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [destinations.organizationId],
		references: [organizations.id],
	}),
}));
```

## Backend Implementation

### 1. Load Destinations from Database

```typescript
// packages/backend/src/v2/init.ts

export const init = (options: C15TOptions): C15TContext => {
	// ... existing initialization
	
	// Initialize destination manager
	let destinationManager: DestinationManager | undefined;
	
	if (options.analytics?.enabled !== false) {
		const registry = options.analytics?.customDestinations 
			? createCustomRegistry(options.analytics.customDestinations)
			: destinationRegistry; // Global registry
			
		destinationManager = new DestinationManager(registry, logger);
		
		// Load destinations from THREE sources:
		// 1. Code-based configs (options.analytics.destinations)
		// 2. Database configs (if loadFromDatabase: true)
		// 3. Runtime configs (via API calls)
		
		// Load code-based destinations
		if (options.analytics.destinations) {
			destinationManager
				.loadDestinations(options.analytics.destinations)
				.catch((error) => {
					logger.error('Failed to load code-based destinations:', error);
				});
		}
		
		// Load database destinations (async, don't block startup)
		if (options.analytics.loadFromDatabase) {
			loadDestinationsFromDatabase(destinationManager, orm, logger)
				.catch((error) => {
					logger.error('Failed to load database destinations:', error);
				});
		}
	}
	
	// ... rest of initialization
};

/**
 * Load destinations from database
 */
async function loadDestinationsFromDatabase(
	destinationManager: DestinationManager,
	db: ORM,
	logger: Logger
): Promise<void> {
	// Query enabled destinations
	const dbDestinations = await db.query.destinations.findMany({
		where: (destinations, { eq, isNull, and }) => and(
			eq(destinations.enabled, true),
			isNull(destinations.deletedAt),
			// Filter by environment if needed
			eq(destinations.environment, process.env.NODE_ENV)
		),
	});
	
	logger.info(`Loading ${dbDestinations.length} destinations from database`);
	
	// Convert to DestinationConfig and load
	for (const dbDest of dbDestinations) {
		try {
			const config: DestinationConfig = {
				type: dbDest.type,
				enabled: dbDest.enabled,
				settings: dbDest.settings,
				requiredConsent: dbDest.requiredConsent as Array<keyof AnalyticsConsent>,
			};
			
			await destinationManager.loadDestination(config);
			logger.info(`Loaded destination from database: ${dbDest.name} (${dbDest.type})`);
		} catch (error) {
			logger.error(`Failed to load destination ${dbDest.name}:`, error);
		}
	}
}
```

### 2. Admin API for Managing Destinations

```typescript
// packages/backend/src/v2/contracts/admin/destinations.ts

import { oc } from '@orpc/contract';
import { z } from 'zod';

const DestinationConfigSchema = z.object({
	type: z.string(),
	name: z.string().min(1, 'Name is required'),
	settings: z.record(z.unknown()),
	enabled: z.boolean().default(true),
	requiredConsent: z.array(z.enum(['necessary', 'measurement', 'marketing', 'functionality', 'experience'])).optional(),
	environment: z.enum(['production', 'staging', 'development']).optional(),
	description: z.string().optional(),
});

export const destinationAdminContracts = {
	/**
	 * List all destinations for organization
	 */
	list: oc
		.input(z.object({
			organizationId: z.string(),
			environment: z.string().optional(),
		}))
		.output(z.object({
			destinations: z.array(
				z.object({
					id: z.string(),
					type: z.string(),
					name: z.string(),
					enabled: z.boolean(),
					environment: z.string().optional(),
					hasServerHandler: z.boolean(),
					hasClientScript: z.boolean(),
					createdAt: z.date(),
					updatedAt: z.date(),
				})
			),
		})),
	
	/**
	 * Get destination details (with decrypted settings)
	 */
	get: oc
		.input(z.object({
			destinationId: z.string(),
		}))
		.output(
			z.object({
				id: z.string(),
				organizationId: z.string(),
				type: z.string(),
				name: z.string(),
				settings: z.record(z.unknown()),
				enabled: z.boolean(),
				requiredConsent: z.array(z.string()),
				environment: z.string().optional(),
				description: z.string().optional(),
			})
		),
	
	/**
	 * Create new destination
	 */
	create: oc
		.input(
			z.object({
				organizationId: z.string(),
			}).merge(DestinationConfigSchema)
		)
		.output(
			z.object({
				id: z.string(),
				message: z.string(),
			})
		),
	
	/**
	 * Update destination
	 */
	update: oc
		.input(
			z.object({
				destinationId: z.string(),
			}).merge(DestinationConfigSchema.partial())
		)
		.output(
			z.object({
				id: z.string(),
				message: z.string(),
			})
		),
	
	/**
	 * Delete destination (soft delete)
	 */
	delete: oc
		.input(z.object({
			destinationId: z.string(),
		}))
		.output(
			z.object({
				id: z.string(),
				message: z.string(),
			})
		),
	
	/**
	 * Test destination connection
	 */
	test: oc
		.input(z.object({
			destinationId: z.string(),
		}))
		.output(
			z.object({
				success: z.boolean(),
				message: z.string(),
				details: z.record(z.unknown()).optional(),
			})
		),
	
	/**
	 * Get available destination types
	 */
	availableTypes: oc
		.input(z.void())
		.output(
			z.object({
				types: z.array(
					z.object({
						type: z.string(),
						name: z.string(),
						description: z.string(),
						hasServerHandler: z.boolean(),
						hasClientScript: z.boolean(),
						requiredConsent: z.array(z.string()),
						settingsSchema: z.any(), // JSON schema representation
					})
				),
			})
		),
};
```

### 3. Handlers Implementation

```typescript
// packages/backend/src/v2/handlers/admin/destinations.handler.ts

/**
 * Create a new destination
 */
export async function createDestination(
	input: CreateDestinationInput,
	context: C15TContext
) {
	// Validate destination type exists
	const factory = destinationRegistry.get(input.type);
	if (!factory) {
		throw new Error(`Unknown destination type: ${input.type}`);
	}
	
	// Test that settings are valid by creating temp instance
	try {
		const tempDest = await factory(input.settings);
		await tempDest.initialize(input.settings);
		
		// Test connection
		const connected = await tempDest.testConnection();
		if (!connected) {
			throw new Error('Destination connection test failed');
		}
		
		// Clean up temp instance
		if (tempDest.destroy) {
			await tempDest.destroy();
		}
	} catch (error) {
		throw new Error(
			`Invalid destination settings: ${error instanceof Error ? error.message : String(error)}`
		);
	}
	
	// Encrypt sensitive settings (API keys, tokens, etc.)
	const encryptedSettings = await encryptSettings(input.settings);
	
	// Save to database
	const [destination] = await context.db.insert(destinations).values({
		organizationId: input.organizationId,
		type: input.type,
		name: input.name,
		settings: encryptedSettings,
		enabled: input.enabled,
		requiredConsent: input.requiredConsent,
		environment: input.environment,
		description: input.description,
		createdBy: context.user?.id,
	}).returning();
	
	// Hot-reload: Add to active destinations immediately
	if (input.enabled && context.destinationManager) {
		await context.destinationManager.addDestination({
			type: input.type,
			enabled: true,
			settings: input.settings, // Use unencrypted settings
		});
	}
	
	return {
		id: destination.id,
		message: `Destination '${input.name}' created successfully`,
	};
}

/**
 * Get available destination types with their schemas
 */
export async function getAvailableDestinationTypes() {
	const types = destinationRegistry.getTypes();
	const availableTypes = [];
	
	for (const type of types) {
		const factory = destinationRegistry.get(type);
		if (!factory) continue;
		
		// Create temp instance to get metadata
		const tempSettings = {}; // Empty settings just to inspect
		try {
			const tempDest = await factory(tempSettings);
			
			availableTypes.push({
				type: type,
				name: formatDestinationName(type),
				description: getDestinationDescription(type),
				hasServerHandler: hasMethod(tempDest, 'track'),
				hasClientScript: hasMethod(tempDest, 'generateScript'),
				requiredConsent: tempDest.requiredConsent || [],
				settingsSchema: convertToJSONSchema(tempDest.settingsSchema),
			});
			
			// Clean up
			if (tempDest.destroy) await tempDest.destroy();
		} catch {
			// Skip destinations that fail to initialize
		}
	}
	
	return { types: availableTypes };
}
```

## Frontend: Dynamic Script Loading

### Option 1: Fetch Scripts on Demand (Recommended)

```typescript
// app/layout.tsx (Next.js)
import { ConsentManagerProvider } from '@c15t/react';

export default function RootLayout({ children }) {
	return (
		<ConsentManagerProvider
			options={{
				backendUrl: '/api/c15t',
				// Scripts fetched dynamically from backend
				// Backend reads from database and generates scripts
				dynamicScripts: true,
			}}
		>
			{children}
		</ConsentManagerProvider>
	);
}
```

**What happens:**
1. Frontend calls `GET /analytics/scripts?consent=...`
2. Backend queries database for enabled destinations
3. Backend generates scripts from destinations
4. Frontend receives scripts and loads them
5. On consent change, frontend re-fetches scripts

### Option 2: Server Components (Next.js)

```tsx
// app/layout.tsx
import { c15tInstance } from '@c15t/backend/v2';
import { ConsentManagerProvider } from '@c15t/react';

export default async function RootLayout({ children }) {
	const instance = c15tInstance({
		adapter: myAdapter,
		analytics: {
			loadFromDatabase: true,  // ← Load from DB
		}
	});
	
	// Get context (destinations loaded from DB)
	const context = await instance.$context;
	
	// Generate scripts for default consent
	const scripts = await context.destinationManager?.generateClientScripts({
		necessary: true,
		measurement: false,
		marketing: false,
		functionality: false,
		experience: false,
	});
	
	return (
		<html>
			<body>
				<ConsentManagerProvider
					options={{
						backendUrl: '/api/c15t',
						scripts: scripts || [],
					}}
				>
					{children}
				</ConsentManagerProvider>
			</body>
		</html>
	);
}
```

## Admin UI Example

### Destination Management Interface

```tsx
// app/admin/destinations/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function DestinationsPage() {
	const { data: destinations } = useQuery({
		queryKey: ['destinations'],
		queryFn: async () => {
			const res = await fetch('/api/c15t/admin/destinations/list');
			return res.json();
		},
	});
	
	const createMutation = useMutation({
		mutationFn: async (config: DestinationConfig) => {
			const res = await fetch('/api/c15t/admin/destinations/create', {
				method: 'POST',
				body: JSON.stringify(config),
			});
			return res.json();
		},
	});
	
	return (
		<div className="destinations-admin">
			<h1>Analytics Destinations</h1>
			
			<div className="destinations-list">
				{destinations?.destinations.map((dest) => (
					<DestinationCard
						key={dest.id}
						destination={dest}
						onEdit={() => {/* ... */}}
						onDelete={() => {/* ... */}}
						onTest={() => {/* ... */}}
					/>
				))}
			</div>
			
			<button onClick={() => setShowAddModal(true)}>
				Add Destination
			</button>
			
			<AddDestinationModal
				open={showAddModal}
				onClose={() => setShowAddModal(false)}
				onCreate={(config) => createMutation.mutate(config)}
			/>
		</div>
	);
}
```

### Add Destination Wizard

```tsx
// app/admin/destinations/add-modal.tsx

export function AddDestinationModal({ open, onClose, onCreate }) {
	const [step, setStep] = useState(1);
	const [selectedType, setSelectedType] = useState<string>();
	const [settings, setSettings] = useState<Record<string, unknown>>({});
	
	const { data: availableTypes } = useQuery({
		queryKey: ['destination-types'],
		queryFn: async () => {
			const res = await fetch('/api/c15t/admin/destinations/available-types');
			return res.json();
		},
	});
	
	return (
		<Modal open={open} onClose={onClose}>
			{step === 1 && (
				<SelectDestinationType
					types={availableTypes?.types}
					onSelect={(type) => {
						setSelectedType(type);
						setStep(2);
					}}
				/>
			)}
			
			{step === 2 && (
				<ConfigureDestination
					type={selectedType}
					schema={availableTypes?.types.find(t => t.type === selectedType)?.settingsSchema}
					settings={settings}
					onChange={setSettings}
					onBack={() => setStep(1)}
					onNext={() => setStep(3)}
				/>
			)}
			
			{step === 3 && (
				<TestConnection
					type={selectedType}
					settings={settings}
					onBack={() => setStep(2)}
					onCreate={() => {
						onCreate({
							type: selectedType,
							settings,
							enabled: true,
						});
						onClose();
					}}
				/>
			)}
		</Modal>
	);
}
```

## Multi-Tenant Configuration

```typescript
// Each organization can have their own destinations

// Organization 1 (e-commerce)
await db.insert(destinations).values({
	organizationId: 'org-ecommerce',
	type: 'meta-pixel',
	name: 'Production Meta Pixel',
	settings: {
		pixelId: '1234567890',
		accessToken: 'EAAxxxx',
	},
	enabled: true,
	environment: 'production',
});

// Organization 2 (SaaS)
await db.insert(destinations).values({
	organizationId: 'org-saas',
	type: 'mixpanel',
	name: 'Production Mixpanel',
	settings: {
		projectToken: 'abc123',
	},
	enabled: true,
	environment: 'production',
});

// At runtime, load destinations for current organization
const instance = c15tInstance({
	analytics: {
		loadFromDatabase: true,
		organizationId: currentOrganization.id,  // Filter by org
	}
});
```

## Self-Service Integration

### Customer Onboarding Flow

```typescript
/**
 * Step 1: Customer connects their Meta Pixel
 */
POST /api/c15t/admin/destinations/create
{
	organizationId: "customer-abc",
	type: "meta-pixel",
	name: "My Marketing Pixel",
	settings: {
		pixelId: "9876543210",
		accessToken: "EAAyyyy"  // Customer provides their own
	},
	enabled: true,
	environment: "production"
}

/**
 * Step 2: Backend validates and saves
 */
// - Tests Meta Pixel connection
// - Validates settings with Standard Schema
// - Encrypts sensitive data
// - Saves to database
// - Hot-reloads destination

/**
 * Step 3: Customer's events immediately flow
 */
// Server-side: Events sent to their Meta Conversions API
// Client-side: Their pixel script loaded automatically
// All with their own credentials, isolated from other customers
```

## Security Considerations

### Encrypt Sensitive Settings

```typescript
// packages/backend/src/v2/utils/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Encrypt sensitive destination settings
 */
export async function encryptSettings(
	settings: Record<string, unknown>
): Promise<Record<string, unknown>> {
	const encrypted: Record<string, unknown> = {};
	const sensitiveFields = ['apiKey', 'accessToken', 'secretKey', 'clientSecret'];
	
	for (const [key, value] of Object.entries(settings)) {
		if (sensitiveFields.includes(key) && typeof value === 'string') {
			encrypted[key] = await encrypt(value);
		} else {
			encrypted[key] = value;
		}
	}
	
	return encrypted;
}

/**
 * Decrypt settings before using
 */
export async function decryptSettings(
	settings: Record<string, unknown>
): Promise<Record<string, unknown>> {
	const decrypted: Record<string, unknown> = {};
	
	for (const [key, value] of Object.entries(settings)) {
		if (typeof value === 'string' && value.startsWith('encrypted:')) {
			decrypted[key] = await decrypt(value);
		} else {
			decrypted[key] = value;
		}
	}
	
	return decrypted;
}
```

### Row-Level Security

```sql
-- RLS policy: Users can only see their organization's destinations
CREATE POLICY destinations_isolation ON destinations
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );
```

## Configuration Hierarchy

Destinations can be configured from **three sources** (in order of precedence):

```typescript
const instance = c15tInstance({
	analytics: {
		// 1. Code-based (highest precedence)
		destinations: [
			posthog({ apiKey: env.POSTHOG_KEY }),
		],
		
		// 2. Database (loaded at startup)
		loadFromDatabase: true,
		organizationId: 'current-org',
		
		// 3. Runtime (added dynamically)
		// via destinationManager.addDestination()
	}
});

// Precedence rules:
// - Code-based destinations always load
// - Database destinations load if enabled
// - Runtime destinations can be added/removed anytime
// - Duplicate types: Last one wins (or merge strategy)
```

## Dynamic Scripts Endpoint

```typescript
// packages/backend/src/v2/handlers/analytics/scripts.handler.ts

/**
 * Get scripts dynamically based on database config
 */
export async function getScripts(
	input: { 
		consent: AnalyticsConsent;
		organizationId?: string;
		environment?: string;
	},
	context: C15TContext
) {
	const scripts: Script[] = [];
	
	// Query database for enabled destinations
	const dbDestinations = await context.db.query.destinations.findMany({
		where: (destinations, { eq, isNull, and }) => {
			const conditions = [
				eq(destinations.enabled, true),
				isNull(destinations.deletedAt),
			];
			
			if (input.organizationId) {
				conditions.push(eq(destinations.organizationId, input.organizationId));
			}
			
			if (input.environment) {
				conditions.push(eq(destinations.environment, input.environment));
			}
			
			return and(...conditions);
		},
	});
	
	// Generate scripts from each destination
	for (const dbDest of dbDestinations) {
		const factory = destinationRegistry.get(dbDest.type);
		if (!factory) continue;
		
		try {
			// Decrypt settings
			const settings = await decryptSettings(dbDest.settings);
			
			// Create destination instance
			const destination = await factory(settings);
			
			// Check if it has script generation
			if ('generateScript' in destination && destination.generateScript) {
				const script = await destination.generateScript(settings, input.consent);
				
				if (script) {
					if (Array.isArray(script)) {
						scripts.push(...script);
					} else {
						scripts.push(script);
					}
				}
			}
			
			// Clean up temp instance
			if (destination.destroy) {
				await destination.destroy();
			}
		} catch (error) {
			context.logger.error(`Failed to generate script for ${dbDest.name}:`, error);
		}
	}
	
	return { scripts };
}
```

## Real-World Example: Multi-Tenant SaaS

```typescript
/**
 * CUSTOMER A (E-commerce)
 * Configured via admin UI:
 */
// Meta Pixel: 1234567890
// Google Analytics: G-ABC123
// PostHog: phc_xxx

/**
 * CUSTOMER B (SaaS)
 * Configured via admin UI:
 */
// Mixpanel: abc123
// Amplitude: xyz789
// Segment: writeKey123

/**
 * Both customers use same c15t instance
 * Destinations isolated by organizationId
 */
const instance = c15tInstance({
	analytics: {
		loadFromDatabase: true,
		// organizationId determined per request
		dynamicOrganization: true,
	}
});

// Middleware: Set organization from request
export async function middleware(request: Request) {
	const organizationId = getOrganizationFromRequest(request);
	
	// Pass to analytics handler
	request.headers.set('X-Organization-ID', organizationId);
	
	return await instance.handler(request);
}

// Handler: Load destinations for this organization
export async function handleAnalytics(request: Request) {
	const organizationId = request.headers.get('X-Organization-ID');
	
	// Destinations loaded dynamically for this organization
	const context = await instance.$context;
	await context.destinationManager?.loadOrganizationDestinations(organizationId);
	
	// Process events with organization-specific destinations
	return await processEvents(events, consent);
}
```

## Benefits of Cloud Configuration

### For Product Teams
- ✅ No code deployments to change destinations
- ✅ Enable/disable via admin panel
- ✅ A/B test destinations without code
- ✅ Marketing team manages their own tools
- ✅ Instant configuration changes

### For Multi-Tenant SaaS
- ✅ Each customer has their own destinations
- ✅ Self-service onboarding
- ✅ Isolated configurations
- ✅ Per-customer analytics keys
- ✅ White-label support

### For Enterprise
- ✅ Environment-specific configs (prod/staging/dev)
- ✅ Centralized management
- ✅ Audit trail (who changed what when)
- ✅ Permission-based access
- ✅ Compliance-ready

### For Developers
- ✅ Still type-safe (validated via Standard Schema)
- ✅ Can mix code-based + database configs
- ✅ Fallback to code if database unavailable
- ✅ Hot-reload without restarts
- ✅ Easy testing (swap configs per test)

## Implementation Checklist

### Phase 1: Database Schema (Day 1)
- [ ] Create destinations table
- [ ] Add organizationId foreign key
- [ ] Add indexes for performance
- [ ] Add soft delete support
- [ ] Add audit fields

### Phase 2: Backend API (Days 2-3)
- [ ] Create admin contracts for destinations
- [ ] Implement CRUD handlers
- [ ] Add destination validation
- [ ] Add connection testing
- [ ] Add settings encryption/decryption
- [ ] Add hot-reload support

### Phase 3: Database Loading (Day 4)
- [ ] Implement `loadFromDatabase` option
- [ ] Add database query for destinations
- [ ] Add organization filtering
- [ ] Add environment filtering
- [ ] Add error handling for failed loads

### Phase 4: Dynamic Scripts (Day 5)
- [ ] Update scripts endpoint to query database
- [ ] Add organization-aware script generation
- [ ] Add environment-aware script generation
- [ ] Add caching for performance
- [ ] Add error handling

### Phase 5: Admin UI (Days 6-7)
- [ ] Create destination list view
- [ ] Create add/edit destination forms
- [ ] Add destination type selector
- [ ] Add settings form (dynamic based on schema)
- [ ] Add connection test button
- [ ] Add enable/disable toggle
- [ ] Add delete confirmation

### Phase 6: Frontend Integration (Day 8)
- [ ] Add `dynamicScripts` option to ConsentManagerProvider
- [ ] Implement dynamic script fetching
- [ ] Add script caching
- [ ] Add error handling
- [ ] Add loading states

## Configuration UI Mockup

```
┌─────────────────────────────────────────────────────┐
│ Analytics Destinations                              │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ┌─────────────────────────────────────────┐        │
│ │ Meta Pixel                        [✓ Enabled]    │
│ │ Production environment                            │
│ │ Requires: Marketing consent                       │
│ │ ├─ Server: Conversions API ✓                     │
│ │ └─ Client: Pixel script    ✓                     │
│ │ [Edit] [Test Connection] [Delete]                │
│ └─────────────────────────────────────────┘        │
│                                                      │
│ ┌─────────────────────────────────────────┐        │
│ │ Google Analytics                  [✓ Enabled]    │
│ │ Production environment                            │
│ │ Requires: Measurement consent                     │
│ │ ├─ Server: Measurement Protocol ✓                │
│ │ └─ Client: gtag.js             ✓                 │
│ │ [Edit] [Test Connection] [Delete]                │
│ └─────────────────────────────────────────┘        │
│                                                      │
│ ┌─────────────────────────────────────────┐        │
│ │ PostHog                           [✗ Disabled]   │
│ │ Staging environment                               │
│ │ Requires: Measurement consent                     │
│ │ └─ Server: PostHog API         ✓                 │
│ │ [Edit] [Test Connection] [Delete]                │
│ └─────────────────────────────────────────┘        │
│                                                      │
│ [+ Add Destination]                                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Add Destination Flow

```
┌─────────────────────────────────────────────────────┐
│ Add Destination - Step 1: Select Type               │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Choose a destination to add:                        │
│                                                      │
│ ┌───────────────┐ ┌───────────────┐ ┌──────────┐  │
│ │ Meta Pixel    │ │ Google        │ │ PostHog  │  │
│ │               │ │ Analytics     │ │          │  │
│ │ 📱 Marketing  │ │ 📊 Analytics  │ │ 📈 Analytics│ │
│ │ Server+Client │ │ Server+Client │ │ Server   │  │
│ └───────────────┘ └───────────────┘ └──────────┘  │
│                                                      │
│ ┌───────────────┐ ┌───────────────┐ ┌──────────┐  │
│ │ Mixpanel      │ │ Amplitude     │ │ Custom   │  │
│ │               │ │               │ │          │  │
│ │ 📊 Analytics  │ │ 📊 Analytics  │ │ 🔧 Custom│  │
│ │ Server        │ │ Server        │ │ Any      │  │
│ └───────────────┘ └───────────────┘ └──────────┘  │
│                                                      │
│                           [Cancel]                   │
└─────────────────────────────────────────────────────┘

↓ User selects "Meta Pixel"

┌─────────────────────────────────────────────────────┐
│ Add Destination - Step 2: Configure                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Meta Pixel Configuration                            │
│                                                      │
│ Name: ____________________                          │
│       [My Marketing Pixel]                          │
│                                                      │
│ Pixel ID: ____________________  (Required)          │
│           [1234567890]                              │
│                                                      │
│ Access Token: ____________________  (Optional)      │
│               [EAAxxxx...]                          │
│               For server-side Conversions API       │
│                                                      │
│ Environment: [Production ▼]                         │
│                                                      │
│ Required Consent: ☑ Marketing                       │
│                                                      │
│                 [Back]  [Next: Test Connection]     │
└─────────────────────────────────────────────────────┘

↓ User fills form and clicks "Next"

┌─────────────────────────────────────────────────────┐
│ Add Destination - Step 3: Test Connection           │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Testing connection to Meta Pixel...                 │
│                                                      │
│ ✓ Pixel ID validated                                │
│ ✓ Access Token authenticated                        │
│ ✓ Server-side API accessible                        │
│ ✓ Client-side pixel script available                │
│                                                      │
│ Connection successful! ✅                            │
│                                                      │
│ Your Meta Pixel is ready to use.                    │
│ Events will be sent to:                             │
│ - Conversions API (server-side)                     │
│ - Pixel Script (client-side)                        │
│                                                      │
│                 [Back]  [Create Destination]         │
└─────────────────────────────────────────────────────┘
```

## Type Safety with Cloud Config

```typescript
/**
 * Settings are still validated even when stored in database
 */

// 1. User submits destination via UI
POST /admin/destinations/create
{
	type: "meta-pixel",
	settings: {
		pixelId: "123",
		wrongField: "value"  // ← Invalid field
	}
}

// 2. Backend validates with Standard Schema
const factory = destinationRegistry.get('meta-pixel');
const tempDest = await factory(input.settings);

// 3. Settings validation runs
// MetaPixelSettingsSchema.parse(input.settings)
// → Throws error: "wrongField is not a valid property"

// 4. Error returned to UI
{
	error: "Invalid settings",
	details: {
		field: "wrongField",
		message: "Unknown property"
	}
}

// Result: Type safety enforced even for cloud config!
```

## Migration Path

### Stage 1: Code-Only (Current)
```typescript
const instance = c15tInstance({
	analytics: {
		destinations: [
			metaPixel({ pixelId: 'xxx', accessToken: 'yyy' })
		]
	}
});
```

### Stage 2: Hybrid (Transition)
```typescript
const instance = c15tInstance({
	analytics: {
		// Some from code
		destinations: [
			posthog({ apiKey: 'xxx' })  // Critical destinations in code
		],
		// Some from database
		loadFromDatabase: true,  // Optional destinations from DB
	}
});
```

### Stage 3: Cloud-Only (Full SaaS)
```typescript
const instance = c15tInstance({
	analytics: {
		// All from database!
		loadFromDatabase: true,
		organizationId: getCurrentOrganization(),
	}
});
```

## Summary

**Question**: "Is there a way we could feed the scripts from the server to the front end so they could be configured in the cloud as well, not just as code?"

**Answer**: **YES!** With these features:

| Feature | Benefit |
|---------|---------|
| **Database Storage** | Store destination configs in DB |
| **Admin API** | CRUD endpoints for managing destinations |
| **Admin UI** | Non-technical users configure destinations |
| **Dynamic Loading** | Load from DB at startup or runtime |
| **Dynamic Scripts** | Scripts generated from DB configs |
| **Multi-Tenant** | Each org has own destinations |
| **Self-Service** | Customers connect their own tools |
| **Type Safety** | Still validated with Standard Schema |
| **Hot-Reload** | Changes apply without restart |
| **Encryption** | Sensitive data encrypted at rest |

**Implementation**: Add 8 days to roadmap (total: 20 days)

**Business Value**: 
- SaaS-ready (multi-tenant)
- Self-service (faster onboarding)
- No-code (marketing team independence)
- Enterprise-ready (centralized management)

---

**This turns c15t into a true no-code analytics platform!** 🚀
