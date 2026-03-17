<script lang="ts">
import ConsentDialog from '../../components/ConsentDialog.svelte';
import ConsentDialogLink from '../../components/ConsentDialogLink.svelte';
import ConsentManagerProvider from '../../components/ConsentManagerProvider.svelte';
import type { ConsentManagerOptions } from '../../types';

let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentDialogLink>Manage Preferences</ConsentDialogLink>
	<ConsentDialog />
</ConsentManagerProvider>
