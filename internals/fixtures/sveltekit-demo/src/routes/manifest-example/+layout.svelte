<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentRoot,
	} from '@c15t/svelte';

	import { scripts } from '#lib/example-scripts.js';

	let { children, data } = $props();
</script>

<ConsentRoot
	state={data.consent}
	{scripts}
>
	{@render children()}
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<ConsentBanner />
	<ConsentDialog />
</ConsentRoot>
