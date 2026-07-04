<script lang="ts">
import ConsentDialog from '../../lib/components/consent-dialog.svelte';
import ConsentDialogLink from '../../lib/components/consent-dialog-link.svelte';
import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
import type { ConsentManagerOptions } from '../../lib/types';

let { options }: { options: ConsentManagerOptions } = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentDialogLink>Manage Preferences</ConsentDialogLink>
	<ConsentDialog />
</ConsentManagerProvider>
