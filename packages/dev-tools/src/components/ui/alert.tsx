import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import styles from './alert.module.css';

const alertVariants = cva(styles.alert, {
	variants: {
		variant: {
			default: styles.default,
			destructive: styles.destructive,
		},
	},
	defaultVariants: {
		variant: 'default',
	},
});

/**
 * Alert component for displaying contextual messages
 *
 * @param className - Additional CSS classes to apply
 * @param variant - The visual style variant of the alert
 * @param props - Additional HTML div attributes
 * @param ref - Forwarded ref to the div element
 */
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

/**
 * AlertTitle component for displaying the alert heading
 *
 * @param className - Additional CSS classes to apply
 * @param props - Additional HTML heading attributes
 * @param ref - Forwarded ref to the heading element
 */
const AlertTitle = forwardRef<
	HTMLParagraphElement,
	HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h5 ref={ref} className={`${styles.title} ${className || ''}`} {...props} />
));
AlertTitle.displayName = 'AlertTitle';

/**
 * AlertDescription component for displaying the alert body text
 *
 * @param className - Additional CSS classes to apply
 * @param props - Additional HTML div attributes
 * @param ref - Forwarded ref to the div element
 */
const AlertDescription = forwardRef<
	HTMLParagraphElement,
	HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={`${styles.description} ${className || ''}`}
		{...props}
	/>
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
