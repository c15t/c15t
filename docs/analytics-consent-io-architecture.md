# consent.io Control Plane Architecture

## Critical Architectural Clarification

**IMPORTANT**: This document supersedes the "multi-tenant database" approach in previous docs.

### How c15t is Actually Deployed

**NOT** a traditional multi-tenant SaaS with shared backend:
```
❌ Wrong Mental Model:
One backend instance → Shared database → Row-level security
```

**YES** an isolated-instance-per-customer model:
```
✅ Correct Architecture:
Customer A → Own Worker → Own Database (isolated)
Customer B → Own Worker → Own Database (isolated)
Customer C → Own Worker → Own Database (isolated)
```

### consent.io Control Plane

**consent.io** is the control plane that:
1. Provides admin UI for managing destinations
2. Stores destination configs in control plane database
3. **Generates** worker configuration for each customer
4. **Deploys** workers to customer infrastructure
5. **Reloads** workers when config changes

```
┌─────────────────────────────────────────────────────────────┐
│  consent.io (Control Plane)                                  │
│  https://app.consent.io                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────┐                │
│  │ Admin UI                                │                │
│  │ - Customer logs in                      │                │
│  │ - Manages destinations                  │                │
│  │ - Configures API keys                   │                │
│  │ - Tests connections                     │                │
│  └────────────────────────────────────────┘                │
│                   │                                          │
│                   ↓                                          │
│  ┌────────────────────────────────────────┐                │
│  │ Control Plane Database                  │                │
│  │ - Customer accounts                     │                │
│  │ - Destination configs per customer      │                │
│  │ - Worker deployment metadata            │                │
│  └────────────────────────────────────────┘                │
│                   │                                          │
│                   ↓                                          │
│  ┌────────────────────────────────────────┐                │
│  │ Worker Config Generator                 │                │
│  │ - Reads customer's destination configs  │                │
│  │ - Generates TypeScript config code      │                │
│  │ - Builds worker bundle                  │                │
│  └────────────────────────────────────────┘                │
│                   │                                          │
│                   ↓                                          │
│  ┌────────────────────────────────────────┐                │
│  │ Worker Deployment Service               │                │
│  │ - Deploys to Cloudflare                 │                │
│  │ - Or generates config for self-host     │                │
│  └────────────────────────────────────────┘                │
│                                                              │
└──────────────────┬───────────────────────────────────────────┘
                   │ Deploys to
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  Customer A's Infrastructure (ISOLATED)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐                  │
│  │ Cloudflare Worker                     │                  │
│  │ - @c15t/backend                       │                  │
│  │ - Generated config (baked in)         │                  │
│  │ - Customer A's destinations           │                  │
│  └──────────────────────────────────────┘                  │
│                   │                                          │
│                   ↓                                          │
│  ┌──────────────────────────────────────┐                  │
│  │ Customer A's Database                 │                  │
│  │ - Turso/LibSQL (isolated)             │                  │
│  │ - Customer A's consent records        │                  │
│  │ - Customer A's subjects                │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Generation Flow

### Step 1: Customer Configures via Admin UI

```typescript
// Customer logs into app.consent.io
// Clicks "Add Destination" → "Meta Pixel"
// Fills form:
{
  name: "Production Meta Pixel",
  type: "meta-pixel",
  settings: {
    pixelId: "1234567890",
    accessToken: "EAAxxxx"
  },
  enabled: true,
  environment: "production"
}
// Clicks "Save"
```

### Step 2: Control Plane Stores Config

```sql
-- In control plane database (consent.io's DB)
INSERT INTO customer_destinations (
  customer_id,
  name,
  type,
  settings,
  enabled,
  environment
) VALUES (
  'cust_abc123',
  'Production Meta Pixel',
  'meta-pixel',
  '{"pixelId":"1234567890","accessToken":"EAAxxxx"}', -- encrypted
  true,
  'production'
);
```

### Step 3: Generate Worker Configuration

```typescript
// Control plane generates TypeScript config file
// packages/backend/deployment-generator/generate-config.ts

export async function generateWorkerConfig(customerId: string): Promise<string> {
	// Fetch customer's destinations from control plane DB
	const destinations = await controlPlaneDB.query.customer_destinations.findMany({
		where: eq(customer_destinations.customer_id, customerId),
	});
	
	// Generate TypeScript code
	const configCode = `
import { c15tInstance } from '@c15t/backend/v2';
import { kyselyAdapter } from '@c15t/backend/v2/db/adapters/kysely';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely } from 'kysely';
import { ${destinations.map(d => d.type.replace('-', '')).join(', ')} } from '@c15t/destinations';

const handler = (env: Env) => {
	const instance = c15tInstance({
		adapter: kyselyAdapter({
			db: new Kysely({
				dialect: new LibsqlDialect({
					url: env.TURSO_DATABASE_URL,
					authToken: env.TURSO_AUTH_TOKEN,
				}),
			}),
			provider: 'sqlite',
		}),
		trustedOrigins: ${JSON.stringify(customer.trustedOrigins)},
		logger: {
			level: '${customer.logLevel || 'info'}',
			appName: 'c15t-${customerId}',
		},
		analytics: {
			destinations: [
				${destinations.map(d => generateDestinationCode(d)).join(',\n\t\t\t\t')}
			],
		},
	});
	
	return async (request: Request): Promise<Response> => {
		try {
			return await instance.handler(request);
		} catch (error) {
			console.error('Error handling request:', error);
			return new Response(
				JSON.stringify({
					error: 'Internal Server Error',
					message: error instanceof Error ? error.message : String(error),
				}),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
	};
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return await handler(env)(request);
	},
};
	`.trim();
	
	return configCode;
}

function generateDestinationCode(dest: CustomerDestination): string {
	const settingsJson = JSON.stringify(dest.settings, null, 2)
		.split('\n')
		.map((line, i) => i === 0 ? line : `\t\t\t\t\t${line}`)
		.join('\n');
	
	return `${dest.type.replace('-', '')}(${settingsJson}, ${dest.enabled})`;
}
```

**Generated output example**:

```typescript
// Generated for customer_abc123
import { c15tInstance } from '@c15t/backend/v2';
import { metapixel, posthog } from '@c15t/destinations';

const instance = c15tInstance({
	analytics: {
		destinations: [
			metapixel({
				pixelId: "1234567890",
				accessToken: "EAAxxxx"
			}, true),
			posthog({
				apiKey: "phc_abc123"
			}, true)
		]
	}
});
```

### Step 4: Build & Deploy Worker

```typescript
// Control plane builds and deploys worker

export async function deployWorker(customerId: string): Promise<void> {
	// 1. Generate config
	const configCode = await generateWorkerConfig(customerId);
	
	// 2. Write to temp file
	const tempDir = `/tmp/c15t-worker-${customerId}`;
	await fs.writeFile(`${tempDir}/src/index.ts`, configCode);
	
	// 3. Build with esbuild
	await esbuild.build({
		entryPoints: [`${tempDir}/src/index.ts`],
		bundle: true,
		format: 'esm',
		outfile: `${tempDir}/dist/index.js`,
		external: [], // Bundle everything
	});
	
	// 4. Deploy to Cloudflare Workers
	const wranglerConfig = {
		name: `c15t-${customerId}`,
		main: 'dist/index.js',
		compatibility_date: '2024-01-01',
		vars: {
			TURSO_DATABASE_URL: customer.database.url,
			TURSO_AUTH_TOKEN: customer.database.token,
		},
	};
	
	await deployToCloudflare(wranglerConfig, `${tempDir}/dist/index.js`);
	
	// 5. Update customer record with deployment info
	await controlPlaneDB.update(customers)
		.set({
			workerUrl: `https://c15t-${customerId}.workers.dev`,
			lastDeployedAt: new Date(),
		})
		.where(eq(customers.id, customerId));
	
	console.log(`✅ Deployed worker for customer ${customerId}`);
}
```

### Step 5: Customer's Frontend Fetches Scripts

```typescript
// Customer's frontend (their website)
import { ConsentManagerProvider } from '@c15t/react';

export function App() {
	return (
		<ConsentManagerProvider
			options={{
				// Points to customer's isolated worker
				backendUrl: 'https://c15t-customer-abc123.workers.dev',
			}}
		>
			{children}
		</ConsentManagerProvider>
	);
}

// When consent changes, frontend fetches scripts from customer's worker
// GET https://c15t-customer-abc123.workers.dev/analytics/scripts?consent={...}

// Worker returns scripts generated from customer's destination configs
// Scripts are customer-specific (their Meta Pixel, their GA, etc.)
```

## Deployment Models

### Model 1: Managed (consent.io Cloud)

**For customers who want fully managed:**

```
┌──────────────────────────────────────────┐
│  consent.io Control Plane                │
│  - Admin UI                              │
│  - Config generator                      │
│  - Worker deployer                       │
│  - Monitors deployments                  │
└────────────┬─────────────────────────────┘
             │ Deploys to
             ↓
┌──────────────────────────────────────────┐
│  Customer's Cloudflare Account           │
│  (via Cloudflare API)                    │
│                                           │
│  Worker: c15t-customer-abc123            │
│  Database: Turso (customer's account)    │
└──────────────────────────────────────────┘
```

**Control plane responsibilities:**
- Store destination configs
- Generate worker code
- Build and deploy via Cloudflare API
- Monitor worker health
- Handle config updates (rebuild + redeploy)

---

### Model 2: Self-Hosted (Open Source)

**For customers who want full control:**

```
┌──────────────────────────────────────────┐
│  Customer's Infrastructure               │
│                                           │
│  ┌────────────────────────────────────┐ │
│  │  Customer writes config in code:   │ │
│  │                                    │ │
│  │  const instance = c15tInstance({  │ │
│  │    analytics: {                   │ │
│  │      destinations: [              │ │
│  │        metaPixel({ ... })         │ │
│  │      ]                            │ │
│  │    }                              │ │
│  │  });                              │ │
│  └────────────────────────────────────┘ │
│                   │                      │
│                   ↓                      │
│  ┌────────────────────────────────────┐ │
│  │  Deploys to their own worker       │ │
│  │  (manual or CI/CD)                 │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Customer responsibilities:**
- Write config in code (TypeScript)
- Deploy worker themselves
- Manage their own database
- Handle updates manually

---

### Model 3: Hybrid (Recommended)

**Best of both worlds:**

```
┌──────────────────────────────────────────┐
│  consent.io Control Plane                │
│  - Stores destination configs            │
│  - Generates config.ts file              │
│  - Provides download/API                 │
└────────────┬─────────────────────────────┘
             │ Generates config
             ↓
┌──────────────────────────────────────────┐
│  Customer's Infrastructure               │
│  - Downloads generated config            │
│  - Reviews in git                        │
│  - Deploys via their CI/CD               │
└──────────────────────────────────────────┘
```

**Benefits:**
- ✅ UI-based config (easy for non-devs)
- ✅ Git history (review changes)
- ✅ Customer controls deployment
- ✅ Audit trail in version control

---

## Implementation: Control Plane Config Generator

### Architecture

```typescript
// Control plane components

/**
 * 1. Config Storage (consent.io database)
 */
interface CustomerDestinationConfig {
	customerId: string;
	name: string;
	type: string;
	settings: Record<string, unknown>;
	enabled: boolean;
	environment?: string;
}

/**
 * 2. Config Generator
 */
class WorkerConfigGenerator {
	/**
	 * Generate TypeScript config for customer's worker
	 */
	async generateConfig(customerId: string): Promise<string> {
		// Fetch customer's destinations
		const destinations = await this.fetchCustomerDestinations(customerId);
		const customer = await this.fetchCustomer(customerId);
		
		// Generate imports
		const imports = this.generateImports(destinations);
		
		// Generate destination configs
		const destinationConfigs = destinations.map(d => 
			this.generateDestinationConfig(d)
		).join(',\n\t\t\t\t');
		
		// Generate full config
		return `
${imports}

const handler = (env: Env) => {
	const instance = c15tInstance({
		adapter: kyselyAdapter({
			db: new Kysely({
				dialect: new LibsqlDialect({
					url: env.TURSO_DATABASE_URL,
					authToken: env.TURSO_AUTH_TOKEN,
				}),
			}),
			provider: 'sqlite',
		}),
		trustedOrigins: ${JSON.stringify(customer.trustedOrigins)},
		logger: {
			level: '${customer.logLevel || 'info'}',
			appName: 'c15t-${customerId}',
		},
		analytics: {
			destinations: [
				${destinationConfigs}
			],
		},
	});
	
	return async (request: Request): Promise<Response> => {
		try {
			return await instance.handler(request);
		} catch (error) {
			console.error('Error:', error);
			return new Response(
				JSON.stringify({ error: 'Internal Server Error' }),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
	};
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return await handler(env)(request);
	},
};
		`.trim();
	}
	
	private generateImports(destinations: CustomerDestinationConfig[]): string {
		const types = new Set(destinations.map(d => d.type));
		const destinationImports = Array.from(types)
			.map(type => this.camelCase(type))
			.join(', ');
		
		return `
import { c15tInstance } from '@c15t/backend/v2';
import { kyselyAdapter } from '@c15t/backend/v2/db/adapters/kysely';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely } from 'kysely';
import { ${destinationImports} } from '@c15t/destinations';
		`.trim();
	}
	
	private generateDestinationConfig(dest: CustomerDestinationConfig): string {
		const funcName = this.camelCase(dest.type);
		const settingsJson = JSON.stringify(dest.settings, null, 2)
			.split('\n')
			.map((line, i) => i === 0 ? line : `\t\t\t\t\t${line}`)
			.join('\n');
		
		return `// ${dest.name}\n\t\t\t\t${funcName}(${settingsJson}, ${dest.enabled})`;
	}
	
	private camelCase(str: string): string {
		return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
	}
}
```

### Example Generated Config

```typescript
// Generated for customer cust_abc123 on 2025-10-04

