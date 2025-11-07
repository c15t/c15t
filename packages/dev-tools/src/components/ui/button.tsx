import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '~/libs/utils';
import styles from './button.module.css';

const buttonVariants = cva(styles.button, {
	variants: {
		variant: {
			default: styles.default,
			destructive: styles.destructive,
			outline: styles.outline,
			secondary: styles.secondary,
			ghost: styles.ghost,
			link: styles.link,
		},
		size: {
			default: styles.sizeDefault,
			sm: styles.sizeSm,
			lg: styles.sizeLg,
			icon: styles.sizeIcon,
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
});

export interface ButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : 'button';
		return (
			<Comp
				className={cn(buttonVariants({ variant, size }), className)}
				ref={ref}
				{...props}
			/>
		);
	}
);
Button.displayName = 'Button';

export { Button, buttonVariants };
