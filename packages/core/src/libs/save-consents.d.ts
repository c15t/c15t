import type { StoreApi } from 'zustand';
import type { ConsentStoreState } from '~/store/type';
import type { ConsentManagerInterface } from '../client/client-interface';
import type { ConsentState, OnConsentChangedPayload } from '../types';
/**
 * Storage key for pending consent sync after page reload.
 * When consent is revoked and page reloads, the API sync happens on the fresh page.
 */
export declare const PENDING_CONSENT_SYNC_KEY = 'c15t:pending-consent-sync';
/**
 * Data structure for pending consent sync stored in localStorage.
 */
export interface PendingConsentSync {
	type: 'necessary' | 'all' | 'custom';
	subjectId: string;
	externalId?: string;
	identityProvider?: string;
	preferences: Partial<ConsentState>;
	givenAt: number;
	jurisdiction?: string;
	jurisdictionModel?: string | null;
	domain: string;
	uiSource?: string;
	policySnapshotToken?: string;
}
interface SaveConsentsProps {
	manager: ConsentManagerInterface;
	type: 'necessary' | 'all' | 'custom';
	get: StoreApi<ConsentStoreState>['getState'];
	set: StoreApi<ConsentStoreState>['setState'];
	options?: {
		uiSource?: string;
	};
	emitConsentChanged?: (payload: OnConsentChangedPayload) => void;
}
export declare function saveConsents({
	manager,
	type,
	get,
	set,
	options,
	emitConsentChanged,
}: SaveConsentsProps): Promise<void>;
export {};