import { c15tInstance } from '@c15t/backend/v2';
import { kyselyAdapter } from '@c15t/backend/v2/db/adapters/kysely';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely } from 'kysely';
import { metaPixel, googleAnalytics, posthog } from '@c15t/destinations';

const handler = (env: Env) => {
	const instance = c15tInstance({
		adapter: kyselyAdapter({
			db: new Kysely({
				dialect: new LibsqlDialect({
					url: env.TURSO_DATABASE_URL,
					authToken: env.TURSO_AUTH_TOKEN,
				}),
			}),
			provider: 'sqlite',
		}),
		trustedOrigins: ["https://customer-abc123.com"],
		logger: {
			level: 'info',
			appName: 'c15t-customer-abc123',
		},
		analytics: {
			destinations: [
				// Production Meta Pixel
				metaPixel({
					pixelId: "1234567890",
					accessToken: "EAAxxxx"
				}, true),
				// Production Google Analytics
				googleAnalytics({
					measurementId: "G-ABC123",
					apiSecret: "secret_xxx"
				}, true),
				// Production PostHog
				posthog({
					apiKey: "phc_yyy"
				}, true)
			],
		},
	});
	
	return async (request: Request): Promise<Response> => {
		try {
			return await instance.handler(request);
		} catch (error) {
			console.error('Error:', error);
			return new Response(
				JSON.stringify({ error: 'Internal Server Error' }),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
	};
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return await handler(env)(request);
	},
};

interface Env {
	TURSO_DATABASE_URL: string;
	TURSO_AUTH_TOKEN: string;
}
```

## Deployment Options

### Option 1: Automated Deploy (Managed)

```typescript
// Control plane deploys automatically via Cloudflare API

export async function deployToCloudflare(
	customerId: string,
	configCode: string
): Promise<void> {
	const customer = await getCustomer(customerId);
	
	// Build worker
	const built = await buildWorker(configCode);
	
	// Deploy via Cloudflare API
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${customer.cloudflareAccountId}/workers/scripts/c15t-${customerId}`,
		{
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${customer.cloudflareApiToken}`,
				'Content-Type': 'application/javascript',
			},
			body: built.code,
		}
	);
	
	if (!response.ok) {
		throw new Error('Failed to deploy worker');
	}
	
	console.log(`✅ Deployed worker for ${customerId}`);
}
```

### Option 2: Download Config (Self-Hosted)

```typescript
// Customer downloads generated config and deploys themselves

