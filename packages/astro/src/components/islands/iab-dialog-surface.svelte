<!--
	The IAB TCF preference centre, on its own chunk.

	The TCF surface is the biggest thing either dialog can render — vendor
	lists, purposes, stacks — and only a site that configured IAB ever shows
	it. Keeping it in its own island means the preference-centre chunk that
	every other site downloads does not carry it.
-->
<script lang="ts">
	import { IABConsentDialog } from '@c15t/svelte';
</script>

<IABConsentDialog />
