import type { ReactNode } from 'react';

/**
 * RSC-first consent banner (`@c15t/nextjs/rsc`).
 *
 * The banner shell — markup, copy, layout — renders as a **Server
 * Component**: zero hydration cost and zero client-bundle bytes for
 * everything static. Only two small islands ship to the browser:
 * `RscBannerGate` (kernel-driven visibility) and `RscBannerActions`
 * (the button row).
 *
 * Usage (App Router):
 * ```tsx
 * const config = await prefetchInitialConsent({ backendURL, manifestURL });
 * <ConsentBoundary config={config}>
 *   <RscConsentBanner config={config} />
 *   {children}
 * </ConsentBoundary>
 * ```
 *
 * The shared React root evaluates visibility from the prepared policy and
 * records. Keeping the gate mounted lets expiry reopen the prompt later.
 */
import type { InitialConsentConfig } from '../types';
import { RscBannerActions, RscBannerGate } from './islands';

interface BannerCopy {
	title: string;
	description: string;
	acceptLabel: string;
	rejectLabel: string;
	customizeLabel: string;
	dismissLabel: string;
}

const FALLBACK_COPY: BannerCopy = {
	acceptLabel: 'Accept All',
	customizeLabel: 'Customize',
	description:
		'This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.',
	dismissLabel: 'Dismiss',
	rejectLabel: 'Reject All',
	title: 'We value your privacy',
};

const readCopy = function readCopy(config: InitialConsentConfig): BannerCopy {
	const bundle = (
		config.initialTranslations as
			| {
					translations?: {
						cookieBanner?: { title?: string; description?: string };
						common?: {
							acceptAll?: string;
							rejectAll?: string;
							customize?: string;
							dismiss?: string;
						};
					};
			  }
			| undefined
	)?.translations;

	return {
		acceptLabel: bundle?.common?.acceptAll ?? FALLBACK_COPY.acceptLabel,
		customizeLabel: bundle?.common?.customize ?? FALLBACK_COPY.customizeLabel,
		description: bundle?.cookieBanner?.description ?? FALLBACK_COPY.description,
		dismissLabel: bundle?.common?.dismiss ?? FALLBACK_COPY.dismissLabel,
		rejectLabel: bundle?.common?.rejectAll ?? FALLBACK_COPY.rejectLabel,
		title: bundle?.cookieBanner?.title ?? FALLBACK_COPY.title,
	};
};

export interface RscConsentBannerProps {
	/** The prefetched kernel config (from `prefetchInitialConsent`). */
	config: InitialConsentConfig;
	/**
	 * Optional class names for shell slots (e.g. from
	 * `@c15t/ui/styles` CSS Modules). The shell is headless by default.
	 */
	classNames?: {
		root?: string;
		card?: string;
		title?: string;
		description?: string;
		footer?: string;
		acceptButton?: string;
		rejectButton?: string;
		customizeButton?: string;
		dismissButton?: string;
	};
	/** Extra server-rendered content inside the card (links, branding). */
	children?: ReactNode;
}

export const RscConsentBanner = ({
	config,
	classNames,
	children,
}: RscConsentBannerProps) => {
	const copy = readCopy(config);

	return (
		<RscBannerGate
			title={copy.title}
			className={classNames?.root}
		>
			<div
				className={classNames?.card}
				data-testid="consent-banner-card"
			>
				<h2
					className={classNames?.title}
					data-testid="consent-banner-title"
				>
					{copy.title}
				</h2>
				<p
					className={classNames?.description}
					data-testid="consent-banner-description"
				>
					{copy.description}
				</p>
				{children}
				<RscBannerActions
					acceptLabel={copy.acceptLabel}
					classNames={{
						acceptButton: classNames?.acceptButton,
						customizeButton: classNames?.customizeButton,
						dismissButton: classNames?.dismissButton,
						footer: classNames?.footer,
						rejectButton: classNames?.rejectButton,
					}}
					customizeLabel={copy.customizeLabel}
					rejectLabel={copy.rejectLabel}
					dismissLabel={copy.dismissLabel}
				/>
			</div>
		</RscBannerGate>
	);
};
