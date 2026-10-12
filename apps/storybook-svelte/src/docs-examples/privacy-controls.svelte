<!-- #region docs:privacy-controls title="src/lib/privacy-controls.svelte" -->
<script lang="ts">
	import { ConsentDialog, getConsentManager } from '@c15t/svelte';

	const consent = getConsentManager();

	// Record one category from your own button. setConsent changes the draft;
	// saveConsents('custom') records it.
	const allowAnalytics = async () => {
		consent.setConsent('measurement', true);
		await consent.saveConsents('custom');
	};
</script>

<button
	type="button"
	onclick={() => consent.setActiveUI('dialog')}
>
	Privacy settings
</button>
<button
	type="button"
	onclick={allowAnalytics}
>
	Allow analytics
</button>
<ConsentDialog />
<!-- #endregion docs:privacy-controls -->
