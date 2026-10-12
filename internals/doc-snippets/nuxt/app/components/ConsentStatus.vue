<!-- #region docs:consent-status title="app/components/ConsentStatus.vue" -->
<script setup lang="ts">
// May measurement code run right now?
const permissions = useConsent();
// What did the visitor decide? `null` until they accept, reject or save.
const choice = useExplicitChoice();
const activeUI = useConsentActiveUI();
</script>

<template>
	<section aria-label="Your privacy choices">
		<p v-if="choice">You saved your privacy choices.</p>
		<p v-else>You have not made a privacy choice yet.</p>
		<p>
			Measurement is
			{{ permissions.measurement ? 'allowed' : 'not allowed' }} right now.
		</p>
		<button
			type="button"
			@click="activeUI = 'manager'"
		>
			Change your choices
		</button>
	</section>
</template>
<!-- #endregion docs:consent-status -->
