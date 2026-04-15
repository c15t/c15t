<script lang="ts">
	import { untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { AccordionType } from '@c15t/ui/primitives';
	import { setAccordionRootContext } from './context';
	import { toggleAccordionValue } from '@c15t/ui/primitives';

	let {
		children,
		class: className,
		collapsible = false,
		defaultValue,
		onValueChange,
		type,
		value: valueProp,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		children?: Snippet;
		class?: string;
		collapsible?: boolean;
		defaultValue?: string | string[];
		onValueChange?: (details: { value: string | string[] | undefined }) => void;
		type: AccordionType;
		value?: string | string[];
	} = $props();

	let internalValue = $state<string | string[] | undefined>(
		untrack(() => defaultValue ?? (type === 'multiple' ? [] : undefined))
	);

	const value = $derived(valueProp ?? internalValue);

	function setValue(nextValue: string | string[] | undefined) {
		if (valueProp === undefined) {
			internalValue = nextValue;
		}

		onValueChange?.({ value: nextValue });
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
