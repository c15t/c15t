<script lang="ts">
import ConsentDialog from '../../lib/components/consent-dialog.svelte';
import ConsentDialogLink from '../../lib/components/consent-dialog-link.svelte';
import ConsentProvider from '../../lib/components/consent-provider.svelte';
import type { ConsentProviderOptions } from '../../lib/types';

let { options }: { options: ConsentProviderOptions } = $props();
</script>

<ConsentProvider {options}>
	<ConsentDialogLink>Manage Preferences</ConsentDialogLink>
	<ConsentDialog />
</ConsentProvider>
