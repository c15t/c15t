# DoubleTie API Router

A flexible, type-safe API routing system for TypeScript applications built on the better-call library.

## Package Structure

The API Router package is organized into the following modules:

```
api-router/
├── core/                     # Core functionality
│   ├── context.ts            # Context and middleware base functionality
│   ├── endpoint.ts           # Endpoint creation utilities
│   └── router.ts             # Router creation and configuration
├── hooks/                    # Hook system functionality
│   ├── types.ts              # Hook related types
│   └── processor.ts          # Hook processing utilities
├── endpoints/                # Endpoint conversion
│   └── converter.ts          # Endpoint conversion functionality
└── utils/                    # Utilities
    ├── hide-metadata.ts      # Non-action object utilities
    ├── ip.ts                 # IP address extraction
    └── wildcard.ts           # Wildcard matching
```

## Core Functionality

The core module provides the foundational components for creating and configuring API endpoints:

- **createSDKEndpoint**: Factory function for creating type-safe endpoint handlers
- **createSDKMiddleware**: Factory function for creating middleware with context access
- **createApiRouter**: Function for setting up a router with handlers and middleware

## Hook System

The hooks module provides a flexible system for injecting custom logic at various stages of request processing:

- **Hook interface**: Define functions to run before and after endpoint handlers
- **runBeforeHooks**: Process hooks before endpoint execution
- **runAfterHooks**: Process hooks after endpoint execution

## Endpoint Conversion

The endpoints module transforms endpoint definitions into callable API functions:

- **toEndpoints**: Converts endpoint definitions to API handlers with hook processing

## Utilities

The utils module provides helper functions for the API router:

- **wildcard**: Pattern matching for API routes
- **ip**: IP address detection from requests
- **hide-metadata**: Utilities for handling non-action objects

## Example Usage

```typescript
import { 
  createSDKEndpoint, 
  createSDKMiddleware, 
  createApiRouter,
  toEndpoints,
  wildcardMatch,
  type Hook
} from '@doubletie/api-router';

// Create an endpoint
const getUserEndpoint = createSDKEndpoint(async (context) => {
  const { userId } = context.params;
  const user = await getUserById(userId);
  return { user };
});

// Create a middleware
const authMiddleware = createSDKMiddleware(async (context) => {
  const token = context.headers.get('Authorization');
  if (!token) {
    throw new APIError({
      message: 'Unauthorized',
      status: 'UNAUTHORIZED'
    });
  }
  return { context: { user: await validateToken(token) } };
});

// Create a hook
const loggingHook: Hook = {
  match: () => true,
  before: async (context) => {
    console.log(`Request received: ${context.path}`);
    return { context: {} };
  },
  after: async (context) => {
    console.log(`Response sent for: ${context.path}`);
    return {};
  }
};

// Add hooks to context
const appContext = {
  // ... other context properties
  hooks: [loggingHook]
};

// Setup router
const router = createApiRouter(
  appContext,
  options,
  { getUser: getUserEndpoint },
  healthCheckEndpoint,
  [{ path: '/users/**', middleware: authMiddleware }]
);

// Use the router in your application
app.use('/api', router.handler);
``` 