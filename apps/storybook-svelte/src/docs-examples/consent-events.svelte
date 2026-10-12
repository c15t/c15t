<!-- #region docs:consent-events title="src/lib/consent-events.svelte" -->
<script lang="ts">
	import { getConsentKernel } from '@c15t/svelte';

	// Read the kernel at the top level; subscribe in an effect so the
	// listener is removed when the component unmounts.
	const kernel = getConsentKernel();
	let lastRecorded = $state<string | null>(null);

	$effect(() =>
		kernel.events.on('choice:recorded', ({ snapshot }) => {
			const { measurement } = snapshot.effectivePermissions;
			lastRecorded = measurement ? 'measurement allowed' : 'measurement denied';
		})
	);
</script>

<p data-testid="last-recorded">
	{lastRecorded ?? 'No choice recorded on this page yet'}
</p>
<!-- #endregion docs:consent-events -->