// Admin UI button: "Download Worker Config"
// GET /api/control-plane/customers/{customerId}/worker-config

export async function downloadWorkerConfig(customerId: string): Promise<Response> {
	const configCode = await generateWorkerConfig(customerId);
	
	return new Response(configCode, {
		headers: {
			'Content-Type': 'text/typescript',
			'Content-Disposition': `attachment; filename="c15t-worker-${customerId}.ts"`,
		},
	});
}

// Customer receives TypeScript file
// They add it to their repo
// Deploy via their own CI/CD
```

### Option 3: API-Driven (GitOps)

```typescript
// Control plane provides API endpoint
// GET /api/control-plane/customers/{customerId}/worker-config

// Customer's CI/CD fetches config before deployment
# .github/workflows/deploy-c15t.yml
name: Deploy c15t Worker

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch latest config from consent.io
        run: |
          curl -H "Authorization: Bearer ${{ secrets.CONSENT_IO_TOKEN }}" \
            https://api.consent.io/customers/${{ secrets.CUSTOMER_ID }}/worker-config \
            > src/index.ts
      
      - name: Deploy to Cloudflare
        run: wrangler deploy
```

**Benefits:**
- Config managed in consent.io UI
- Deployment controlled by customer
- Git history maintained
- Auto-updates via cron

---

## Configuration Update Flow

```
Customer updates destination in UI
    ↓
