import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import './alert.css';

const alertVariants = cva('c15t-devtool-alert', {
	variants: {
		variant: {
			default: 'c15t-devtool-alert-default',
			destructive: 'c15t-devtool-alert-destructive',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
});

const Alert = forwardRef<
	HTMLDivElement,
	HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
	<div
		ref={ref}
		role="alert"
		className={`${alertVariants({ variant })} ${className || ''}`}
		{...props}
	/>
));
Alert.displayName = 'Alert';

const AlertTitle = forwardRef<
	HTMLParagraphElement,
	HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h5
		ref={ref}
		className={`c15t-devtool-alert-title ${className || ''}`}
		{...props}
	/>
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = forwardRef<
	HTMLParagraphElement,
	HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={`c15t-devtool-alert-description ${className || ''}`}
		{...props}
	/>
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
