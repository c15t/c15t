'use client';

import type { AllConsentNames } from 'c15t';
import { forwardRef, useEffect, useState } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useTranslations } from '~/hooks/use-translations';
import { FrameButton, FrameRoot, FrameTitle } from './atoms';
import type { FrameProps } from './types';

const FrameComponent = forwardRef<HTMLDivElement, FrameProps>(
	(
		{ children, category, placeholder, noStyle, className, theme, ...props },
		ref
	) => {
		const { has, updateConsentCategories, gdprTypes } = useConsentManager();
		const [isMounted, setIsMounted] = useState(false);
		const [isReady, setIsReady] = useState(false);

		const hasConsent = has(category);

		// biome-ignore lint/correctness/useExhaustiveDependencies: we only want to update the consent categories when the component is mounted
		useEffect(() => {
			setIsMounted(true);
			updateConsentCategories([...gdprTypes, category]);
		}, [category]);

		// Wait for next frame to ensure styles are loaded
		useEffect(() => {
			if (isMounted) {
				requestAnimationFrame(() => {
					setIsReady(true);
				});
			}
		}, [isMounted]);

		const renderContent = () => {
			// Before ready, show nothing to prevent FOUC
			if (!isMounted || !isReady) {
				return null;
			}

			// After ready, show children if consent is granted
			if (hasConsent) {
				return children;
			}

			// Otherwise show placeholder
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
		consentTypes?.[category]?.title ?? category
	);
	const translatedActionButton = frame?.actionButton?.replace(
		'{category}',
		category
	);

	return (
		<FrameRoot>
			<FrameTitle>{translatedTitle}</FrameTitle>
			<FrameButton category={category}>{translatedActionButton}</FrameButton>
		</FrameRoot>
	);
};

export const Frame = FrameComponent;
