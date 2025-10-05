/**
 * @packageDocumentation
 * React hooks for analytics functionality.
 * Provides convenient hooks for tracking events and managing analytics state.
 */

import type {
	AliasAction,
	AnalyticsState,
	CommonAction,
	CommonProperties,
	GroupAction,
	GroupTraits,
	IdentifyAction,
	PageAction,
	PageEventProperties,
	TrackAction,
	TrackEventProperties,
	UserTraits,
} from 'c15t';
import { useCallback, useContext } from 'react';
import { ConsentStateContext } from '../context/consent-manager-context';

/**
 * Analytics context value interface.
 *
 * @remarks
 * This interface defines the structure of analytics functionality
 * that is now integrated into the consent manager.
 */
export interface AnalyticsContextValue {
	/** Current analytics state from the store */
	analytics: AnalyticsState;
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
}

/**
 * Hook to access analytics functionality.
 *
 * @remarks
 * This hook provides access to the analytics functionality integrated
 * into the consent manager store. Analytics is now part of the consent manager,
 * so no separate provider is needed.
 *
 * @returns Analytics context value
 * @throws {Error} When used outside of ConsentManagerProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { track, analytics, isLoaded } = useAnalytics();
 *
 *   const handleClick = async () => {
 *     if (isLoaded) {
 *       await track({
 *         name: 'button_clicked',
 *         properties: { button: 'cta' }
 *       });
 *     }
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 *
 * @public
 */
export function useAnalytics(): AnalyticsContextValue {
	const context = useContext(ConsentStateContext);

	if (!context) {
		throw new Error(
			'useAnalytics must be used within a ConsentManagerProvider'
		);
	}

	return {
		analytics: context.analytics.state,
		isLoaded: context.analytics.isLoaded,
		track: context.analytics.track,
		page: context.analytics.page,
		identify: context.analytics.identify,
		group: context.analytics.group,
		alias: context.analytics.alias,
		common: context.analytics.common,
		resetAnalytics: context.analytics.resetAnalytics,
		flushAnalytics: context.analytics.flushAnalytics,
	};
}

/**
 * Hook for tracking custom events.
 *
 * @returns Function to track events
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const track = useTrack();
 *
 *   const handleClick = () => {
 *     track({
 *       name: 'button_clicked',
 *       properties: { button: 'cta', page: '/home' }
 *     });
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 */
export function useTrack() {
	const { track, isLoaded } = useAnalytics();

	return useCallback(
		async <T extends TrackEventProperties = TrackEventProperties>(
			action: TrackAction<T>
		) => {
			if (isLoaded) {
				await track(action);
			}
		},
		[track, isLoaded]
	);
}

/**
 * Hook for tracking page views.
 *
 * @returns Function to track page views
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const page = usePage();
 *
 *   useEffect(() => {
 *     page({
 *       name: 'Homepage',
 *       properties: { section: 'hero' }
 *     });
 *   }, [page]);
 *
 *   return <div>Homepage content</div>;
 * }
 * ```
 */
export function usePage() {
	const { page, isLoaded } = useAnalytics();

	return useCallback(
		async <T extends PageEventProperties = PageEventProperties>(
			action: PageAction<T>
		) => {
			if (isLoaded) {
				await page(action);
			}
		},
		[page, isLoaded]
	);
}

/**
 * Hook for identifying users.
 *
 * @returns Function to identify users
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const identify = useIdentify();
 *
 *   const handleLogin = (user) => {
 *     identify({
 *       userId: user.id,
 *       traits: { email: user.email, plan: user.plan }
 *     });
 *   };
 *
 *   return <form onSubmit={handleLogin}>...</form>;
 * }
 * ```
 */
export function useIdentify() {
	const { identify, isLoaded } = useAnalytics();

	return useCallback(
		async <T extends UserTraits = UserTraits>(action: IdentifyAction<T>) => {
			if (isLoaded) {
				await identify(action);
			}
		},
		[identify, isLoaded]
	);
}

