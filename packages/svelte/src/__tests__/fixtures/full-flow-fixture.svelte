<script lang="ts">
import ConsentBanner from '../../components/consent-banner.svelte';
import ConsentDialog from '../../components/consent-dialog.svelte';
import ConsentDialogTrigger from '../../components/consent-dialog-trigger.svelte';
import ConsentManagerProvider from '../../components/consent-manager-provider.svelte';
import type { ConsentManagerOptions } from '../../types';

let {
	options,
	showWhen = 'always' as 'always' | 'after-consent' | 'never',
}: {
	options: ConsentManagerOptions;
	showWhen?: 'always' | 'after-consent' | 'never';
} = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentBanner />
	<ConsentDialog />
	<ConsentDialogTrigger {showWhen} />
</ConsentManagerProvider>
