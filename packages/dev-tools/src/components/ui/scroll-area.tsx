'use client';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	forwardRef,
} from 'react';
import { cn } from '~/libs/utils';
import styles from './scroll-area.module.css';

interface ScrollAreaProps
	extends ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
	orientation?: 'vertical' | 'horizontal' | 'both';
}

const ScrollArea = forwardRef<
	ComponentRef<typeof ScrollAreaPrimitive.Root>,
	ScrollAreaProps
>(({ className, children, orientation = 'vertical', ...props }, ref) => (
	<ScrollAreaPrimitive.Root
		ref={ref}
		className={cn(styles.root, className)}
		data-orientation={orientation}
		{...props}
	>
		<ScrollAreaPrimitive.Viewport className={styles.viewport}>
			{children}
		</ScrollAreaPrimitive.Viewport>
		{(orientation === 'vertical' || orientation === 'both') && (
			<ScrollBar orientation="vertical" />
		)}
		{(orientation === 'horizontal' || orientation === 'both') && (
			<ScrollBar orientation="horizontal" />
		)}
		<ScrollAreaPrimitive.Corner />
	</ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = forwardRef<
	ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
	ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
	<ScrollAreaPrimitive.ScrollAreaScrollbar
		ref={ref}
		orientation={orientation}
		className={cn(styles.bar, className)}
		{...props}
	>
		<ScrollAreaPrimitive.ScrollAreaThumb className={styles.thumb} />
	</ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
export type { ScrollAreaProps };