Control plane saves to database
    ↓
Trigger: Config Changed Event
    ↓
┌────────────────────────────────┐
│ Deployment Strategy:            │
├────────────────────────────────┤
│                                 │
│ Option A: Auto Deploy (Managed)│
│ - Regenerate config             │
│ - Build worker                  │
│ - Deploy to Cloudflare          │
│ - Hot reload (30 seconds)       │
│                                 │
│ Option B: Notify (Self-Hosted) │
│ - Send webhook to customer      │
│ - Customer pulls new config     │
│ - Customer deploys when ready   │
│                                 │
│ Option C: GitOps (Hybrid)      │
│ - Create PR in customer's repo  │
│ - Customer reviews & merges     │
│ - CI/CD deploys automatically   │
│                                 │
└────────────────────────────────┘
```

## Security Model

### Isolation Guarantees

```
Customer A:
├─ Worker: c15t-cust-a.workers.dev
├─ Database: cust-a.turso.tech
└─ Cannot access Customer B's data

Customer B:
├─ Worker: c15t-cust-b.workers.dev
├─ Database: cust-b.turso.tech
└─ Cannot access Customer A's data

Complete isolation at infrastructure level
No shared resources
No cross-tenant access possible
```

### Secrets Management

```typescript
// Sensitive settings encrypted in control plane DB
// Decrypted only during config generation
// Stored as Cloudflare Worker secrets (not in code)

