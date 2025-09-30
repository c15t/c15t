import type {
    ComponentPropsWithoutRef,
    ElementType,
    PropsWithChildren,
} from 'preact/compat';

type AsProp<T extends ElementType> = {
	as?: T;
};

type PropsToOmit<T extends ElementType, P> = keyof (AsProp<T> & P);

type PolymorphicComponentProp<
	T extends ElementType,
	Props extends Record<string, unknown> = Record<string, unknown>,
> = PropsWithChildren<Props & AsProp<T>> &
	Omit<ComponentPropsWithoutRef<T>, PropsToOmit<T, Props>>;

export type PolymorphicComponentProps<
	T extends ElementType,
	P extends Record<string, unknown> = Record<string, unknown>,
> = PolymorphicComponentProp<T, P>;
