<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogTrigger,
		ConsentManagerProvider,
		IABConsentBanner,
		IABConsentDialog,
	} from '@c15t/svelte';
	import { createDevTools, type DevToolsInstance } from '@c15t/dev-tools';
	import { baseTranslations } from '@c15t/translations/all';
	import { themePresetStore } from '$lib/consent-manager/theme-store.svelte';
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();
	let devtools: DevToolsInstance | null = null;

	onMount(() => {
		devtools = createDevTools({ position: 'bottom-right' });
		return () => {
			devtools?.destroy();
			devtools = null;
		};
	});

	const activeTheme = $derived.by(() => {
		if (!themePresetStore.mounted) return undefined;
		const theme = themePresetStore.theme;
		if (!theme) return undefined;
		return {
			...theme,
			slots: {
				...theme.slots,
				iabBanner: {
					style: {
						inset: 0,
						alignItems: 'center',
						justifyContent: 'end',
					},
				},
			},
		};
	});
</script>

<ConsentManagerProvider
	options={{
		mode: 'c15t',
		backendURL: '/api/self-host',
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
	<ConsentBanner />
	<IABConsentBanner />
	<IABConsentDialog />
	<ConsentDialogTrigger />
	<ConsentDialog />
	{@render children()}
</ConsentManagerProvider>
