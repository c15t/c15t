import {
	ConsentManagerProvider,
	IABBanner,
	IABPreferenceCenter,
	PreferenceCenterTrigger,
} from '@c15t/react';
import { baseTranslations } from '@c15t/translations';
import type { ReactNode } from 'react';
import CookieBanner from './cookie-banner';
import PreferenceCenter from './preference-center';

/**
 * Props for the ConsentManager component
 */
interface ConsentManagerProps {
	children: ReactNode;
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
	const { preset, setThemePreset, theme, mounted } = useThemePreset();

	// Use default theme during SSR/hydration to avoid mismatch, then switch to user preference
	const activeTheme = mounted ? theme : minimalTheme;
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

	return (
		<>
			{mounted ? (
				<ThemeSwitcher value={preset} onChange={setThemePreset} />
			) : null}
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					// backendURL: 'https://minecraft-europe-hypixel.c15t.xyz',
					backendURL: '/api/self-host',
					consentCategories: ['necessary', 'marketing', 'measurement'],
					iab: {
						enabled: true,
						cmpId: 2,
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
					overrides: {
						country: 'GB',
						region: 'CA',
					},
					translations: {
						translations: {
							zh: {
								...baseTranslations.zh,
							},
							en: {
								...baseTranslations.en,
							},
							fr: {
								...baseTranslations.fr,
							},
							de: {
								...baseTranslations.de,
							},
						},
					},
				}}
			>
				<CookieBanner />
				<PreferenceCenter />
				<IABBanner />
				<IABPreferenceCenter />
				<PreferenceCenterTrigger />
				{/* <CustomDialogTailwind /> */}
				{/* <PresetDialog /> */}
				{children}
			</ConsentManagerProvider>
		</>
	);
}
