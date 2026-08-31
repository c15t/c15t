/**
 * RSC-first consent banner (`@c15t/nextjs/v3/rsc`).
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
 * <ConsentBoundary options={{ prefetch: config }}>
 *   <RscConsentBanner config={config} />
 *   {children}
 * </ConsentBoundary>
 * ```
 *
 * The server renders the shell only when the prefetched decision says the
 * banner should show (returning users get zero banner bytes, client or
 * server). Same data-testids and DOM shape as the client `ConsentBanner`.
 */
import type { KernelConfig } from '@c15t/core/v3';
import type { ReactNode } from 'react';

import { RscBannerActions, RscBannerGate } from './islands';

interface BannerCopy {
	title: string;
	description: string;
	acceptLabel: string;
	rejectLabel: string;
	customizeLabel: string;
}

const FALLBACK_COPY: BannerCopy = {
	title: 'We value your privacy',
	description:
		'This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.',
	acceptLabel: 'Accept All',
	rejectLabel: 'Reject All',
	customizeLabel: 'Customize',
};

function readCopy(config: KernelConfig): BannerCopy {
	const bundle = (
		config.initialTranslations as
			| {
					translations?: {
						cookieBanner?: { title?: string; description?: string };
						common?: {
							acceptAll?: string;
							rejectAll?: string;
							customize?: string;
						};
					};
			  }
			| undefined
	)?.translations;

	return {
		title: bundle?.cookieBanner?.title ?? FALLBACK_COPY.title,
		description: bundle?.cookieBanner?.description ?? FALLBACK_COPY.description,
		acceptLabel: bundle?.common?.acceptAll ?? FALLBACK_COPY.acceptLabel,
		rejectLabel: bundle?.common?.rejectAll ?? FALLBACK_COPY.rejectLabel,
		customizeLabel: bundle?.common?.customize ?? FALLBACK_COPY.customizeLabel,
	};
}

function shouldRenderBanner(config: KernelConfig): boolean {
	return config.initialHasConsented !== true;
}

export interface RscConsentBannerProps {
	/** The prefetched kernel config (from `prefetchInitialConsent`). */
	config: KernelConfig;
	/**
	 * Optional class names for shell slots (e.g. from
	 * `@c15t/ui/styles/v3` CSS Modules). The shell is headless by default.
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
	};
	/** Extra server-rendered content inside the card (links, branding). */
	children?: ReactNode;
}

export const RscConsentBanner = ({
	config,
	classNames,
	children,
}: RscConsentBannerProps) => {
	if (!shouldRenderBanner(config)) {
		return null;
	}
	const copy = readCopy(config);

	return (
		<RscBannerGate>
			<dialog
				aria-label={copy.title}
				aria-modal="false"
				className={classNames?.root}
				data-testid="consent-banner-root"
				open
				style={
					classNames?.root
						? undefined
						: { position: 'fixed', bottom: 0, left: 0, zIndex: 999 }
				}
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
							footer: classNames?.footer,
							acceptButton: classNames?.acceptButton,
							rejectButton: classNames?.rejectButton,
							customizeButton: classNames?.customizeButton,
						}}
						customizeLabel={copy.customizeLabel}
						rejectLabel={copy.rejectLabel}
					/>
				</div>
			</dialog>
		</RscBannerGate>
	);
};
