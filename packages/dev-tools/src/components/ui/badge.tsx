import { type VariantProps, cva } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '~/libs/utils';
import './badge.css';

const badgeVariants = cva('c15t-devtool-badge', {
	variants: {
		variant: {
			default: 'c15t-devtool-badge-default',
			secondary: 'c15t-devtool-badge-secondary',
			destructive: 'c15t-devtool-badge-destructive',
			outline: 'c15t-devtool-badge-outline',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
});

export interface BadgeProps
	extends HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
