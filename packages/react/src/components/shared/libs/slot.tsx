import {
	createElement,
	forwardRef as createForwardRef,
	isValidElement,
} from 'react';
import type { ReactElement, ReactNode, Ref, RefCallback } from 'react';

const composeRefs = function composeRefs<T>(
	...refs: (Ref<T> | undefined)[]
): RefCallback<T> {
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
};

const mergeEventHandlers = function mergeEventHandlers(
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
};

type SlotProps = Record<string, unknown> & {
	children: ReactNode;
};

const isReactWarningGetter = function isReactWarningGetter(
	target: Record<string, unknown> | ReactElement<Record<string, unknown>>,
	key: string
): boolean {
	const getter = Object.getOwnPropertyDescriptor(target, key)?.get;
	return (
		typeof getter === 'function' &&
		(getter as { isReactWarning?: boolean }).isReactWarning === true
	);
};

/**
 * Read a child's ref without tripping a deprecation warning.
 *
 * React 19 moved `ref` onto `props` and made `element.ref` a warning
 * getter in development; React 16 to 18 did the reverse and made
 * `props.ref` the warning getter. Each getter is flagged with
 * `isReactWarning`, so check it before touching either location.
 */
const getElementRef = function getElementRef(
	element: ReactElement<Record<string, unknown>>
): Ref<HTMLElement> | undefined {
	if (isReactWarningGetter(element.props, 'ref')) {
		return (element as unknown as { ref?: Ref<HTMLElement> }).ref;
	}
	if (isReactWarningGetter(element, 'ref')) {
		return element.props.ref as Ref<HTMLElement> | undefined;
	}
	return (
		(element.props.ref as Ref<HTMLElement> | undefined) ??
		(element as unknown as { ref?: Ref<HTMLElement> }).ref
	);
};

export const Slot = createForwardRef<HTMLElement, SlotProps>(
	({ children, ...slotProps }, forwardedRef) => {
		if (!isValidElement(children)) {
			return null;
		}

		const child = children as ReactElement<Record<string, unknown>>;
		const childProps = child.props;
		const childRef = getElementRef(child);
		const mergedProps: Record<string, unknown> = {
			...slotProps,
			...childProps,
			className: [slotProps.className, childProps.className]
				.filter(Boolean)
				.join(' '),
			ref: composeRefs(forwardedRef, childRef),
			style: {
				...(slotProps.style as Record<string, unknown> | undefined),
				...(childProps.style as Record<string, unknown> | undefined),
			},
		};

		for (const [key, value] of Object.entries(slotProps)) {
			if (!/^on[A-Z]/u.test(key)) {
				continue;
			}

			mergedProps[key] = mergeEventHandlers(value, childProps[key]);
		}

		return createElement(child.type, {
			key: child.key ?? undefined,
			...mergedProps,
		});
	}
);

Slot.displayName = 'Slot';
