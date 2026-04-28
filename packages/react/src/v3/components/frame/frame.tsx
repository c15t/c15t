'use client';

import type { AllConsentNames } from 'c15t';
import { forwardRef, useEffect, useState } from 'react';
import { useConsentManager } from '~/v3/component-hooks/use-consent-manager';
import { useTranslations } from '~/v3/component-hooks/use-translations';
import { useIsomorphicLayoutEffect } from '~/v3/components/shared/libs/use-isomorphic-layout-effect';
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
		// Layout effect commits the mount flag before paint, so the second
		// render lands in the same paint as the initial null render — no
		// RAF stall, no FOUC, since CSS modules are imported synchronously.
		const [isMounted, setIsMounted] = useState(false);
		useIsomorphicLayoutEffect(() => {
			setIsMounted(true);
		}, []);

		const hasConsent = has(category);
		const hasPolicyScope =
			Array.isArray(policyCategories) &&
			policyCategories.length > 0 &&
			!(policyCategories as readonly string[]).includes('*');
		const isOutOfPolicyCategory =
			hasPolicyScope && !policyCategories.includes(category);
		const isStrictPolicyBlocked =
			policyScopeMode === 'strict' && isOutOfPolicyCategory;

		// biome-ignore lint/correctness/useExhaustiveDependencies: we only want to register the category when it changes
		useEffect(() => {
			updateConsentCategories([...consentCategories, category]);
		}, [category]);

		const renderContent = () => {
			// Before mount, return null so SSR and first client render match.
			if (!isMounted) {
				return null;
			}

			// After mount, show children if consent is granted
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
