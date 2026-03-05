'use client';

import { DevTools } from '@c15t/dev-tools/react';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentManagerProvider,
	IABConsentBanner,
	IABConsentDialog,
} from '@c15t/react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useThemePreset } from './theme-switcher';

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
	const searchParams = useSearchParams();
	const [geoOverrides, setGeoOverrides] = useState<
		{ country?: string; region?: string } | undefined
	>(() =>
		typeof window === 'undefined'
			? undefined
			: resolveGeoOverrides(window.location.search)
	);

	useEffect(() => {
		const syncOverrides = () => {
			setGeoOverrides(resolveGeoOverrides(window.location.search));
		};

		syncOverrides();
		window.addEventListener('popstate', syncOverrides);
		return () => {
			window.removeEventListener('popstate', syncOverrides);
		};
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const nextOverrides = resolveGeoOverrides(window.location.search);
		setGeoOverrides((currentOverrides) => {
			if (
				currentOverrides?.country === nextOverrides?.country &&
				currentOverrides?.region === nextOverrides?.region
			) {
				return currentOverrides;
			}
			return nextOverrides;
		});
	}, [searchParams]);

	// Use default theme during SSR/hydration to avoid mismatch, then switch to user preference
	const activeTheme = mounted ? theme : undefined;
	const centeredIabTheme = activeTheme
		? {
				...activeTheme,
				slots: {
					...activeTheme.slots,
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
	const isHeadlessPolicyTab =
		pathname === '/policy' && searchParams.get('tab') === 'headless';

	return (
		<ConsentManagerProvider
			options={{
				mode: 'c15t',
				// backendURL: 'https://instance-worker-test.consent-ef4.workers.dev/',
				// backendURL: 'https://minecraft-europe-hypixel.c15t.xyz',
				backendURL: '/api/self-host',
				consentCategories: [
					'necessary',
					'functionality',
					'experience',
					'marketing',
					'measurement',
				],
				iab: {
					enabled: true,
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
				},
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
			{!isHeadlessPolicyTab ? (
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
