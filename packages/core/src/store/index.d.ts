/**
 * @packageDocumentation
 * Implements the core consent management store using Zustand.
 * This module provides the main store creation and management functionality.
 */
import type { ConsentManagerInterface } from '../client/client-factory';
import type { ConsentStoreState, StoreOptions } from './type';
/**
 * Creates a new consent manager store instance.
 *
 * @remarks
 * This function initializes a new consent management store with:
 * - Persistence through localStorage and cookies
 * - Initial state handling
 * - Consent management methods
 * - Privacy settings
 * - Compliance configuration
 *
 * The store is typically used through React hooks but can also be
 * accessed directly for non-React applications.
 *
 * @param manager - Consent manager client used for API calls and
 * persistence
 * @param options - Optional configuration for the store instance
 * @returns A Zustand store instance with consent management
 * functionality
 *
 * @example
 * Basic usage:
 * ```typescript
 * const store = createConsentManagerStore(manager);
 *
 * // Subscribe to state changes
 * const unsubscribe = store.subscribe(
 *   (state) => console.log('Consent updated:', state.consents),
 * );
 *
 * // Update consent
 * store.getState().setConsent('analytics', true);
 * ```
 *
 * @example
 * Custom namespace:
 * ```typescript
 * const store = createConsentManagerStore(manager, {
 *   namespace: 'MyAppConsentStore',
 * });
 *
 * // Access from window
 * const state = window.MyAppConsentStore.getState();
 * ```
 *
 * @public
 */
export declare const createConsentManagerStore: (
	manager: ConsentManagerInterface,
	options?: StoreOptions
) => import('zustand').StoreApi<ConsentStoreState>;
export * from './type';