// wrangler.toml generated:
[[env.production.vars]]
META_PIXEL_ACCESS_TOKEN = "EAAxxxx"  // Encrypted secret
POSTHOG_API_KEY = "phc_yyy"          // Encrypted secret

// Worker accesses via env
const instance = c15tInstance({
	analytics: {
		destinations: [
			metaPixel({
				pixelId: "1234567890",
				accessToken: env.META_PIXEL_ACCESS_TOKEN  // From worker env
			})
		]
	}
});
```

## Admin UI: Deployment Status

```tsx
// app.consent.io/customers/abc123/destinations

┌─────────────────────────────────────────────────────┐
│ Your Destinations                                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ┌─────────────────────────────────────────┐        │
│ │ Meta Pixel              [✓ Enabled]     │        │
│ │ Production                               │        │
│ │                                          │        │
│ │ Status: ✅ Deployed                     │        │
│ │ Last updated: 2 hours ago                │        │
│ │ Worker: https://c15t-abc123.workers.dev │        │
│ │                                          │        │
│ │ [Edit] [Test] [Redeploy]                │        │
│ └─────────────────────────────────────────┘        │
│                                                      │
│ [+ Add Destination]  [Download Config]  [Deploy]   │
│                                                      │
│ ⚙️  Deployment Settings:                            │
│ ○ Automatic (deploys on save)                      │
│ ● Manual (click Deploy when ready)                 │
│ ○ GitOps (PR to your repo)                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Benefits of This Architecture

### 1. Complete Isolation
- ✅ Each customer has own worker
- ✅ Each customer has own database
- ✅ Zero cross-tenant access
- ✅ Customer can self-host if desired

