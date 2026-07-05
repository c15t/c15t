/**
 * Legacy compatibility surface for v3.
 *
 * `ConsentManagerProvider` wraps the v2 runtime and exists only to ease
 * migration/testing against v2 semantics. It is intentionally OFF the main
 * `@c15t/react/v3` and `/v3/headless` entries so kernel-based apps never pay
 * for the v2 runtime. Import from `@c15t/react/v3/compat` explicitly.
 * Scheduled for removal at v3 stable.
 */
export { ConsentManagerProvider } from './providers/consent-manager-provider';
export type {
	ConsentManagerOptions,
	ConsentManagerProviderProps,
} from './types/consent-manager';
