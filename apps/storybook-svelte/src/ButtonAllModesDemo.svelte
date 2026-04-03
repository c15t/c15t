<script lang="ts">
	import { buttonVariants } from '@c15t/svelte';

	const primaryFilled = buttonVariants({ variant: 'primary', mode: 'filled' });
	const neutralFilled = buttonVariants({ variant: 'neutral', mode: 'filled' });
	const primaryStroke = buttonVariants({ variant: 'primary', mode: 'stroke' });
	const neutralStroke = buttonVariants({ variant: 'neutral', mode: 'stroke' });
	const primaryLighter = buttonVariants({ variant: 'primary', mode: 'lighter' });
	const neutralGhost = buttonVariants({ variant: 'neutral', mode: 'ghost' });
</script>

<div style="display:grid;gap:0.75rem;grid-template-columns:repeat(2, minmax(0, max-content));">
	<button class={primaryFilled.root()} type="button">Primary filled</button>
	<button class={neutralFilled.root()} type="button">Neutral filled</button>
	<button class={primaryStroke.root()} type="button">Primary stroke</button>
	<button class={neutralStroke.root()} type="button">Neutral stroke</button>
	<button class={primaryLighter.root()} type="button">Primary lighter</button>
	<button class={neutralGhost.root()} type="button">Neutral ghost</button>
</div>
