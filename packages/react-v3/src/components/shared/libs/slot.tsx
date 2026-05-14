import {
	cloneElement,
	forwardRef,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type Ref,
	type RefCallback,
} from 'react';

function composeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
	return (node) => {
		for (const ref of refs) {
			if (typeof ref === 'function') {
				ref(node);
				continue;
			}

			if (ref && 'current' in ref) {
				ref.current = node;
			}
		}
	};
}

function mergeEventHandlers(
	slotHandler: unknown,
	childHandler: unknown
): unknown {
	if (typeof slotHandler !== 'function') {
		return childHandler;
	}

	if (typeof childHandler !== 'function') {
		return slotHandler;
	}

	return (event: Event) => {
		(childHandler as (event: Event) => void)(event);
		(slotHandler as (event: Event) => void)(event);
	};
}

type SlotProps = Record<string, unknown> & {
	children: ReactNode;
};

export const Slot = forwardRef<HTMLElement, SlotProps>(
	({ children, ...slotProps }, forwardedRef) => {
		if (!isValidElement(children)) {
			return null;
		}

		const child = children as ReactElement<Record<string, unknown>>;
		const childProps = child.props;
		const childRef = (child as unknown as { ref?: Ref<HTMLElement> }).ref;
		const mergedProps: Record<string, unknown> = {
			...slotProps,
			...childProps,
			className: [slotProps.className, childProps.className]
				.filter(Boolean)
				.join(' '),
			style: {
				...(slotProps.style as Record<string, unknown> | undefined),
				...(childProps.style as Record<string, unknown> | undefined),
			},
			ref: composeRefs(forwardedRef, childRef),
		};

		for (const [key, value] of Object.entries(slotProps)) {
			if (!/^on[A-Z]/.test(key)) {
				continue;
			}

			mergedProps[key] = mergeEventHandlers(value, childProps[key]);
		}

		return cloneElement(child, mergedProps);
	}
);

Slot.displayName = 'Slot';
