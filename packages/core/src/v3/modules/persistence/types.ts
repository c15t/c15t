/**
 * Shared types for the persistence module.
 */
import type { StorageConfig } from '../../../libs/cookie';
import type { ConsentState as V2ConsentState } from '../../../types/compliance';
import type { ConsentInfo } from '../../../types/consent-types';
import type { ConsentKernel } from '../../types';

export type { StorageConfig };

export interface PersistenceOptions {
	kernel: ConsentKernel;
	/**
	 * Cookie + storage configuration. Forwarded directly to the v2
	 * cookie layer; any option that cookie.ts accepts is accepted here.
	 * Defaults match v2.
	 */
	storageConfig?: StorageConfig;
	/**
	 * Skip the initial hydration pass. Useful when the adapter has
	 * already seeded the kernel from SSR prefetch.
	 */
	skipHydration?: boolean;
}

export interface PersistenceHandle {
	dispose(): void;
	/** Re-run hydration from storage. Returns whether any state was loaded. */
	hydrate(): boolean;
	/** Clear stored consent. Does NOT mutate the kernel. */
	clear(): void;
}

/**
 * Shape of payloads the v2 cookie layer reads/writes.
 *
 * `getConsentFromStorage` returns `unknown` by default, so we
 * type-narrow here. Both v2 and v3 use the same payload shape so
 * upgraded users don't lose stored consent.
 */
export interface StoredPayload {
	consents?: Partial<V2ConsentState>;
	consentInfo?: ConsentInfo | null;
}
