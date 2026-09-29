<!-- #region docs:floating-trigger title="src/lib/privacy-trigger.svelte" -->
<script lang="ts">
	import { ConsentDialog, ConsentDialogTrigger } from '@c15t/svelte';
</script>

<!-- A floating button in the bottom-left corner that opens preferences.
     Visitors can drag it to another corner; c15t remembers where. -->
<ConsentDialogTrigger
	defaultPosition="bottom-left"
	size="sm"
/>
<ConsentDialog />
<!-- #endregion docs:floating-trigger -->
