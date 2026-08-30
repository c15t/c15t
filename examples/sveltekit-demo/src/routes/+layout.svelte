<script lang="ts">
	import { page } from '$app/state';
	import { themePresetStore } from '$lib/consent-manager/theme-store.svelte';
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogTrigger,
		ConsentManagerProvider,
		hosted,
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
			mode: hosted({ url: '/api/self-host' }),
			consentCategories: ['necessary', 'marketing', 'measurement'],
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
		{@render children()}
		<ConsentBanner />
		<IABConsentBanner />
		<IABConsentDialog />
		<ConsentDialogTrigger />
		<ConsentDialog />
		<ConsentDevTools position="bottom-right" />
	</ConsentManagerProvider>
{/if}
