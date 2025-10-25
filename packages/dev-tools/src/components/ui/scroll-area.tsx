'use client';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	forwardRef,
} from 'react';
import { cn } from '~/libs/utils';
import styles from './scroll-area.module.css';

const ScrollArea = forwardRef<
	ComponentRef<typeof ScrollAreaPrimitive.Root>,
	ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
	<ScrollAreaPrimitive.Root
		ref={ref}
		className={cn(styles.root, className)}
		{...props}
	>
		<ScrollAreaPrimitive.Viewport className={styles.viewport}>
			{children}
		</ScrollAreaPrimitive.Viewport>
		<ScrollBar />
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
