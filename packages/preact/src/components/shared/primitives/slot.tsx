import type { Signal } from '@preact/signals';
import type { JSX } from 'preact';
// ~/components/shared/primitives/slot.tsx
import {
    type ComponentChildren,
    cloneElement,
    toChildArray,
    type VNode,
} from 'preact';
import { forwardRef, type Ref } from 'preact/compat';

type Signalish<T> = T | Signal<T>;
type WithRef<E extends HTMLElement> = JSX.HTMLAttributes<E> & { ref?: Ref<E> };

function composeRefs<T>(...refs: Array<Ref<T> | undefined>) {
	return (value: T) => {
		for (const ref of refs) {
			if (!ref) continue;
			if (typeof ref === 'function') {
				ref(value);
			} else {
				try {
					(ref as { current: T }).current = value;
				} catch {
					/* noop */
				}
			}
		}
	};
}

function unwrap<T>(v: Signalish<T> | undefined): T | undefined {
	return v && typeof v === 'object' && 'value' in v
		? (v as Signal<T>).value
		: v;
}

function mergeClassName(a?: string, b?: string) {
	return [a, b].filter(Boolean).join(' ');
}

function mergeStyle(
	a?: JSX.CSSProperties | string,
	b?: JSX.CSSProperties | string
): JSX.CSSProperties | string | undefined {
	// If either side is a string, return the explicitly provided one
	if (typeof b === 'string' || typeof a === 'string') return b ?? a;
	return { ...(a || {}), ...(b || {}) };
}

export interface SlotProps<E extends HTMLElement = HTMLElement>
	extends Omit<WithRef<E>, 'children' | 'ref' | 'className' | 'style'> {
	children?: ComponentChildren;
	className?: Signalish<string | undefined>;
	// Allow object or string styles, optionally signal wrapped
	style?: Signalish<JSX.CSSProperties | string | undefined>;
}

/**
 * Strict Slot: accepts any children, picks the first valid element child,
 * merges props and className/style, and composes refs. Falls back to a span
 * without forwarding the element ref to avoid type mismatches.
 */
export const Slot = forwardRef(function Slot<E extends HTMLElement>(
	{ children, className, style, ...slotProps }: SlotProps<E>,
	ref: Ref<E>
) {
	const child = toChildArray(children)[0] as VNode<WithRef<E>> | undefined;

	const resolvedClass = unwrap(className);
	const resolvedStyle = unwrap(style);

	if (!child || typeof child !== 'object' || !('props' in child)) {
		return (
			<span
				{...(slotProps as JSX.HTMLAttributes<HTMLSpanElement>)}
				className={resolvedClass}
				style={resolvedStyle as JSX.CSSProperties | string | undefined}
			>
				{children}
			</span>
		);
	}

	const childProps = (child.props ?? {}) as WithRef<E>;
	const mergedRef = composeRefs(ref, childProps.ref);

	return cloneElement(child, {
		...slotProps,
		...childProps,
		className: mergeClassName(
			childProps.className?.toString(),
			resolvedClass?.toString()
		),
		style: mergeStyle(
			childProps.style as JSX.CSSProperties | string | undefined,
			resolvedStyle as JSX.CSSProperties | string | undefined
		),
		ref: mergedRef,
	});
}) as <E extends HTMLElement = HTMLElement>(
	props: SlotProps<E> & { ref?: Ref<E> }
) => VNode<SlotProps<E>>;
