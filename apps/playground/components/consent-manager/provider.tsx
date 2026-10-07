'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentProvider,
	hosted,
} from 'c15t/react';
import {
	IABConsentBanner,
	IABConsentDialog,
	IABProvider,
} from 'c15t/react/iab';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { createDemoScripts } from '../../lib/demo-scripts';
import { useThemePreset } from './theme-switcher';

const SEARCH_CHANGE_EVENT = 'c15t:search-change';
const DEFAULT_BACKEND_URL = 'https://test-consent-io.inth.app/';

const internalAnalyticsVendor = {
	cookieMaxAgeSeconds: 31_536_000,
	dataCategories: [1, 2, 6, 8],
	id: 'internal-analytics',
	name: 'Example Analytics',
	privacyPolicyUrl: 'https://www.google.com',
	purposes: [1, 8],
	specialFeatures: [1, 2],
	usesCookies: true,
	usesNonCookieAccess: true,
};

/**
 * Props for the ConsentManager component
 */
interface ConsentManagerProps {
	children: ReactNode;
}

const resolveGeoOverrides = function resolveGeoOverrides(
	search: string
): { country?: string; region?: string } | undefined {
	const searchParams = new URLSearchParams(search);
	const queryCountry = searchParams.get('country');
	const queryRegion = searchParams.get('region');

	if (!queryCountry && !queryRegion) {
		return undefined;
	}

	const overrides: { country?: string; region?: string } = {};
	if (queryCountry) {
		overrides.country = queryCountry.toUpperCase();
	}
	if (queryRegion) {
		overrides.region = queryRegion.toUpperCase();
	}

	return overrides;
};

/**
 * Client-side consent wrapper for the demo's App Router pages.
 *
 * Renders `ConsentProvider` from `c15t/react` in hosted mode, with the
 * standard banner, dialog and trigger plus the IAB banner and dialog. The
 * visitor's country and region come from the `country` and `region` query
 * parameters, so the demo can switch jurisdiction without a geo lookup.
 * The policy demo pages render their own providers, so this wrapper passes
 * their children through untouched.
 *
 * @param props - Component properties
 * @param props.children - Child components to render within the consent context
 *
 * @returns The consent provider with its UI, or the children alone on the
 * policy demo pages
 *
 * @remarks
 * This is a client component. It resolves consent in the browser and does
 * not use the server-rendered setup from `c15t/next`; see the Next.js
 * quickstart for that.
 *
 * @example
 * ```tsx
 * // app/(main)/layout.tsx
 * import { ConsentManager } from '../../components/consent-manager/provider';
 *
 * export default function Layout({ children }) {
 *   return <ConsentManager>{children}</ConsentManager>;
 * }
 * ```
 */
export const ConsentManager = ({ children }: ConsentManagerProps) => {
	const { theme, mounted } = useThemePreset();
	const pathname = usePathname();
	const [search, setSearch] = useState(() =>
		typeof window === 'undefined' ? '' : window.location.search
	);
	const [geoOverrides, setGeoOverrides] = useState<
		{ country?: string; region?: string } | undefined
	>(() =>
		typeof window === 'undefined'
			? undefined
			: resolveGeoOverrides(window.location.search)
	);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const syncSearch = () => {
			// Defer the state update so it never runs inside useInsertionEffect
			// (triggered when Next.js router calls history.pushState/replaceState).
			queueMicrotask(() => {
				setSearch((currentSearch) => {
					const nextSearch = window.location.search;
					return currentSearch === nextSearch ? currentSearch : nextSearch;
				});
			});
		};

		const originalPushState = window.history.pushState;
		const originalReplaceState = window.history.replaceState;
		const notifySearchChange = () => {
			window.dispatchEvent(new Event(SEARCH_CHANGE_EVENT));
		};

		window.history.pushState = function pushState(...args) {
			originalPushState.apply(window.history, args);
			notifySearchChange();
		};

		window.history.replaceState = function replaceState(...args) {
			originalReplaceState.apply(window.history, args);
			notifySearchChange();
		};

		syncSearch();
		window.addEventListener('popstate', syncSearch);
		window.addEventListener(SEARCH_CHANGE_EVENT, syncSearch);

		return () => {
			window.history.pushState = originalPushState;
			window.history.replaceState = originalReplaceState;
			window.removeEventListener('popstate', syncSearch);
			window.removeEventListener(SEARCH_CHANGE_EVENT, syncSearch);
		};
	}, []);

	useEffect(() => {
		const nextOverrides = resolveGeoOverrides(search);
		const frame = requestAnimationFrame(() => {
			setGeoOverrides((currentOverrides) => {
				if (
					currentOverrides?.country === nextOverrides?.country &&
					currentOverrides?.region === nextOverrides?.region
				) {
					return currentOverrides;
				}
				return nextOverrides;
			});
		});
		return () => cancelAnimationFrame(frame);
	}, [search]);

	// Use default theme during SSR/hydration to avoid mismatch, then switch to user preference
	const activeTheme = mounted ? theme : undefined;
	const centeredIabTheme = activeTheme
		? {
				...activeTheme,
				slots: {
					...activeTheme.slots,
					consentBannerTitle: 'text-red-500',
					iabBanner: {
						style: {
							alignItems: 'center',
							inset: 0,
							justifyContent: 'end',
						},
					},
				},
			}
		: activeTheme;

	const isPolicyDemo = pathname === '/' || pathname === '/policy';
	const isPolicyActionsDemo = pathname === '/policy-actions';

	if (isPolicyDemo || isPolicyActionsDemo) {
		return children;
	}

	return (
		<ConsentProvider
			options={{
				consentCategories: [
					'necessary',
					'functionality',
					'experience',
					'marketing',
					'measurement',
				],
				legalLinks: {
					privacyPolicy: {
						href: '/legal/privacy-policy',
					},
					termsOfService: {
						href: '/legal/terms-of-service',
					},
				},
				mode: hosted({ url: DEFAULT_BACKEND_URL }),
				overrides: geoOverrides,
				scripts: createDemoScripts('internal-analytics'),
				storageConfig: {
					crossSubdomain: true,
				},
				theme: centeredIabTheme,
				user: {
					id: '123',
					identityProvider: 'custom',
				},
			}}
		>
			{!isPolicyDemo && !isPolicyActionsDemo ? (
				<>
					<ConsentBanner />
					<IABProvider
						cmpId={10}
						customVendors={[internalAnalyticsVendor]}
					>
						<IABConsentBanner />
						<IABConsentDialog />
					</IABProvider>
					<ConsentDialogTrigger />
					<ConsentDialog />
				</>
			) : null}
			{children}
		</ConsentProvider>
	);
};
