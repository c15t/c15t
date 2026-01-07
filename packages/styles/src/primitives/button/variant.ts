import styles from './button.module.css';

/**
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'neutral';
export type ButtonMode = 'filled' | 'stroke' | 'lighter' | 'ghost';
export type ButtonSize = 'medium' | 'small' | 'xsmall' | 'xxsmall';

/**
 * Button variants props interface
 */
export interface ButtonVariantsProps {
	variant?: ButtonVariant;
	mode?: ButtonMode;
	size?: ButtonSize;
}

// Define a type that can be used with PolymorphicComponentProps
export interface ButtonIconProps extends Record<string, unknown> {
	variant?: ButtonVariant;
	mode?: ButtonMode;
	size?: ButtonSize;
}


/**
 * Helper function to generate button classes based on variants
 */
export const buttonVariants = ({
	variant = 'primary',
	mode = 'filled',
	size = 'medium',
}: ButtonVariantsProps = {}) => {
	const rootClasses = [styles.button, styles[`button-${size}`]];

	const compoundMap: Record<
		`${ButtonVariant}-${ButtonMode}`,
		keyof typeof styles
	> = {
		'primary-filled': 'button-primary-filled',
		'primary-stroke': 'button-primary-stroke',
		'primary-lighter': 'button-primary-lighter',
		'primary-ghost': 'button-primary-ghost',
		'neutral-filled': 'button-neutral-filled',
		'neutral-stroke': 'button-neutral-stroke',
		'neutral-lighter': 'button-neutral-lighter',
		'neutral-ghost': 'button-neutral-ghost',
	};

	rootClasses.push(styles[compoundMap[`${variant}-${mode}`]]);

	const iconClasses = [styles['button-icon']];

	return {
		root: (options?: { class?: string }) => {
			return [...rootClasses, options?.class].filter(Boolean).join(' ');
		},
		icon: (options?: { class?: string }) => {
			return [...iconClasses, options?.class].filter(Boolean).join(' ');
		},
	};
};