import type { ReactNode } from 'react';

/**
 * RSC-first consent banner (`@c15t/nextjs/rsc`).
 *
 * The banner shell — markup, copy, layout — renders as a **Server
 * Component**: zero hydration cost and zero client-bundle bytes for
 * everything static. Only two small islands ship to the browser:
 * `RscBannerGate` (kernel-driven visibility) and `RscBannerActions`
 * (the rights links and the button row).
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
	optOutLabel: string;
	preferencesLabel: string;
}

const FALLBACK_COPY: BannerCopy = {
	acceptLabel: 'Accept All',
	customizeLabel: 'Customize',
	description:
		'This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.',
	dismissLabel: 'Dismiss',
	optOutLabel: 'Do not sell or share my personal information',
	preferencesLabel: 'Manage preferences',
	rejectLabel: 'Reject All',
	title: 'We value your privacy',
};

const FALLBACK_NOTICE_COPY = {
	description:
		'We use cookies and similar technologies to run this site, measure traffic, and personalize content and ads. You can opt out or manage your preferences at any time.',
	title: 'Privacy notice',
};

/** Resolved rule on the prefetched config, when the server matched one. */
const readPolicy = function readPolicy(config: InitialConsentConfig) {
	const resolution = config.initialPolicyResolution;
	return resolution?.status === 'matched' ? resolution.policy : undefined;
};

interface TranslationBundle {
	cookieBanner?: {
		title?: string;
		description?: string;
		noticeTitle?: string;
		noticeDescription?: string;
	};
	common?: {
		acceptAll?: string;
		rejectAll?: string;
		customize?: string;
		dismiss?: string;
	};
	rights?: {
		optOut?: string;
		preferences?: string;
	};
}

const readBundle = function readBundle(
	config: InitialConsentConfig
): TranslationBundle {
	return (
		(
			config.initialTranslations as
				| { translations?: TranslationBundle }
				| undefined
		)?.translations ?? {}
	);
};

const readCopy = function readCopy(
	config: InitialConsentConfig,
	notice: boolean
): BannerCopy {
	const { cookieBanner = {}, common = {}, rights = {} } = readBundle(config);
	const title = notice
		? (cookieBanner.noticeTitle ?? FALLBACK_NOTICE_COPY.title)
		: (cookieBanner.title ?? FALLBACK_COPY.title);
	const description = notice
		? (cookieBanner.noticeDescription ?? FALLBACK_NOTICE_COPY.description)
		: (cookieBanner.description ?? FALLBACK_COPY.description);

	return {
		acceptLabel: common.acceptAll ?? FALLBACK_COPY.acceptLabel,
		customizeLabel: common.customize ?? FALLBACK_COPY.customizeLabel,
		description,
		dismissLabel: common.dismiss ?? FALLBACK_COPY.dismissLabel,
		optOutLabel: rights.optOut ?? FALLBACK_COPY.optOutLabel,
		preferencesLabel: rights.preferences ?? FALLBACK_COPY.preferencesLabel,
		rejectLabel: common.rejectAll ?? FALLBACK_COPY.rejectLabel,
		title,
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
		/**
		 * Group that holds links for rights no prompt action covers, such as
		 * opt-out and preferences under a notice. Rendered before the action
		 * row so the notice layout in `@c15t/ui` applies.
		 */
		rights?: string;
		/** One right link inside the rights group. */
		rightLink?: string;
	};
	/** Extra server-rendered content inside the card (links, branding). */
	children?: ReactNode;
}

export const RscConsentBanner = ({
	config,
	classNames,
	children,
}: RscConsentBannerProps) => {
	const policy = readPolicy(config);
	const copy = readCopy(config, policy?.prompt === 'notice');

	return (
		<RscBannerGate
			title={copy.title}
			className={classNames?.root}
			prompt={policy?.prompt}
			model={policy?.model}
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
						rightLink: classNames?.rightLink,
						rights: classNames?.rights,
					}}
					customizeLabel={copy.customizeLabel}
					rejectLabel={copy.rejectLabel}
					dismissLabel={copy.dismissLabel}
					rightLabels={{
						'opt-out': copy.optOutLabel,
						preferences: copy.preferencesLabel,
					}}
				/>
			</div>
		</RscBannerGate>
	);
};
