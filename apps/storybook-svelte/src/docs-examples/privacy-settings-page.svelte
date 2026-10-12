<!-- #region docs:privacy-settings-page title="src/routes/privacy/+page.svelte" -->
<script lang="ts">
	import { ConsentWidget } from '@c15t/svelte';
</script>

<h1>Privacy settings</h1>
<p>Choose which optional cookies this site may use.</p>
<!-- The category switches and save buttons, inline on the page. -->
<ConsentWidget />
<!-- #endregion docs:privacy-settings-page -->