### 2. Generated Config is Type-Safe
- ✅ Control plane generates valid TypeScript
- ✅ Catches errors during generation
- ✅ Customer gets type-safe code
- ✅ Can review before deployment

### 3. No Runtime Database Queries
- ✅ Destinations baked into worker code
- ✅ No latency from DB queries
- ✅ Faster cold starts
- ✅ More reliable (no DB dependency at runtime)

### 4. Git-Compatible
- ✅ Generated config can be committed
- ✅ Reviewed in pull requests
- ✅ Version history maintained
- ✅ Rollback via git revert

### 5. Deployment Flexibility
- ✅ Managed: consent.io deploys automatically
- ✅ Self-hosted: Customer deploys manually
- ✅ Hybrid: Customer controls timing
- ✅ GitOps: Automated via CI/CD

## Updated Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│  CONTROL PLANE (app.consent.io)                            │
│  Purpose: Manage configs, generate workers                 │
├────────────────────────────────────────────────────────────┤
│  Admin UI → Config Storage → Config Generator → Deployer  │
└──────────────────────┬─────────────────────────────────────┘
                       │ Generates & deploys
                       ↓
┌────────────────────────────────────────────────────────────┐
│  CUSTOMER A (ISOLATED)                                      │
│  ┌──────────────────────────────────────┐                 │
│  │ Cloudflare Worker                     │                 │
│  │ - Generated config (baked in)         │                 │
│  │ - @c15t/backend                       │                 │
│  │ - @c15t/destinations                  │                 │
│  └──────────────────────────────────────┘                 │
│                   │                                         │
│                   ↓                                         │
│  ┌──────────────────────────────────────┐                 │
│  │ Turso Database                        │                 │
│  │ - Customer A's data only              │                 │
│  └──────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  CUSTOMER B (ISOLATED)                                      │
│  ┌──────────────────────────────────────┐                 │
│  │ Cloudflare Worker                     │                 │
│  │ - Different generated config          │                 │
│  │ - @c15t/backend                       │                 │
│  │ - @c15t/destinations                  │                 │
│  └──────────────────────────────────────┘                 │
│                   │                                         │
│                   ↓                                         │
│  ┌──────────────────────────────────────┐                 │
│  │ Turso Database                        │                 │
│  │ - Customer B's data only              │                 │
│  └──────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────┘
```

## Key Differences from Previous Plans

| Aspect | Previous Plan (❌ Wrong) | Corrected Plan (✅ Right) |
|--------|------------------------|--------------------------|
| **Architecture** | Shared backend, row-level security | Isolated workers per customer |
| **Database** | Shared with tenant ID | Isolated per customer |
| **Config Loading** | Runtime DB queries | Generated into worker code |
| **Deployment** | Never redeploys | Redeploys on config change |
| **Multi-Tenancy** | Shared infrastructure | Infrastructure-level isolation |
| **Control Plane** | Part of backend | Separate (consent.io) |

## Implementation Priorities

### Core (Must Have)
1. ✅ Config generator (TypeScript output)
2. ✅ Download config endpoint
3. ✅ Manual deployment flow

### Enhanced (Should Have)
4. ✅ Automated deploy to Cloudflare
5. ✅ Webhook notifications
6. ✅ Deployment status tracking

### Advanced (Nice to Have)
7. ⚠️ GitOps integration (PR creation)
8. ⚠️ Rollback support
9. ⚠️ Config diff viewer

## Summary

**The correct architecture is:**

- ✅ **Control plane** (consent.io) manages configs and generates workers
- ✅ **Isolated workers** per customer (complete isolation)
- ✅ **Generated config** baked into worker code (type-safe, no runtime DB)
- ✅ **Flexible deployment** (auto, manual, or GitOps)

**This is BETTER than the previous plan because:**
- ✅ Complete isolation (no shared infrastructure)
- ✅ No runtime config loading (faster, more reliable)
- ✅ Git-compatible (can commit generated config)
- ✅ Type-safe generation (errors caught before deployment)
- ✅ Customer controls deployment timing
- ✅ Works for both managed and self-hosted

---

**This is how consent.io cloud should work!** 🚀
