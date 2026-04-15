<script lang="ts">
	import {
		accordionVariants,
		getAccordionItemState,
		toggleAccordionValue,
	} from '@c15t/svelte';

	interface Props {
		item1Title?: string;
		item1Description?: string;
		item2Title?: string;
		item2Description?: string;
		type?: 'single' | 'multiple';
		initialValue?: string | string[];
	}

	const {
		item1Title = 'Strictly Necessary',
		item1Description = 'These cookies are essential for the website to function properly.',
		item2Title = 'Analytics',
		item2Description = 'These cookies help us understand how visitors interact with the website.',
		type = 'single',
		initialValue = 'purpose-1',
	}: Props = $props();

	let value: string | string[] | undefined = $state(initialValue);
	const classes = accordionVariants();
</script>

<div style="display:grid;gap:0.75rem;width:28rem;">
	<div class={classes.root()}>
		<div class={classes.item()} data-slot="accordion-item" data-state={getAccordionItemState(type, value, 'purpose-1')}>
			<button
				class={classes.trigger()}
				type="button"
				onclick={() => {
					value = toggleAccordionValue({
						type,
						value,
						itemValue: 'purpose-1',
						collapsible: true,
					});
				}}
			>
				<span>{item1Title}</span>
				<span aria-hidden="true">{getAccordionItemState(type, value, 'purpose-1') === 'open' ? '-' : '+'}</span>
			</button>
			<div class={classes.content()} data-slot="accordion-content" data-state={getAccordionItemState(type, value, 'purpose-1')}>
				<div data-slot="accordion-content-viewport">
					<div class={classes.contentInner()}>
						<p style="margin:0;">{item1Description}</p>
					</div>
				</div>
			</div>
		</div>
		<div class={classes.item()} data-slot="accordion-item" data-state={getAccordionItemState(type, value, 'purpose-2')}>
			<button
				class={classes.trigger()}
				type="button"
				onclick={() => {
					value = toggleAccordionValue({
						type,
						value,
						itemValue: 'purpose-2',
						collapsible: true,
					});
				}}
			>
				<span>{item2Title}</span>
				<span aria-hidden="true">{getAccordionItemState(type, value, 'purpose-2') === 'open' ? '-' : '+'}</span>
			</button>
			<div class={classes.content()} data-slot="accordion-content" data-state={getAccordionItemState(type, value, 'purpose-2')}>
				<div data-slot="accordion-content-viewport">
					<div class={classes.contentInner()}>
						<p style="margin:0;">{item2Description}</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
