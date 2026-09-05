<script lang="ts">
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
	import { ConsentDevTools } from '@c15t/svelte/devtools';
	import { baseTranslations } from '@c15t/translations/all';

	import '../app.css';
	import '@c15t/svelte/styles.css';
	import '@c15t/svelte/iab/styles.css';

	let { children } = $props();
	const isBenchRoute = $derived(page.url.pathname.startsWith('/bench'));
	const isIabPlayground = env.PUBLIC_DEVTOOLS_IAB === 'true';
	const scripts = createDemoScripts({
		metaPixel: env.PUBLIC_META_PIXEL_ID,
		tiktokPixel: env.PUBLIC_TIKTOK_PIXEL_ID,
		googleTag: env.PUBLIC_GOOGLE_TAG_ID,
		clarity: env.PUBLIC_CLARITY_ID,
	});

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

{#if isBenchRoute}
	{@render children()}
{:else}
	<ConsentManagerProvider
		options={{
			mode: isIabPlayground ? offline() : hosted({ url: '/api/self-host' }),
			persistence: isIabPlayground ? false : undefined,
			offlinePolicy: isIabPlayground
				? {
						policy: {
							id: 'devtools-iab-playground',
							model: 'iab',
							ui: { mode: 'banner' },
							consent: {
								categories: ['necessary', 'marketing', 'measurement'],
							},
						},
					}
				: undefined,
			consentCategories: ['necessary', 'marketing', 'measurement'],
			iab: {
				enabled: true,
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
		<ConsentDevTools position="bottom-right" />
	</ConsentManagerProvider>
{/if}
