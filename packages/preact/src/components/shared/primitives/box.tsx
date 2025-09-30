'use client';
import type { JSX } from 'preact';
import { forwardRef } from 'preact/compat';
import { useStyles } from '~/hooks/use-styles';
import type { ExtendThemeKeys } from '~/types/theme';
import { Slot } from './slot';

/**
 * Props for a themed Box primitive used across the banner.
 *
 * @public
 */
export interface BoxProps
	extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'style' | 'className'>,
		Omit<ExtendThemeKeys, 'className'> {
	className?: string;
	asChild?: boolean;
}

/**
 * Themed Box primitive that merges context styles with local props.
 *
 * @public
 */
export const Box = forwardRef<HTMLDivElement, BoxProps>(
	({ asChild, className, style, themeKey, baseClassName, ...props }, ref) => {
		const composed = useStyles(themeKey, {
			baseClassName,
			className: className?.toString(),
			style,
		});

		return asChild ? (
			<Slot>
				<div ref={ref} {...props} {...composed} />
			</Slot>
		) : (
			<div ref={ref} {...props} {...composed} />
		);
	}
);

Box.displayName = 'Box';
