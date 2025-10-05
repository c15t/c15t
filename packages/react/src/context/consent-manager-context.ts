'use client';

/**
 * @packageDocumentation
 * Provides the context for sharing consent management state across components.
 */

import type {
	AliasAction,
	AnalyticsConsent,
	AnalyticsState,
	CommonAction,
	CommonProperties,
	ConsentChangeEvent,
	ConsentManagerInterface,
	GroupAction,
	GroupTraits,
	IdentifyAction,
	PageAction,
	PageEventProperties,
	PrivacyConsentState,
	TrackAction,
	TrackEventProperties,
	UserTraits,
} from 'c15t';
import { createContext } from 'react';

/**
 * The context value provided by ConsentManagerProvider.
 */
export interface ConsentStateContextValue {
	/**
	 * Current consent management state
	 */
	state: PrivacyConsentState;

	/**
	 * Reference to the consent manager store instance
	 * We use object type to avoid circular dependencies
	 */
	store: {
		getState: () => PrivacyConsentState;
		subscribe: (listener: (state: PrivacyConsentState) => void) => () => void;
		setState: (state: Partial<PrivacyConsentState>) => void;
	};

	/**
	 * Optional API client instance
	 */
	manager: ConsentManagerInterface | null;

	/**
	 * Analytics functionality integrated into the consent manager
	 */
	analytics: {
		/** Current analytics state from the store */
		state: AnalyticsState;
		/** Whether analytics is loaded */
		isLoaded: boolean;
		/** Analytics methods from the store with strict typing */
		track: <T extends TrackEventProperties = TrackEventProperties>(
			action: TrackAction<T>
		) => Promise<void>;
		page: <T extends PageEventProperties = PageEventProperties>(
			action: PageAction<T>
		) => Promise<void>;
		identify: <T extends UserTraits = UserTraits>(
			action: IdentifyAction<T>
		) => Promise<void>;
		group: <T extends GroupTraits = GroupTraits>(
			action: GroupAction<T>
		) => Promise<void>;
		alias: (action: AliasAction) => Promise<void>;
		common: <T extends CommonProperties = CommonProperties>(
			action: CommonAction<T>
		) => void;
		resetAnalytics: () => void;
		flushAnalytics: () => Promise<void>;
	};

	/**
	 * Script management functionality (optional)
	 */
	scriptManager?: {
		scripts: Map<string, any>;
		loading: boolean;
		error?: string;
		stats: any;
		loadScripts: (scripts: any[]) => Promise<any[]>;
		unloadScriptsByConsent: (consent: AnalyticsConsent) => void;
		reloadScripts: (scripts: any[]) => Promise<any[]>;
		clearAllScripts: () => void;
		clearCache: () => void;
		retryFailedScripts: () => Promise<any[]>;
		preloadScripts: (scripts: any[]) => Promise<void>;
		getScriptStatus: (scriptId: string) => any;
		isScriptLoaded: (scriptId: string) => boolean;
		getScriptsByConsent: (consent: AnalyticsConsent) => any[];
	};

	/**
	 * Consent synchronization functionality (optional)
	 */
	consentSync?: {
		consent: AnalyticsConsent;
		loading: boolean;
		error?: string;
		lastUpdated: number;
		source: string;
		tabId: string;
		stats: any;
		updateConsent: (
			consent: AnalyticsConsent,
			source?: string,
			reason?: string
		) => Promise<void>;
		resetConsent: () => Promise<void>;
		getChangeHistory: () => ConsentChangeEvent[];
		getConsentStats: () => any;
	};
}

/**
 * Context for sharing consent management state across components.
 */
export const ConsentStateContext = createContext<
	ConsentStateContextValue | undefined
>(undefined);
