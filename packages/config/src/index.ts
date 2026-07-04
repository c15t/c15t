export type ButtonVariant = 'primary' | 'neutral';

export type ButtonMode = 'filled' | 'stroke' | 'lighter' | 'ghost';

export type ConsentActiveUI = 'banner' | 'manager' | null;

export type ConsentBannerPosition =
	| 'top-left'
	| 'top-right'
	| 'bottom-left'
	| 'bottom-right';

export type ConsentManagerMode = 'dialog' | 'sidebar-left' | 'sidebar-right';

export type ConsentSaveAction = 'all' | 'necessary' | 'custom';

export type ConsentLegalLinkKey =
	| 'privacyPolicy'
	| 'cookiePolicy'
	| 'termsOfService';

export type ConsentLegalLink = {
	href: string;
	target?: '_blank' | '_self';
	rel?: string;
	label?: string;
};

export type ConsentLegalLinks = Partial<
	Record<ConsentLegalLinkKey, ConsentLegalLink>
>;

export type PolicyModel = 'opt-in' | 'opt-out' | 'none' | 'iab';

export type ConsentDialogTriggerPosition =
	| 'top-left'
	| 'top-right'
	| 'bottom-left'
	| 'bottom-right';

export type ConsentDialogTriggerVisibility =
	| 'always'
	| 'after-consent'
	| 'never';

export type ConsentDialogTriggerSize = 'sm' | 'md' | 'lg';

export type ConsentDialogTriggerIcon = 'fingerprint' | 'settings' | 'branding';

/** Standard consent category keys aligned with GDPR purpose groups. */
export type ConsentCategory =
	| 'necessary'
	| 'functionality'
	| 'experience'
	| 'measurement'
	| 'marketing';

/**
 * Central consent configuration contract shared across framework packages.
 *
 * @typeParam T - Framework attribute type bound to theme slot overrides.
 */
export interface ConsentConfig<T = Record<string, unknown>> {
	backendURL?: string;
	/**
	 * Consent categories shown in the UI. Backend policy allowlists that include
	 * optional categories narrow this set. A policy allowlist of only `necessary`
	 * does not restrict optional categories. `necessary` is always included.
	 */
	consentCategories?: ConsentCategory[];
	/** Overrides parsed request headers for `/init` (custom SSR, tests). */
	location?: {
		countryCode?: string | null;
		regionCode?: string | null;
	};
	disableAnimation?: boolean;
	trapFocus?: boolean;
	/** Provider-level legal link URLs (labels come from init translations). */
	legalLinks?: ConsentLegalLinks;
	/** Which legal links render per surface (`undefined` = none). */
	bannerLegalLinks?: ConsentLegalLinkKey[] | null;
	dialogLegalLinks?: ConsentLegalLinkKey[] | null;
	hideBranding?: boolean;
	bannerHideBranding?: boolean;
	dialogHideBranding?: boolean;
	iabBannerHideBranding?: boolean;
	iabDialogHideBranding?: boolean;
	showTrigger?: boolean;
	dialogShowTrigger?: boolean;
	iabDialogShowTrigger?: boolean;
	models?: PolicyModel[];
	bannerModels?: PolicyModel[];
	dialogModels?: PolicyModel[];
	iabBannerModels?: PolicyModel[];
	iabDialogModels?: PolicyModel[];
	bannerUiSource?: string;
	dialogUiSource?: string;
	/**
	 * Viewport corner for the consent banner root.
	 * @default 'bottom-left'
	 */
	bannerPosition?: ConsentBannerPosition;
	/**
	 * How the preference manager is presented when `activeUI` is `manager`.
	 * @default 'dialog'
	 */
	managerMode?: ConsentManagerMode;
	triggerDefaultPosition?: ConsentDialogTriggerPosition;
	triggerPersistPosition?: boolean;
	triggerShowWhen?: ConsentDialogTriggerVisibility;
	triggerAriaLabel?: string;
	triggerSize?: ConsentDialogTriggerSize;
	triggerIcon?: ConsentDialogTriggerIcon;
	/** CSS custom property values applied as `--{key}` on `:root`. */
	tokens?: Partial<
		Record<
			| 'c15t-primary'
			| 'c15t-primary-hover'
			| 'c15t-surface'
			| 'c15t-surface-hover'
			| 'c15t-border'
			| 'c15t-border-hover'
			| 'c15t-text'
			| 'c15t-text-muted'
			| 'c15t-text-on-primary'
			| 'c15t-overlay'
			| 'c15t-switch-track'
			| 'c15t-switch-track-active'
			| 'c15t-switch-thumb'
			| 'c15t-font-family'
			| 'c15t-font-size-sm'
			| 'c15t-font-size-base'
			| 'c15t-font-size-lg'
			| 'c15t-font-weight-normal'
			| 'c15t-font-weight-medium'
			| 'c15t-font-weight-semibold'
			| 'c15t-line-height-tight'
			| 'c15t-line-height-normal'
			| 'c15t-line-height-relaxed'
			| 'c15t-space-xs'
			| 'c15t-space-sm'
			| 'c15t-space-md'
			| 'c15t-space-lg'
			| 'c15t-space-xl'
			| 'c15t-radius-sm'
			| 'c15t-radius-md'
			| 'c15t-radius-lg'
			| 'c15t-radius-full'
			| 'c15t-shadow-sm'
			| 'c15t-shadow-md'
			| 'c15t-shadow-lg'
			| 'c15t-duration-fast'
			| 'c15t-duration-normal'
			| 'c15t-duration-slow'
			| 'c15t-easing'
			| 'c15t-easing-out'
			| 'c15t-easing-in-out'
			| 'c15t-easing-spring',
			string | number
		>
	>;
	/** Per-component slot attribute overrides. */
	components?: {
		banner: {
			root?: T;
			card?: T;
			header?: T;
			title?: T;
			description?: T;
			footer?: T;
			actions?: T;
			actionGroup?: T;
			tag?: T;
			overlay?: T;
		};
		dialog: {
			root?: T;
			card?: T;
			header?: T;
			title?: T;
			description?: T;
			content?: T;
			footer?: T;
			tag?: T;
			overlay?: T;
		};
		manager: {
			root?: T;
			accordion?: T;
			footer?: T;
			actions?: T;
			actionGroup?: T;
			tag?: T;
		};
		button: {
			primary?: T;
			secondary?: T;
		};
		switch: {
			root?: T;
		};
		accordion: {
			root?: T;
		};
		'accordion-item': {
			root?: T;
			trigger?: T;
			content?: T;
		};
		description: {
			banner?: T;
			dialog?: T;
			manager?: T;
		};
		tag: {
			banner?: T;
			dialog?: T;
			manager?: T;
			'iab-banner'?: T;
			'iab-dialog'?: T;
		};
		link: {
			banner?: T;
			dialog?: T;
			manager?: T;
		};
		badge: {
			root?: T;
		};
		'iab-banner': {
			root?: T;
			card?: T;
			header?: T;
			title?: T;
			description?: T;
			footer?: T;
			tag?: T;
			overlay?: T;
		};
		'iab-dialog': {
			root?: T;
			card?: T;
			header?: T;
			title?: T;
			description?: T;
			content?: T;
			footer?: T;
			tabs?: T;
			tag?: T;
			overlay?: T;
		};
	};
}

export {
	DEFAULT_BANNER_POSITION,
	DEFAULT_MANAGER_MODE,
	defaultConsentConfig,
} from './defaults';
