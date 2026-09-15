import type { ConsentProviderPrefetch } from '@c15t/react/provider';

/**
 * The visitor's resolved consent state: serializable policy, records, and
 * request clock. Produced server-side by `resolveConsent()` and consumed by
 * `ConsentRoot`, which hands it to the React provider.
 */
export type ConsentState = ConsentProviderPrefetch;
