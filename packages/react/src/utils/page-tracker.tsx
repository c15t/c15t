/**
 * @packageDocumentation
 * Page tracking utilities for analytics.
 * Provides automatic page view tracking and manual page tracking hooks.
 */

import type { PageEventProperties } from 'c15t';
import { getCurrentPath, getCurrentUrl, getPageTitle } from 'c15t';
import { useEffect, useRef } from 'react';
import { usePage } from '../hooks/use-analytics';

/**
 * Props for manual page tracking actions with strict typing.
 */
export interface PageTrackingAction<
	T extends PageEventProperties = PageEventProperties,
> {
	/** Custom page name */
	name?: string;
	/** Additional page properties */
	properties?: T;
}

/**
 * Props for the PageTracker component with strict typing.
 */
export interface PageTrackerProps<
	T extends PageEventProperties = PageEventProperties,
> {
	/** Whether to track page views automatically */
	enabled?: boolean;
	/** Custom page name */
	name?: string;
	/** Additional page properties */
	properties?: T;
	/** Whether to track on mount */
	trackOnMount?: boolean;
}

/**
 * Component for automatic page view tracking.
 *
 * @remarks
 * This component automatically tracks page views when:
 * - The component mounts (if trackOnMount is true)
 * - The pathname changes (if enabled)
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <Router>
 *       <PageTracker enabled trackOnMount />
 *       <Routes>
 *         <Route path="/" element={<Home />} />
 *         <Route path="/about" element={<About />} />
 *       </Routes>
 *     </Router>
 *   );
 * }
 * ```
 *
 * @public
 */
export function PageTracker<
	T extends PageEventProperties = PageEventProperties,
>({
	enabled = true,
	name,
	properties = {} as T,
	trackOnMount = true,
}: PageTrackerProps<T>) {
	const page = usePage();
	const lastPathRef = useRef<string | null>(null);

	// Track page view on mount
	useEffect(() => {
		if (trackOnMount && enabled) {
			const currentPath = getCurrentPath();
			const currentUrl = getCurrentUrl();
			const pageTitle = getPageTitle();

			page({
				name: name || pageTitle || 'Unknown Page',
				properties: {
					...properties,
					path: currentPath,
					url: currentUrl,
					title: pageTitle,
				},
			});

			lastPathRef.current = currentPath || null;
		}
	}, [page, enabled, trackOnMount, name, properties]);

	// Track page view on pathname change
	useEffect(() => {
		if (!enabled) {
			return;
		}

		const handlePopState = () => {
			const currentPath = getCurrentPath();
			const currentUrl = getCurrentUrl();
			const pageTitle = getPageTitle();

			// Only track if path actually changed
			if (currentPath !== lastPathRef.current) {
				page({
					name: name || pageTitle || 'Unknown Page',
					properties: {
						...properties,
						path: currentPath,
						url: currentUrl,
						title: pageTitle,
					},
				});

				lastPathRef.current = currentPath || null;
			}
		};

		// Listen for browser back/forward navigation
		window.addEventListener('popstate', handlePopState);

		return () => {
			window.removeEventListener('popstate', handlePopState);
		};
	}, [page, enabled, name, properties]);

	return null;
}

/**
 * Hook for manual page view tracking.
 *
 * @returns Function to track page views manually
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const trackPageView = usePageViews();
 *
 *   useEffect(() => {
 *     trackPageView({
 *       name: 'Custom Page',
 *       properties: { section: 'hero' }
 *     });
 *   }, [trackPageView]);
 *
 *   return <div>Page content</div>;
 * }
 * ```
 */
export function usePageViews() {
	const page = usePage();

	return <T extends PageEventProperties = PageEventProperties>(
		action?: PageTrackingAction<T>
	) => {
		const currentPath = getCurrentPath();
		const currentUrl = getCurrentUrl();
		const pageTitle = getPageTitle();

		page({
			name: action?.name || pageTitle || 'Unknown Page',
			properties: {
				...(action?.properties || {}),
				path: currentPath,
				url: currentUrl,
				title: pageTitle,
			} as PageEventProperties,
		});
	};
}

/**
 * Hook for tracking page views with Next.js router.
 *
 * @param router - Next.js router instance
 * @returns Function to track page views
 *
 * @example
 * ```tsx
 * import { useRouter } from 'next/router';
 *
 * function MyPage() {
 *   const router = useRouter();
 *   const trackPageView = useNextPageViews(router);
 *
 *   useEffect(() => {
 *     trackPageView();
 *   }, [trackPageView]);
 *
 *   return <div>Page content</div>;
 * }
 * ```
 */
export function useNextPageViews(router: {
	pathname: string;
	query: Record<string, unknown>;
}) {
	const page = usePage();

	return <T extends PageEventProperties = PageEventProperties>(
		action?: PageTrackingAction<T>
	) => {
		const pageTitle = getPageTitle();

		page({
			name: action?.name || pageTitle || 'Unknown Page',
			properties: {
				...(action?.properties || {}),
				path: router.pathname,
				query: router.query,
				title: pageTitle,
			} as PageEventProperties,
		});
	};
}

/**
 * Hook for tracking page views with React Router.
 *
 * @param location - React Router location object
 * @returns Function to track page views
 *
 * @example
 * ```tsx
 * import { useLocation } from 'react-router-dom';
 *
 * function MyPage() {
 *   const location = useLocation();
 *   const trackPageView = useReactRouterPageViews(location);
 *
 *   useEffect(() => {
 *     trackPageView();
 *   }, [trackPageView]);
 *
 *   return <div>Page content</div>;
 * }
 * ```
 */
export function useReactRouterPageViews(location: {
	pathname: string;
	search: string;
}) {
	const page = usePage();

	return <T extends PageEventProperties = PageEventProperties>(
		action?: PageTrackingAction<T>
	) => {
		const pageTitle = getPageTitle();

		page({
			name: action?.name || pageTitle || 'Unknown Page',
			properties: {
				...(action?.properties || {}),
				path: location.pathname,
				search: location.search,
				title: pageTitle,
			} as PageEventProperties,
		});
	};
}