/**
 * Hook for tracking groups.
 *
 * @returns Function to track groups
 *
 * @example
 * ```tsx
 * function CompanySettings() {
 *   const group = useGroup();
 *
 *   const handleCompanyUpdate = (company) => {
 *     group({
 *       groupId: company.id,
 *       traits: { name: company.name, plan: company.plan }
 *     });
 *   };
 *
 *   return <form onSubmit={handleCompanyUpdate}>...</form>;
 * }
 * ```
 */
export function useGroup() {
	const { group, isLoaded } = useAnalytics();

	return useCallback(
		async <T extends GroupTraits = GroupTraits>(action: GroupAction<T>) => {
			if (isLoaded) {
				await group(action);
			}
		},
		[group, isLoaded]
	);
}

/**
 * Hook for aliasing user IDs.
 *
 * @returns Function to alias user IDs
 *
 * @example
 * ```tsx
 * function UserRegistration() {
 *   const alias = useAlias();
 *
 *   const handleRegistration = (user) => {
 *     alias({
 *       to: user.id,
 *       from: user.tempId
 *     });
 *   };
 *
 *   return <form onSubmit={handleRegistration}>...</form>;
 * }
 * ```
 */
export function useAlias() {
	const { alias, isLoaded } = useAnalytics();

	return useCallback(
		async (action: AliasAction) => {
			if (isLoaded) {
				await alias(action);
			}
		},
		[alias, isLoaded]
	);
}

/**
 * Hook for setting common properties.
 *
 * @returns Function to set common properties
 *
 * @example
 * ```tsx
 * function App() {
 *   const common = useCommon();
 *
 *   useEffect(() => {
 *     common({
 *       properties: {
 *         app_version: '1.0.0',
 *         environment: 'production'
 *       }
 *     });
 *   }, [common]);
 *
 *   return <div>App content</div>;
 * }
 * ```
 */
export function useCommon() {
	const { common } = useAnalytics();

	return useCallback(
		<T extends CommonProperties = CommonProperties>(
			action: CommonAction<T>
		) => {
			common(action);
		},
		[common]
	);
}

/**
 * Hook for resetting analytics data.
 *
 * @returns Function to reset analytics
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const reset = useReset();
 *
 *   const handleLogout = () => {
 *     reset();
 *     // Perform logout logic
 *   };
 *
 *   return <button onClick={handleLogout}>Logout</button>;
 * }
 * ```
 */
export function useReset() {
	const { resetAnalytics } = useAnalytics();

	return useCallback(() => {
		resetAnalytics();
	}, [resetAnalytics]);
}

/**
 * Hook for flushing analytics events.
 *
 * @returns Function to flush events
 *
 * @example
 * ```tsx
 * function BeforeUnload() {
 *   const flush = useFlush();
 *
 *   useEffect(() => {
 *     const handleBeforeUnload = () => {
 *       flush();
 *     };
 *
 *     window.addEventListener('beforeunload', handleBeforeUnload);
 *     return () => window.removeEventListener('beforeunload', handleBeforeUnload);
 *   }, [flush]);
 *
 *   return null;
 * }
 * ```
 */
export function useFlush() {
	const { flushAnalytics } = useAnalytics();

	return useCallback(async () => {
		await flushAnalytics();
	}, [flushAnalytics]);
}

/**
 * Hook for accessing analytics state.
 *
 * @returns Current analytics state
 *
 * @example
 * ```tsx
 * function AnalyticsDebug() {
 *   const state = useAnalyticsState();
 *
 *   return (
 *     <div>
 *       <p>Loaded: {state.loaded ? 'Yes' : 'No'}</p>
 *       <p>User ID: {state.userId || 'Anonymous'}</p>
 *       <p>Consent: {JSON.stringify(state.consent)}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAnalyticsState() {
	const { analytics } = useAnalytics();
	return analytics;
}

/**
 * Hook for checking if analytics is loaded.
 *
 * @returns Whether analytics is loaded
 *
 * @example
 * ```tsx
 * function ConditionalTracking() {
 *   const isLoaded = useIsAnalyticsLoaded();
 *
 *   if (!isLoaded) {
 *     return <div>Loading analytics...</div>;
 *   }
 *
 *   return <div>Analytics ready!</div>;
 * }
 * ```
 */
export function useIsAnalyticsLoaded() {
	const { isLoaded } = useAnalytics();
	return isLoaded;
}
