<script lang="ts">
	import { buttonVariants } from '@c15t/svelte';

	const primaryFilled = buttonVariants({ mode: 'filled', variant: 'primary' });
	const neutralFilled = buttonVariants({ mode: 'filled', variant: 'neutral' });
	const primaryStroke = buttonVariants({ mode: 'stroke', variant: 'primary' });
	const neutralStroke = buttonVariants({ mode: 'stroke', variant: 'neutral' });
	const primaryLighter = buttonVariants({
		mode: 'lighter',
		variant: 'primary',
	});
	const neutralGhost = buttonVariants({ mode: 'ghost', variant: 'neutral' });
</script>

<div
	style="display:grid;gap:0.75rem;grid-template-columns:repeat(2, minmax(0, max-content));"
>
	<button
		class={primaryFilled.root()}
		type="button">Primary filled</button
	>
	<button
		class={neutralFilled.root()}
		type="button">Neutral filled</button
	>
	<button
		class={primaryStroke.root()}
		type="button">Primary stroke</button
	>
	<button
		class={neutralStroke.root()}
		type="button">Neutral stroke</button
	>
	<button
		class={primaryLighter.root()}
		type="button">Primary lighter</button
	>
	<button
		class={neutralGhost.root()}
		type="button">Neutral ghost</button
	>
</div>
