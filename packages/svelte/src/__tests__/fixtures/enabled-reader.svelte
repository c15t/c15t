<script lang="ts">
	import { getConsentContext } from '../../lib/context.svelte';

	const consent = getConsentContext();
</script>

<div data-testid="marketing">{String(consent.state.has('marketing'))}</div>
<div data-testid="active-ui">{consent.state.activeUI}</div>
