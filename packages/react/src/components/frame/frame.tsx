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
		const {
			has,
			updateConsentCategories,
			consentCategories,
			policyCategories,
			policyScopeMode,
		} = useConsentManager();
		const { frame } = useTranslations();
		const [isMounted, setIsMounted] = useState(false);
		const [isReady, setIsReady] = useState(false);

		const hasConsent = has(category);
		const hasPolicyScope =
			Array.isArray(policyCategories) &&
			policyCategories.length > 0 &&
			!policyCategories.includes('*');
		const isOutOfPolicyCategory =
			hasPolicyScope && !policyCategories.includes(category);
		const isStrictPolicyBlocked =
			policyScopeMode === 'strict' && isOutOfPolicyCategory;

		// biome-ignore lint/correctness/useExhaustiveDependencies: we only want to update the consent categories when the component is mounted
		useEffect(() => {
			setIsMounted(true);
			updateConsentCategories([...consentCategories, category]);
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
			return (
				placeholder || (
					<DefaultPlaceholder
						category={category}
						policyBlocked={isStrictPolicyBlocked}
						policyBlockedMessage={frame?.policyBlocked}
					/>
				)
			);
		};

		return (
			<div ref={ref} className={className} {...props}>
				{renderContent()}
			</div>
		);
	}
);

FrameComponent.displayName = 'Frame';

const DefaultPlaceholder = ({
	category,
	policyBlocked,
	policyBlockedMessage,
}: {
	category: AllConsentNames;
	policyBlocked: boolean;
	policyBlockedMessage?: string;
}) => {
	return (
		<FrameRoot>
			<FrameTitle category={category}>
				{policyBlocked
					? (policyBlockedMessage ??
						"This content is unavailable under your region's consent policy.")
					: undefined}
			</FrameTitle>
			{!policyBlocked ? <FrameButton category={category} /> : null}
		</FrameRoot>
	);
};

export const Frame = FrameComponent;
