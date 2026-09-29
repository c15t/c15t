<!-- #region docs:consent-status title="src/lib/consent-status.svelte" -->
<script lang="ts">
	import { getConsentManager } from '@c15t/svelte';

	// Call getters at the top level of the component, inside the provider.
	const consent = getConsentManager();

	// A permission: may measurement code run now?
	const measurementAllowed = $derived(consent.has('measurement'));
	// A recorded choice: what did the visitor decide? `null` until they choose.
	const measurementChoice = $derived(
		consent.explicitChoice?.categories.measurement?.value
	);
</script>

<dl>
	<dt>Measurement may run</dt>
	<dd data-testid="measurement-permission">
		{measurementAllowed ? 'Yes' : 'No'}
	</dd>
	<dt>Visitor's measurement choice</dt>
	<dd data-testid="measurement-choice">
		{measurementChoice === undefined
			? 'Not chosen'
			: measurementChoice
				? 'Allowed'
				: 'Denied'}
	</dd>
</dl>
<!-- #endregion docs:consent-status -->
