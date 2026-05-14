/**
 * @packageDocumentation
 * Provides the overlay backdrop component for the consent management interface.
 * Implements accessible modal behavior with animation support.
 */

import styles from '@c15t/ui/styles/components/consent-dialog.module.js';
import {
	type CSSProperties,
	forwardRef,
	type HTMLAttributes,
	useEffect,
	useState,
} from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import { useTheme } from '~/hooks/use-theme';
import type { ThemeValue } from '~/types/theme';
import { cnExt as cn } from '~/utils/cn';

/**
 * Props for the Overlay component.
 *
 * @remarks
 * The overlay provides a semi-transparent backdrop behind the consent dialog.
 * It helps focus user attention on the privacy settings interface and prevents
 * interaction with the main content while the dialog is open.
 *
 * @public
 */

export interface OverlayProps
	extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
	/**
	 * Custom styles to override default overlay styling.
	 *
	 * @remarks
	 * - Accepts normal React inline styles
	 * - Also accepts the legacy string class name or object with className and style properties
	 * - Styles are merged with theme styles and default styles
	 * - Useful for customizing overlay appearance while maintaining functionality
	 */
	style?: CSSProperties | ThemeValue;

	/**
	 * Disables default styling when true.
	 *
	 * @remarks
	 * - When enabled, removes all default styles
	 * - Useful for implementing completely custom overlay styling
	 * - Maintains functionality without visual opinions
	 */
	noStyle?: boolean;
}

const ConsentDialogOverlay = forwardRef<HTMLDivElement, OverlayProps>(
	({ className, noStyle, style, ...props }, ref) => {
		const { activeUI } = useConsentManager();
		const { disableAnimation, noStyle: isThemeNoStyle } = useTheme();

		const showDialog = activeUI === 'dialog';
		const [isVisible, setIsVisible] = useState(false);

		// Handle animation visibility state
		useEffect(() => {
			if (showDialog) {
				setIsVisible(true);
			} else if (disableAnimation) {
				setIsVisible(false);
			} else {
				const animationDurationMs = Number.parseInt(
					getComputedStyle(document.documentElement).getPropertyValue(
						'--consent-dialog-animation-duration'
					) || '200',
					10
				);
				const timer = setTimeout(() => {
					setIsVisible(false);
				}, animationDurationMs); // Match CSS animation duration
				return () => clearTimeout(timer);
			}
		}, [showDialog, disableAnimation]);

		let legacyStyleClassName: string | undefined;
		if (typeof style === 'string') {
			legacyStyleClassName = style;
		} else if (style && 'className' in style) {
			legacyStyleClassName = style.className;
		}

		const customClassName = cn(legacyStyleClassName, className);

		let inlineStyle: CSSProperties | undefined;
		if (typeof style === 'object' && style !== null) {
			if ('style' in style || 'className' in style) {
				inlineStyle = style.style;
			} else {
				inlineStyle = style as CSSProperties;
			}
		}

		// Apply theme styles
		const theme = useStyles('consentDialogOverlay', {
			baseClassName: !(isThemeNoStyle || noStyle) && styles.overlay,
			className: customClassName,
			noStyle: isThemeNoStyle || noStyle,
		});

		// Animations are handled with CSS classes
		const shouldApplyAnimation =
			!(isThemeNoStyle || noStyle) && !disableAnimation;

		// Use conditional assignment instead of nested ternaries
		let animationClass: string | undefined;
		if (shouldApplyAnimation) {
			animationClass = isVisible ? styles.overlayVisible : styles.overlayHidden;
		} else {
			animationClass = undefined;
		}

		// Combine theme className with animation class if needed
		const finalClassName = cn(theme.className, animationClass);

		return (
			<div
				ref={ref}
				{...props}
				role="presentation"
				aria-hidden="true"
				style={{ ...theme.style, ...inlineStyle }}
				className={finalClassName}
				data-testid="consent-dialog-overlay"
			/>
		);
	}
);

ConsentDialogOverlay.displayName = 'ConsentDialogOverlay';

const Overlay = ConsentDialogOverlay;

export { ConsentDialogOverlay, Overlay };
