import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '~/libs/utils';
import styles from './badge.module.css';

const badgeVariants = cva(styles.badge, {
	variants: {
		variant: {
			default: styles.default,
			secondary: styles.secondary,
			destructive: styles.destructive,
			outline: styles.outline,
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
