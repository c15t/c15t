# 01: API Contract And Backend Config (Single Request, Styling First)

## Baseline Constraint

`/init` remains unchanged for existing clients.

## New Endpoint

Add fixed endpoint:

- `GET /embed.js`

This is only for script-tag runtime consumption.

## `embed.js` Payload Contract

`/embed.js` returns JavaScript, not JSON.

Embedded payload shape:

```ts
type EmbedBootstrapPayload = {
  init: {
    jurisdiction: string;
    location: { countryCode: string | null; regionCode: string | null };
    translations: { language: string; translations: Record<string, unknown> };
    branding: string;
    gvl?: unknown;
    customVendors?: unknown[];
    cmpId?: number;
  };
  options: {
    ui?: {
      noStyle?: boolean;
      disableAnimation?: boolean;
      scrollLock?: boolean;
      trapFocus?: boolean;
      colorScheme?: 'light' | 'dark' | 'system';
    };
    theme?: {
      colors?: Record<string, string>;
      dark?: Record<string, string>;
      typography?: Record<string, string | number>;
      spacing?: Record<string, string>;
      radius?: Record<string, string>;
      shadows?: Record<string, string>;
      motion?: Record<string, string>;
      slots?: Record<
        string,
        | string
        | {
            className?: string;
            style?: Record<string, string | number>;
            noStyle?: boolean;
          }
      >;
    };
    componentHints?: {
      preload?: Array<'banner' | 'dialog' | 'widget' | 'iabBanner' | 'iabDialog'>;
    };
  };
  revision?: string;
};
```

## Backend Config Shape

```ts
advanced?: {
  embed?: {
    enabled?: boolean; // default false
    options?: EmbedBootstrapPayload['options'];
    revision?: string;
  };
};
```

Notes:

1. No `siteVariants`.
2. No custom endpoint path.
3. `/embed.js` path is fixed.

## Source-Of-Truth Rule

`init` data embedded in `/embed.js` must come from the same internal init builder used by `/init`, to prevent drift.

## UI Styling Compatibility

Style options must align with existing theme/slot APIs:

- `packages/ui/src/theme/types.ts`
- `packages/react/src/types/theme/style-types.ts`

## Planned File-Level Changes

- Backend config types:
  - `packages/backend/src/types/index.ts`
- Shared init payload helper (new):
  - `packages/backend/src/handlers/init/*`
- Backend embed route (new):
  - `packages/backend/src/routes/embed.ts`
  - `packages/backend/src/routes/index.ts`
  - `packages/backend/src/core.ts`

No `/init` schema or contract changes.

## Deferred Fields

Not in milestone 1:

1. scripts/integrations runtime config
2. network blocker runtime config
