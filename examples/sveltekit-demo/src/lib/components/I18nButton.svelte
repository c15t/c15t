<script lang="ts">
	import { getConsentContext } from '@c15t/svelte';

	const consent = getConsentContext();
	const languages = ['en', 'zh', 'fr', 'de'];

	function cycleLanguage() {
		const currentLang = consent.state.translationConfig?.defaultLanguage ?? 'en';
		const currentIndex = languages.indexOf(currentLang);
		const nextIndex = (currentIndex + 1) % languages.length;
		consent.state.setLanguage(languages[nextIndex]);
	}
</script>

<button
	onclick={cycleLanguage}
	class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
	aria-label="Change language"
>
	<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
</button>
