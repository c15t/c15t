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

/**
 * Props for the Badge component
 *
 * @property className - Additional CSS classes to apply
 * @property variant - The visual style variant of the badge
 */
export interface BadgeProps
	extends HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

/**
 * Badge component for displaying status, labels, or counts
 *
 * @param className - Additional CSS classes to apply
 * @param variant - The visual style variant ('default' | 'secondary' | 'destructive' | 'outline')
 * @param props - Additional HTML div attributes
 *
 * @example
 * ```tsx
 * // Default badge
 * <Badge>New</Badge>
 *
 * // Destructive variant
 * <Badge variant="destructive">Error</Badge>
 * ```
 */
function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
