<script lang="ts">
	import type { AccordionType } from '@c15t/ui/primitives';
	import { toggleAccordionValue } from '@c15t/ui/primitives';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { setAccordionRootContext } from './context';

	let {
		children,
		class: className,
		collapsible = false,
		type,
		value = $bindable<string | string[] | undefined>(
			type === 'multiple' ? [] : undefined
		),
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		collapsible?: boolean;
		type: AccordionType;
		value?: string | string[];
	} = $props();

	function setValue(nextValue: string | string[] | undefined) {
		value = nextValue;
	}

	function toggleItem(itemValue: string) {
		setValue(
			toggleAccordionValue({
				collapsible,
				itemValue,
				type,
				value,
			})
		);
	}

	setAccordionRootContext({
		get collapsible() {
			return collapsible;
		},
		get type() {
			return type;
		},
		get value() {
			return value;
		},
		toggleItem,
	});
</script>

<div class={className} data-slot="accordion-root" {...restProps}>
	{@render children?.()}
</div>
