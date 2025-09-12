'use client';

import type { AllConsentNames, HasCondition } from 'c15t';
import {
	type ComponentPropsWithRef,
	forwardRef,
	type ReactNode,
	useEffect,
	useState,
} from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { Box } from '../shared/primitives/box';
import { ConsentButton } from '../shared/primitives/button';
import styles from './frame.module.css';
import type { FrameTheme } from './theme';

export interface FrameProps extends ComponentPropsWithRef<'div'> {
	/**
	 * The content to be rendered if consent is given.
	 * Typically an iframe or a component that requires consent.
	 */
	children: ReactNode;

	/**
	 * The consent category required to render the children.
	 */
	category: HasCondition<AllConsentNames>;

	/**
	 * A custom fallback component to display when consent is not met.
	 * If not provided, a default fallback will be displayed.
	 */
	fallback?: ReactNode;

	/**
	 * When true, removes all default styling from the component
	 * @remarks Useful for implementing completely custom designs
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * Custom styles to apply to the banner and its child components
	 * @remarks Allows for deep customization of the banner's appearance while maintaining accessibility
	 * @default undefined
	 */
	theme?: FrameTheme;
}

const FrameComponent = forwardRef<HTMLDivElement, FrameProps>(
	(
		{ children, category, fallback, noStyle, className, theme, ...props },
		ref
	) => {
		const { has } = useConsentManager();
		const [isMounted, setIsMounted] = useState(false);

		const hasConsent = has(category);

		useEffect(() => {
			setIsMounted(true);
		}, []);

		const renderContent = () => {
			if (!isMounted) {
				return fallback || null;
			}

			if (hasConsent) {
				return children;
			}

			return fallback || <DefaultFallback />;
		};

		return (
			<div ref={ref} className={className} {...props}>
				{renderContent()}
			</div>
		);
	}
);

FrameComponent.displayName = 'Frame';

const DefaultFallback = () => {
	return (
		<Box baseClassName={styles.fallback} themeKey="frame.fallback.root">
			<Box
				baseClassName={styles.fallbackContent}
				themeKey="frame.fallback.content"
			>
				<Box
					baseClassName={styles.fallbackTitle}
					themeKey="frame.fallback.title"
				>
					Content requires consent
				</Box>
				<Box
					baseClassName={styles.fallbackDescription}
					themeKey="frame.fallback.description"
				>
					This content is blocked until you provide consent.
				</Box>
			</Box>
			<ConsentButton
				action="open-consent-dialog"
				themeKey="frame.fallback.button"
				variant="primary"
			>
				Manage Consent
			</ConsentButton>
		</Box>
	);
};

export const Frame = FrameComponent;
