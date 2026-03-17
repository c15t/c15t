<script lang="ts">
import ConsentManagerProvider from '../../components/ConsentManagerProvider.svelte';
import ConsentWidget from '../../components/ConsentWidget.svelte';
import type { ConsentManagerOptions } from '../../types';

let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentWidget />
</ConsentManagerProvider>
