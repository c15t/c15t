<!-- #region docs:embed -->
<!-- A Vapor component passing both slots to ConsentGate. -->
<script setup vapor lang="ts"></script>

<template>
	<ConsentGate category="measurement">
		<iframe
			src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y"
			title="YouTube video"
			loading="lazy"
			allowfullscreen
		/>
		<template #placeholder>
			<p>Allow measurement to load this YouTube video.</p>
			<ConsentPreferencesLink>Choose video permissions</ConsentPreferencesLink>
		</template>
	</ConsentGate>
</template>
<!-- #endregion docs:embed -->
