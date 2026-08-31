'use client';

import { iab } from '@c15t/iab';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentManagerProvider,
} from 'c15t/react';
import { IABConsentBanner, IABConsentDialog } from 'c15t/react/iab';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { createDemoScripts } from '../../lib/demo-scripts';
import { useThemePreset } from './theme-switcher';

const SEARCH_CHANGE_EVENT = 'c15t:search-change';
const DEFAULT_BACKEND_URL = 'https://test-consent-io.inth.app/';
const TERMS_BACKEND_URL = '/api/self-host';

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
 * Server-side rendered consent management wrapper for Next.js App Router
 *
 * This component provides SSR-compatible consent management by separating
 * server-side configuration from client-side functionality. The server handles
 * initial setup and configuration, while client-side features (callbacks,
 * scripts) are delegated to the ConsentManagerClient component.
 *
 * @param props - Component properties
 * @param props.children - Child components to render within the consent manager context
 * @param props.dialogVariant - Which dialog implementation to use
 *
 * @returns The consent manager provider with banner, dialog, and client wrapper
 *
 * @remarks
 * This split architecture is necessary because certain options like callbacks
 * and scripts cannot be serialized during server-side rendering. For
 * client-only implementations, use `<ConsentManagerProvider />` from
 * `@c15t/nextjs/client`.
 *
 * @example
 * ```tsx
 * // In your root layout.tsx
 * import { ConsentManager } from './consent-manager';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ConsentManager dialogVariant="custom-tailwind">
 *           {children}
 *         </ConsentManager>
 *       </body>
 *     </html>
 *   );
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
	const isTermsDemo = pathname.startsWith('/terms');
	let backendURL: string;

	if (isTermsDemo) {
		backendURL = TERMS_BACKEND_URL;
	} else {
		backendURL = DEFAULT_BACKEND_URL;
	}

	if (isPolicyDemo || isPolicyActionsDemo) {
		return children;
	}

	return (
		<ConsentManagerProvider
			options={{
				backendURL,
				consentCategories: [
					'necessary',
					'functionality',
					'experience',
					'marketing',
					'measurement',
				],
				iab: iab({
					customVendors: [
						// oxlint-disable-next-line sort-keys -- Key order matches the external protocol or snapshot contract.
						{
							id: 'internal-analytics',
							name: 'Example Analytics',
							privacyPolicyUrl: 'https://www.google.com',
							purposes: [1, 8],
							dataCategories: [1, 2, 6, 8],
							usesCookies: true,
							cookieMaxAgeSeconds: 31536000,
							usesNonCookieAccess: true,
							specialFeatures: [1, 2],
							// legIntPurposes: [1, 8],
						},
					],
				}),
				legalLinks: {
					privacyPolicy: {
						href: '/legal/privacy-policy',
					},
					termsOfService: {
						href: '/legal/terms-of-service',
					},
				},
				mode: 'c15t',
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
					<IABConsentBanner />
					<IABConsentDialog />
					<ConsentDialogTrigger />
					<ConsentDialog />
				</>
			) : null}
			{children}
		</ConsentManagerProvider>
	);
};
