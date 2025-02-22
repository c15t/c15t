import type {
	ComponentPropsWithRef,
	ComponentPropsWithoutRef,
	ElementType,
	PropsWithChildren,
	ReactNode,
} from 'react';

type AsProp<T extends ElementType> = {
	as?: T;
};

type PropsToOmit<T extends ElementType, P> = keyof (AsProp<T> & P);

type PolymorphicComponentProp<
	T extends ElementType,
	Props extends Record<string, unknown> = Record<string, unknown>,
> = PropsWithChildren<Props & AsProp<T>> &
	Omit<ComponentPropsWithoutRef<T>, PropsToOmit<T, Props>>;

export type PolymorphicRef<T extends ElementType> =
	ComponentPropsWithRef<T>['ref'];

type PolymorphicComponentPropWithRef<
	T extends ElementType,
	Props extends Record<string, unknown> = Record<string, unknown>,
> = PolymorphicComponentProp<T, Props> & { ref?: PolymorphicRef<T> };

export type PolymorphicComponentPropsWithRef<
	T extends ElementType,
	P extends Record<string, unknown> = Record<string, unknown>,
> = PolymorphicComponentPropWithRef<T, P>;

export type PolymorphicComponentProps<
	T extends ElementType,
	P extends Record<string, unknown> = Record<string, unknown>,
> = PolymorphicComponentProp<T, P>;

export type PolymorphicComponent<P extends Record<string, unknown>> = <
	T extends ElementType,
>(
	props: PolymorphicComponentPropsWithRef<T, P>
) => ReactNode;
