<script lang="ts">
	import { PreferenceItem } from '../../lib/primitives';
</script>

<PreferenceItem.Root
	data-testid="headless"
	noStyle
	open
>
	<PreferenceItem.Trigger data-testid="headless-trigger"
		>Toggle</PreferenceItem.Trigger
	>
	<PreferenceItem.Content data-testid="headless-content"
		>Body</PreferenceItem.Content
	>
</PreferenceItem.Root>

<PreferenceItem.Root
	data-testid="owned"
	noStyle
	open
>
	<PreferenceItem.Trigger data-testid="owned-trigger"
		>Toggle</PreferenceItem.Trigger
	>
	<PreferenceItem.Content
		data-testid="owned-content"
		noStyle={false}
	>
		Body
	</PreferenceItem.Content>
</PreferenceItem.Root>
