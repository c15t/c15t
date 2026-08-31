/**
 * AccordionHeader + AccordionTrigger (Reka-compatible `as-child` surface,
 * RFC 0003).
 *
 * The consent manager renders the trigger `as-child` onto a plain div —
 * required because the row CONTAINS an interactive switch, and a native
 * `<button>` wrapper would nest interactive elements (invalid + broken AT).
 * These render-function components clone the slotted element and merge the
 * trigger semantics onto it, mirroring Reka's asChild behavior for the
 * exact usage the components need (nothing more).
 */
import { cloneVNode, defineComponent, inject, mergeProps } from 'vue';
import type { VNode } from 'vue';

import { accordionItemContextKey } from './keys';

const firstElementVNode = function firstElementVNode(
	nodes: VNode[] | undefined
): VNode | null {
	if (!nodes) {
		return null;
	}
	for (const node of nodes) {
		if (typeof node.type !== 'symbol') {
			return node;
		}
	}
	return null;
};

export const AccordionHeader = defineComponent({
	name: 'AccordionHeader',
	props: { asChild: { default: false, type: Boolean } },
	setup(_props, { slots }) {
		// Only the as-child form is used: header is a pure pass-through.
		return () => slots.default?.();
	},
});

export const AccordionTrigger = defineComponent({
	inheritAttrs: false,
	name: 'AccordionTrigger',
	props: { asChild: { default: false, type: Boolean } },
	setup(_props, { slots, attrs }) {
		const item = inject(accordionItemContextKey);

		const toggle = function toggle() {
			item?.toggle();
		};

		return function () {
			const child = firstElementVNode(slots.default?.());
			if (!child) {
				return null;
			}
			const open = item?.open() ?? false;
			return cloneVNode(
				child,
				mergeProps(attrs, {
					'aria-expanded': open ? 'true' : 'false',
					'data-state': open ? 'open' : 'closed',
					onClick: toggle,
					onKeydown: (event: KeyboardEvent) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							toggle();
						}
					},
					role: 'button',
					tabindex: 0,
				})
			);
		};
	},
});
