import type { ComponentChildren, VNode } from 'preact';
import {
    Children,
    type ComponentType,
    cloneElement,
    isValidElement,
} from 'preact/compat';

type VNodeLike = {
	type?: unknown;
	props?: Record<string, unknown>;
	key?: string | number | null;
};

type MaybeNamed = { displayName?: string; name?: string };

function getDisplayName(t: unknown): string {
	// Runtime check without using the Function type annotation
	if (typeof t === 'function' || (t !== null && typeof t === 'object')) {
		const comp = t as MaybeNamed;
		return comp.displayName ?? comp.name ?? '';
	}
	return '';
}

/**
 * Recursively clones Preact children, adding additional props to components with matched display names.
 */
export function recursiveCloneChildren(
	children: ComponentChildren,
	additionalProps: Record<string, unknown>,
	displayNames: string[],
	uniqueId: string,
	asChild?: boolean
): ComponentChildren {
	const mappedChildren = Children.map(children, (child) => {
		if (!isValidElement(child)) {
			return child;
		}

		const childNode = child as VNodeLike;

		const displayName =
			typeof childNode.type === 'function'
				? // Safe extraction without typing as Function
					((childNode.type as ComponentType & MaybeNamed).displayName ??
					getDisplayName(childNode.type))
				: getDisplayName(childNode.type);

		const newProps = displayNames.includes(displayName) ? additionalProps : {};
		const childProps = childNode.props ?? {};

		return cloneElement(
			child as unknown as VNode,
			{
				...newProps,
				key: `${uniqueId}-${childNode.key ?? displayName}`,
			},
			recursiveCloneChildren(
				childProps.children as ComponentChildren,
				additionalProps,
				displayNames,
				uniqueId,
				(childProps as { asChild?: boolean }).asChild
			)
		);
	});

	if (asChild) {
		return Array.isArray(mappedChildren)
			? (mappedChildren[0] ?? null)
			: mappedChildren;
	}
	return mappedChildren;
}
