import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import './button.css';

const buttonVariants = cva('c15t-devtool-button', {
	variants: {
		variant: {
			default: 'c15t-devtool-button-default',
			destructive: 'c15t-devtool-button-destructive',
			outline: 'c15t-devtool-button-outline',
			secondary: 'c15t-devtool-button-secondary',
			ghost: 'c15t-devtool-button-ghost',
			link: 'c15t-devtool-button-link',
		},
		size: {
			default: 'c15t-devtool-button-size-default',
			sm: 'c15t-devtool-button-size-sm',
			lg: 'c15t-devtool-button-size-lg',
			icon: 'c15t-devtool-button-size-icon',
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
				className={`${buttonVariants({ variant, size })} ${className || ''}`}
				ref={ref}
				{...props}
			/>
		);
	}
);
Button.displayName = 'Button';

export { Button, buttonVariants };
