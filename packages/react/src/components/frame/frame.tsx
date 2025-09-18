'use client';

import type { AllConsentNames } from 'c15t';
import {
	type ComponentPropsWithRef,
	forwardRef,
	type ReactNode,
	useEffect,
	useState,
} from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useTranslations } from '~/hooks/use-translations';
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
	category: AllConsentNames;

	/**
	 * A custom placeholder component to display when consent is not met.
	 * If not provided, a default placeholder will be displayed.
	 */
	placeholder?: ReactNode;

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
		{ children, category, placeholder, noStyle, className, theme, ...props },
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
				return placeholder || null;
			}

			if (hasConsent) {
				return children;
			}

			return placeholder || <DefaultPlaceholder category={category} />;
		};

		return (
			<div ref={ref} className={className} {...props}>
				{renderContent()}
			</div>
		);
	}
);

FrameComponent.displayName = 'Frame';

const DefaultPlaceholder = ({ category }: { category: AllConsentNames }) => {
	const { frame, consentTypes } = useTranslations();

	const translatedTitle = frame?.title?.replace(
		'{category}',
		consentTypes[category]?.title ?? category
	);
	const translatedActionButton = frame?.actionButton?.replace(
		'{category}',
		category
	);

	return (
		<Box baseClassName={styles.placeholder} themeKey="frame.placeholder.root">
			<Box
				baseClassName={styles.placeholderContent}
				themeKey="frame.placeholder.content"
			>
				<Box
					baseClassName={styles.placeholderTitle}
					themeKey="frame.placeholder.title"
				>
					{translatedTitle}
				</Box>
			</Box>
			<ConsentButton
				action="set-consent"
				themeKey="frame.placeholder.button"
				variant="primary"
				category={category}
			>
				{translatedActionButton}
			</ConsentButton>
		</Box>
	);
};

export const Frame = FrameComponent;
