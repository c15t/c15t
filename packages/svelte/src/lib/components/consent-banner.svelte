<script lang="ts">
import styles from '@c15t/ui/styles/components/consent-banner.module.js';
import {
	getTextDirection,
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyDirection,
	resolvePolicyOrderedActions,
	resolvePolicyPrimaryActions,
	resolveTranslations,
	shouldFillPolicyActions,
} from '@c15t/ui/utils';
import type { LegalLinks as LegalLinksType, Model } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import { focusTrap } from '../actions/focus-trap';
// Banner uses custom portal/focus-trap/scroll-lock actions (not Ark UI's built-in)
// because the banner is not an Ark Dialog - it's a simpler container that
// conditionally acts as a dialog. The ConsentDialog uses Ark's Dialog which
// includes its own focus trap and scroll prevention. When transitioning from
// banner to dialog, the banner unmounts (removing its focus trap) before
// the dialog mounts (establishing Ark's focus trap), so they don't compete.
import { portal } from '../actions/portal';
import { scrollLock } from '../actions/scroll-lock';
import {
	getConsentContext,
	getThemeContext,
	setTrackingContext,
} from '../context.svelte';
import { useBannerVisibility } from '../use-banner-visibility.svelte';
import { resolveComponentStyles } from '../utils';
import Branding from './branding.svelte';
import ConsentButton from './consent-button.svelte';
import InlineLegalLinks from './inline-legal-links.svelte';
import Overlay from './overlay.svelte';
import PolicyActionsRenderer from './policy-actions-renderer.svelte';

/**
 * Button identifiers for the consent banner layout.
 */
type ConsentBannerButton = 'reject' | 'accept' | 'customize';
type ConsentBannerLayout = (ConsentBannerButton | ConsentBannerButton[])[];

const DEFAULT_LAYOUT: ConsentBannerLayout = [['reject', 'accept'], 'customize'];

let {
	noStyle: localNoStyle,
	disableAnimation: localDisableAnimation,
	scrollLock: localScrollLock,
	trapFocus: localTrapFocus = true,
	title,
	description,
	rejectButtonText,
	customizeButtonText,
	acceptButtonText,
	hideBranding = false,
	legalLinks,
	layout = DEFAULT_LAYOUT,
	primaryButton = 'customize',
	models = ['opt-in'] as Model[],
	uiSource = 'banner',
	class: className,
}: {
	noStyle?: boolean;
	disableAnimation?: boolean;
	scrollLock?: boolean;
	trapFocus?: boolean;
	title?: string;
	description?: string;
	rejectButtonText?: string;
	customizeButtonText?: string;
	acceptButtonText?: string;
	hideBranding?: boolean;
	legalLinks?: (keyof LegalLinksType)[] | null;
	layout?: ConsentBannerLayout;
	primaryButton?: ConsentBannerButton | ConsentBannerButton[];
	models?: Model[];
	uiSource?: string;
	class?: string;
} = $props();

const consent = getConsentContext();
const theme = getThemeContext();
setTrackingContext({
	get uiSource() {
		return uiSource;
	},
});

const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);
const disableAnimation = $derived(
	localDisableAnimation ?? theme.disableAnimation ?? false
);
const shouldTrapFocus = $derived(localTrapFocus ?? theme.trapFocus ?? true);
const shouldScrollLock = $derived(localScrollLock ?? theme.scrollLock ?? false);

// Translations
const translations = $derived(
	resolveTranslations(consent.state.translationConfig, defaultTranslationConfig)
);
const textDirection = $derived(
	getTextDirection(consent.state.translationConfig?.defaultLanguage)
);

// Visibility logic
const shouldShowBanner = $derived(
	consent.state.activeUI === 'banner' && models.includes(consent.state.model)
);

const visibility = useBannerVisibility(
	() => shouldShowBanner,
	() => disableAnimation
);

// Styling - per-element theme key resolution matching React
const rootStyle = $derived(
	resolveComponentStyles(
		'consentBanner',
		theme.theme,
		{
			baseClassName: [
				styles.root,
				textDirection === 'ltr' ? styles.bottomLeft : styles.bottomRight,
			],
			className,
			noStyle,
		},
		noStyle
	)
);

const cardStyle = $derived(
	resolveComponentStyles(
		'consentBannerCard',
		theme.theme,
		{ baseClassName: styles.card, noStyle },
		noStyle
	)
);

const headerStyle = $derived(
	resolveComponentStyles(
		'consentBannerHeader',
		theme.theme,
		{ baseClassName: styles.header, noStyle },
		noStyle
	)
);

const titleStyle = $derived(
	resolveComponentStyles(
		'consentBannerTitle',
		theme.theme,
		{ baseClassName: styles.title, noStyle },
		noStyle
	)
);

const descriptionStyle = $derived(
	resolveComponentStyles(
		'consentBannerDescription',
		theme.theme,
		{ baseClassName: styles.description, noStyle },
		noStyle
	)
);

const footerStyle = $derived(
	resolveComponentStyles(
		'consentBannerFooter',
		theme.theme,
		{ baseClassName: styles.footer, noStyle },
		noStyle
	)
);

const footerSubGroupStyle = $derived(
	resolveComponentStyles(
		'consentBannerFooterSubGroup',
		theme.theme,
		{ baseClassName: styles.footerSubGroup, noStyle },
		noStyle
	)
);

