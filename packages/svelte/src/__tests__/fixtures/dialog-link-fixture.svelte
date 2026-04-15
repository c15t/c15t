<script lang="ts">
import ConsentDialog from '../../components/consent-dialog.svelte';
import ConsentDialogLink from '../../components/consent-dialog-link.svelte';
import ConsentManagerProvider from '../../components/consent-manager-provider.svelte';
import type { ConsentManagerOptions } from '../../types';

let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentDialogLink>Manage Preferences</ConsentDialogLink>
	<ConsentDialog />
</ConsentManagerProvider>
