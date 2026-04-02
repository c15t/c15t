<script lang="ts">
	import {
		accordionVariants,
		getAccordionItemState,
		toggleAccordionValue,
	} from '@c15t/framework-svelte';

	interface Props {
		item1Title?: string;
		item1Description?: string;
		item2Title?: string;
		item2Description?: string;
	}

	const {
		item1Title = 'Marketing',
		item1Description = 'These cookies are used to deliver relevant advertisements.',
		item2Title = 'Functionality',
		item2Description = 'These cookies enable enhanced functionality and personalization.',
	}: Props = $props();

	let value: string | string[] | undefined = $state(['purpose-1', 'purpose-2']);
	const classes = accordionVariants();
</script>

<div style="display:grid;gap:0.75rem;width:28rem;">
	<div class={classes.root()}>
		<div class={classes.item()} data-state={getAccordionItemState('multiple', value, 'purpose-1')}>
			<button
				class={classes.trigger()}
				type="button"
				onclick={() => {
					value = toggleAccordionValue({
						type: 'multiple',
						value,
						itemValue: 'purpose-1',
					});
				}}
			>
				<span>{item1Title}</span>
				<span aria-hidden="true">{getAccordionItemState('multiple', value, 'purpose-1') === 'open' ? '-' : '+'}</span>
			</button>
			<div class={classes.content()} data-state={getAccordionItemState('multiple', value, 'purpose-1')}>
				{#if getAccordionItemState('multiple', value, 'purpose-1') === 'open'}
					<div class={classes.contentInner()}>
						<p style="margin:0;">{item1Description}</p>
					</div>
				{/if}
			</div>
		</div>
		<div class={classes.item()} data-state={getAccordionItemState('multiple', value, 'purpose-2')}>
			<button
				class={classes.trigger()}
				type="button"
				onclick={() => {
					value = toggleAccordionValue({
						type: 'multiple',
						value,
						itemValue: 'purpose-2',
					});
				}}
			>
				<span>{item2Title}</span>
				<span aria-hidden="true">{getAccordionItemState('multiple', value, 'purpose-2') === 'open' ? '-' : '+'}</span>
			</button>
			<div class={classes.content()} data-state={getAccordionItemState('multiple', value, 'purpose-2')}>
				{#if getAccordionItemState('multiple', value, 'purpose-2') === 'open'}
					<div class={classes.contentInner()}>
						<p style="margin:0;">{item2Description}</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
