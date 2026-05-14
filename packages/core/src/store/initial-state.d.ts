/**
 * @packageDocumentation
 * Provides the default initial state configuration for the consent management store.
 */
import type { StoreRuntimeState } from './type';
/**
 * Current storage key (v1.8+)
 *
 * @remarks
 * This is the default storage key used for both localStorage and cookies.
 * It replaces the legacy `privacy-consent-storage` key to reduce cookie size.
 * Migration from the legacy key happens automatically on first read.
 */
export declare const STORAGE_KEY_V2 = 'c15t';
/**
 * Legacy storage key (<= v1.7.x)
 *
 * @remarks
 * This key is maintained for backward compatibility and automatic migration.
 * New consents are stored in STORAGE_KEY_V2, and old consents are automatically
 * migrated from this key to STORAGE_KEY_V2 when accessed.
 *
 * @deprecated This key is for legacy support only. Use STORAGE_KEY_V2 instead.
 */
export declare const STORAGE_KEY = 'privacy-consent-storage';
/**
 * Default initial state for the consent management store.
 *
 * @remarks
 * This configuration establishes the baseline state for the consent manager,
 * including default consent values, compliance settings, and privacy preferences.
 *
 * @example
 * Using the initial state:
 * ```typescript
 * const store = createConsentManagerStore();
 *
 * // Reset to initial state
 * store.setState(initialState);
 *
 * // Extend initial state
 * const customState = {
 *   ...initialState,
 * };
 * ```
 *
 * @public
 */
export declare const initialState: StoreRuntimeState;
