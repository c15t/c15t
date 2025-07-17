import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium text-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-offset-1 focus:ring-offset-white disabled:pointer-events-none disabled:opacity-50 dark:focus:ring-offset-base-900 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					'bg-base-800 text-white hover:bg-base-900 focus:ring-base-900 dark:bg-base-50 dark:text-base-900 dark:focus:ring-white dark:hover:bg-base-100',
				accent:
					'bg-accent-600 text-white hover:bg-accent-500 focus:ring-accent-500',
				muted:
					'bg-base-100 text-base-900 hover:bg-base-100 focus:ring-base-100 dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:hover:bg-base-700',
				info: 'bg-cyan-500 text-white hover:bg-cyan-700 focus:ring-cyan-500 dark:bg-cyan-500/50 dark:text-white dark:focus:ring-cyan-400 dark:hover:bg-cyan-700',
				success:
					'bg-emerald-500 text-white hover:bg-emerald-700 focus:ring-emerald-500 dark:bg-emerald-500/50 dark:text-white dark:focus:ring-emerald-400 dark:hover:bg-emerald-700',
				warning:
					'bg-orange-500 text-white hover:bg-orange-700 focus:ring-orange-500 dark:bg-orange-500/50 dark:focus:ring-orange-400 dark:hover:bg-orange-500/60',
				danger:
					'bg-rose-500 text-white hover:bg-rose-700 focus:ring-rose-500 dark:bg-rose-500/50 dark:text-white dark:focus:ring-rose-400 dark:hover:bg-rose-700',
				destructive:
					'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
				outline:
					'border border-base-200 bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-base-800',
				secondary:
					'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
				ghost:
					'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
				link: 'text-primary underline-offset-4 hover:underline',
			},
			size: {
				default: 'h-9 px-6 py-3 has-[>svg]:px-3',
				sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
				lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
				icon: 'size-9',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
);

function Button({
	className,
	variant,
	size,
	asChild = false,
	...props
}: React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : 'button';

	return (
		<Comp
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
