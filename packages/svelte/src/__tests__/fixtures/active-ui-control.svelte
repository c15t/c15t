<script lang="ts">
	import { getConsentContext } from '../../lib/context.svelte';

	const consent = getConsentContext();
</script>

<div data-testid="active-ui">{consent.state.activeUI}</div>
<button
	type="button"
	data-testid="open-dialog"
	onclick={() => consent.state.setActiveUI('dialog')}
>
	Open
</button>
