<script lang="ts">
import ConsentBanner from '../../lib/components/consent-banner.svelte';
import ConsentDialog from '../../lib/components/consent-dialog.svelte';
import ConsentDialogTrigger from '../../lib/components/consent-dialog-trigger.svelte';
import ConsentProvider from '../../lib/components/consent-provider.svelte';
import type { ConsentProviderOptions } from '../../lib/types';

let {
	options,
	showWhen = 'always' as 'always' | 'after-consent' | 'never',
}: {
	options: ConsentProviderOptions;
	showWhen?: 'always' | 'after-consent' | 'never';
} = $props();
</script>

<ConsentProvider {options}>
	<ConsentBanner />
	<ConsentDialog />
	<ConsentDialogTrigger {showWhen} />
</ConsentProvider>
