<script lang="ts">
	import { dev } from '$app/environment';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { createDemoScripts } from '$lib/consent-manager/demo-scripts';
	import { themePresetStore } from '$lib/consent-manager/theme-store.svelte';
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogTrigger,
		ConsentManagerProvider,
		hosted,
		offline,
		IABConsentBanner,
		IABConsentDialog,
	} from '@c15t/svelte';
	import { baseTranslations } from '@c15t/translations/all';

	import '../app.css';
	import '@c15t/svelte/styles.css';
	import '@c15t/svelte/iab/styles.css';

	let { children } = $props();
	const devTools = dev ? import('@c15t/svelte/devtools') : null;
	const isStandaloneConsentRoute = $derived(
		page.url.pathname.startsWith('/bench') ||
			page.url.pathname.startsWith('/ssr')
	);
	const isIabPlayground = dev && env.PUBLIC_DEVTOOLS_IAB === 'true';
	const scripts = dev
		? createDemoScripts({
				clarity: env.PUBLIC_CLARITY_ID,
				googleTag: env.PUBLIC_GOOGLE_TAG_ID,
				metaPixel: env.PUBLIC_META_PIXEL_ID,
				tiktokPixel: env.PUBLIC_TIKTOK_PIXEL_ID,
			})
		: [];

	const activeTheme = $derived.by(() => {
		if (!themePresetStore.mounted) {
			return undefined;
		}
		const { theme } = themePresetStore;
		if (!theme) {
			return undefined;
		}
		return {
			...theme,
			slots: {
				...theme.slots,
				iabBanner: {
					style: {
						alignItems: 'center',
						inset: 0,
						justifyContent: 'end',
					},
				},
			},
		};
	});
</script>

{#if isStandaloneConsentRoute}
	{@render children()}
{:else}
	<ConsentManagerProvider
		options={{
			mode: isIabPlayground
				? offline({
						policyRules: [
							{
								id: 'devtools-iab-playground',
								match: { isDefault: true },
								model: 'iab',
								prompt: 'choice',
								categories: ['marketing', 'measurement'],
							},
						],
					})
				: hosted({ url: '/api/self-host' }),
			persistence: isIabPlayground ? false : undefined,
			consentCategories: ['necessary', 'marketing', 'measurement'],
			iab: {
				enabled: true,
				persistence: isIabPlayground ? false : undefined,
				// Match the example backend. This is a demo ID, not a production CMP configuration.
				cmpId: 10,
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
					},
				],
			},
			scripts,
			storageConfig: {
				crossSubdomain: true,
			},
			theme: activeTheme,
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
			i18n: {
				messages: {
					zh: { ...baseTranslations.zh },
					en: { ...baseTranslations.en },
					fr: { ...baseTranslations.fr },
					de: { ...baseTranslations.de },
				},
			},
			overrides: {
				country: 'CA',
				region: 'QC',
			},
		}}
	>
		{#if isIabPlayground}
			<p role="status">
				IAB playground: saves stay in memory and reset on reload. The vendor
				list loads from consent.io. This is not a production CMP configuration.
			</p>
		{/if}
		{@render children()}
		<ConsentBanner />
		<IABConsentBanner />
		<IABConsentDialog />
		<ConsentDialogTrigger />
		<ConsentDialog />
		{#if devTools}
			{#await devTools then { ConsentDevTools }}
				<ConsentDevTools position="bottom-right" />
			{/await}
		{/if}
	</ConsentManagerProvider>
{/if}
