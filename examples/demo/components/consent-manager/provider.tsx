'use client';

import { DevTools } from '@c15t/dev-tools/react';
import { iab } from '@c15t/iab';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentManagerProvider,
} from '@c15t/react';
import { IABConsentBanner, IABConsentDialog } from '@c15t/react/iab';
import { databuddy } from '@c15t/scripts/databuddy';
import { googleTagManager } from '@c15t/scripts/google-tag-manager';
import { xPixel } from '@c15t/scripts/x-pixel';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useThemePreset } from './theme-switcher';

const SEARCH_CHANGE_EVENT = 'c15t:search-change';

/**
 * Props for the ConsentManager component
 */
interface ConsentManagerProps {
	children: ReactNode;
}

function resolveGeoOverrides(
	search: string
): { country?: string; region?: string } | undefined {
	const searchParams = new URLSearchParams(search);
	const queryCountry = searchParams.get('country');
	const queryRegion = searchParams.get('region');

	if (!queryCountry && !queryRegion) {
		return undefined;
	}

	return {
		...(queryCountry ? { country: queryCountry.toUpperCase() } : {}),
		...(queryRegion ? { region: queryRegion.toUpperCase() } : {}),
	};
}

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
export function ConsentManager({ children }: ConsentManagerProps) {
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
			originalPushState.apply(this, args);
			notifySearchChange();
		};

		window.history.replaceState = function replaceState(...args) {
			originalReplaceState.apply(this, args);
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
		setGeoOverrides((currentOverrides) => {
			if (
				currentOverrides?.country === nextOverrides?.country &&
				currentOverrides?.region === nextOverrides?.region
			) {
				return currentOverrides;
			}
			return nextOverrides;
		});
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
							inset: 0,
							alignItems: 'center',
							justifyContent: 'end',
						},
					},
				},
			}
		: activeTheme;

	const isPolicyDemo = pathname === '/policy';
	const isPolicyActionsDemo = pathname === '/policy-actions';

	if (isPolicyActionsDemo) {
		return (
			<>
				{children}
				<DevTools />
			</>
		);
	}

	return (
		<ConsentManagerProvider
			options={{
				mode: 'c15t',
				// backendURL: 'https://instance-worker-test.consent-ef4.workers.dev/',
				// backendURL: 'https://minecraft-europe-hypixel.c15t.xyz',
				// backendURL: '/api/self-host',
				backendURL: 'https://consent-io-eu-central-1-test.c15t.dev',
				consentCategories: [
					'necessary',
					'functionality',
					'experience',
					'marketing',
					'measurement',
				],
				iab: iab({
					customVendors: [
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
				scripts: [
					{
						id: 'example-analytics-iab',
						src: 'https://www.example.com/analytics.js',
						category: 'measurement',
						vendorId: 1,
					},
					{
						id: 'example-analytics-custom',
						src: 'https://www.example.com/custom-analytics.js',
						category: 'measurement',
						vendorId: 'internal-analytics',
					},
					databuddy({
						clientId: '13a29940-fa67-4036-9970-cc9f8d869ae',
						configWhenGranted: {
							clientId: '13a29940-fa67-4036-9970-cc9f8d869ae',
							disabled: false,
						},
						configWhenDenied: {
							clientId: '13a29940-fa67-4036-9970-cc9f8d869ae',
							disabled: true,
						},
					}),
					xPixel({
						pixelId: 'qvfsy',
					}),
					googleTagManager({
						id: 'GTM-WL5L8NW7',
					}),
				],
				storageConfig: {
					crossSubdomain: true,
				},
				theme: centeredIabTheme,
				legalLinks: {
					privacyPolicy: {
						href: '/legal/privacy-policy',
					},
					termsOfService: {
						href: '/legal/terms-of-service',
					},
				},
				user: {
					id: '123',
					identityProvider: 'custom',
				},
				overrides: geoOverrides,
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
			<DevTools />
			{children}
		</ConsentManagerProvider>
	);
}
