<!-- #region docs:iab-surfaces title="src/lib/consent-surfaces.svelte" -->
<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		IABConsentBanner,
		IABConsentDialog,
	} from '@c15t/svelte';

	// Load after @c15t/svelte/styles.css.
	import '@c15t/svelte/iab/styles.css';
</script>

<!-- Visitors whose policy is not IAB get the standard banner and dialog. -->
<ConsentBanner />
<ConsentDialog />
<!-- Visitors under an IAB policy get the TCF banner and preference center. -->
<IABConsentBanner />
<IABConsentDialog />
<!-- #endregion docs:iab-surfaces -->