const finalClassName = $derived(
	noStyle
		? rootStyle.className || ''
		: `${rootStyle.className || ''} ${visibility.isVisible ? styles.bannerVisible : styles.bannerHidden}`
);

// Button helpers
const allowedActions = $derived(
	resolvePolicyAllowedActions({
		allowedActions: consent.state.policyBanner.allowedActions,
	})
);

const resolvedLayout = $derived(
	layout ??
		((consent.state.policyBanner.layout?.length ?? 0) > 0
			? consent.state.policyBanner.layout
			: DEFAULT_LAYOUT)
);

const orderedActions = $derived(
	resolvePolicyOrderedActions({
		allowedActions,
		layout: resolvedLayout,
	})
);

const actionGroups = $derived(
	resolvePolicyActionGroups({
		allowedActions,
		layout: resolvedLayout,
	})
);

const direction = $derived(
	resolvePolicyDirection(consent.state.policyBanner.direction)
);

const effectivePrimaryActions = $derived.by(() => {
	if ((consent.state.policyBanner.primaryActions?.length ?? 0) > 0) {
		return consent.state.policyBanner.primaryActions ?? [];
	}

	return Array.isArray(primaryButton) ? primaryButton : [primaryButton];
});

const primaryActions = $derived(
	resolvePolicyPrimaryActions({
		orderedActions,
		primaryActions: effectivePrimaryActions,
	})
);

const shouldFillActions = $derived(
	shouldFillPolicyActions({
		uiProfile: consent.state.policyBanner.uiProfile,
		actionGroups,
		direction,
	})
);

// Resolved texts
const resolvedTitle = $derived(title ?? translations.cookieBanner.title);
const resolvedDescription = $derived(
	description ?? translations.cookieBanner.description
);
const resolvedRejectText = $derived(
	rejectButtonText ?? translations.common.rejectAll
);
const resolvedAcceptText = $derived(
	acceptButtonText ?? translations.common.acceptAll
);
const resolvedCustomizeText = $derived(
	customizeButtonText ?? translations.common.customize
);
</script>

{#if visibility.isMounted && visibility.shouldRender}
	<div use:portal>
		<Overlay visible={visibility.isVisible} />
		<div
			bind:this={visibility.bannerEl}
			class={finalClassName}
			dir={textDirection}
			data-testid="consent-banner-root"
			use:scrollLock={shouldScrollLock}
		>
			<div class={noStyle ? '' : styles.cardShell || ''}>
				<Branding
					{hideBranding}
					{noStyle}
					variant="banner-tag"
					themeKey="consentBannerTag"
					data-testid="consent-banner-branding"
				/>
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class={noStyle ? '' : cardStyle.className || ''}
					data-testid="consent-banner-card"
					tabindex={shouldTrapFocus ? -1 : undefined}
					role={shouldTrapFocus ? 'dialog' : undefined}
					aria-modal={shouldTrapFocus ? 'true' : undefined}
					aria-label={resolvedTitle}
					use:focusTrap={shouldTrapFocus}
				>
					<div class={noStyle ? '' : headerStyle.className || ''} data-testid="consent-banner-header">
						<div class={noStyle ? '' : titleStyle.className || ''} data-testid="consent-banner-title">
							{resolvedTitle}
						</div>
						<div
							class={noStyle ? '' : descriptionStyle.className || ''}
							data-testid="consent-banner-description"
						>
							{resolvedDescription}
							<InlineLegalLinks
								links={legalLinks}
								themeKey="consentBannerDescription"
								testIdPrefix="consent-banner-legal-link"
							/>
						</div>
					</div>
					<PolicyActionsRenderer
						actionGroups={actionGroups}
						primaryActions={primaryActions}
						shouldFillActions={shouldFillActions}
						{direction}
						footerClassName={noStyle ? '' : footerStyle.className || ''}
						footerFillClassName={styles.footerFill || ''}
						footerColumnClassName={styles.footerColumn || ''}
						footerSubGroupClassName={noStyle ? '' : footerSubGroupStyle.className || ''}
						footerSubGroupFillClassName={styles.footerSubGroupFill || ''}
						footerSubGroupColumnClassName={styles.footerSubGroupColumn || ''}
						actionButtonFillClassName={styles.actionButtonFill || ''}
						footerTestId="consent-banner-footer"
						footerSubGroupTestId="consent-banner-footer-sub-group"
					>
						{#snippet renderAction(action: string, isPrimary: boolean, actionClassName?: string)}
							{#if action === 'reject'}
								<ConsentButton
									action="reject-consent"
									variant={isPrimary ? 'primary' : 'neutral'}
									closeConsentBanner
									class={actionClassName}
									data-testid="consent-banner-reject-button"
								>
									{resolvedRejectText}
								</ConsentButton>
							{:else if action === 'accept'}
								<ConsentButton
									action="accept-consent"
									variant={isPrimary ? 'primary' : 'neutral'}
									closeConsentBanner
									class={actionClassName}
									data-testid="consent-banner-accept-button"
								>
									{resolvedAcceptText}
								</ConsentButton>
							{:else if action === 'customize'}
								<ConsentButton
									action="open-consent-dialog"
									variant={isPrimary ? 'primary' : 'neutral'}
									class={actionClassName}
									data-testid="consent-banner-customize-button"
								>
									{resolvedCustomizeText}
								</ConsentButton>
							{/if}
						{/snippet}
					</PolicyActionsRenderer>
				</div>
			</div>
		</div>
	</div>
{/if}
