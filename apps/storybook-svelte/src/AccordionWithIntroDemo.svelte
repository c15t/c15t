<script lang="ts">
	import {
		accordionVariants,
		getAccordionItemState,
		toggleAccordionValue,
	} from '@c15t/framework-svelte';

	interface Props {
		introTitle?: string;
		introDescription?: string;
		item1Title?: string;
		item1Description?: string;
		item2Title?: string;
		item2Description?: string;
	}

	const {
		introTitle = 'Privacy Settings',
		introDescription = 'Customize your privacy settings here. You can choose which types of cookies and tracking technologies you allow.',
		item1Title = 'Strictly Necessary',
		item1Description = 'These cookies are essential for the website to function properly.',
		item2Title = 'Analytics',
		item2Description = 'These cookies help us understand how visitors interact with the website.',
	}: Props = $props();

	let value: string | string[] | undefined = $state('purpose-1');
	const classes = accordionVariants();
</script>

<div style="display:grid;gap:1rem;width:32rem;">
	<div style="display:grid;gap:0.5rem;">
		<h3 style="font-size:1.25rem;margin:0;">{introTitle}</h3>
		<p style="color:var(--c15t-text-muted);margin:0;">{introDescription}</p>
	</div>
	<div class={classes.root()}>
		<div class={classes.item()} data-state={getAccordionItemState('single', value, 'purpose-1')}>
			<button
				class={classes.trigger()}
				type="button"
				onclick={() => {
					value = toggleAccordionValue({
						type: 'single',
						value,
						itemValue: 'purpose-1',
						collapsible: true,
					});
				}}
			>
				<span>{item1Title}</span>
				<span aria-hidden="true">{getAccordionItemState('single', value, 'purpose-1') === 'open' ? '-' : '+'}</span>
			</button>
			<div class={classes.content()} data-state={getAccordionItemState('single', value, 'purpose-1')}>
				{#if getAccordionItemState('single', value, 'purpose-1') === 'open'}
					<div class={classes.contentInner()}>
						<p style="margin:0;">{item1Description}</p>
					</div>
				{/if}
			</div>
		</div>
		<div class={classes.item()} data-state={getAccordionItemState('single', value, 'purpose-2')}>
			<button
				class={classes.trigger()}
				type="button"
				onclick={() => {
					value = toggleAccordionValue({
						type: 'single',
						value,
						itemValue: 'purpose-2',
						collapsible: true,
					});
				}}
			>
				<span>{item2Title}</span>
				<span aria-hidden="true">{getAccordionItemState('single', value, 'purpose-2') === 'open' ? '-' : '+'}</span>
			</button>
			<div class={classes.content()} data-state={getAccordionItemState('single', value, 'purpose-2')}>
				{#if getAccordionItemState('single', value, 'purpose-2') === 'open'}
					<div class={classes.contentInner()}>
						<p style="margin:0;">{item2Description}</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
