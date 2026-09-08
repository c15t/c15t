<script lang="ts">
	import type {
		LegalLinks as LegalLinksType,
		Model,
		PromptPosition,
		PromptVariant,
	} from '@c15t/core';
	import {
		defaultTranslationConfig,
		resolveConsentPresentation,
	} from '@c15t/core';
	import type { PolicyRight } from '@c15t/schema/types';
	import styles from '@c15t/ui/styles/components/consent-banner';
	import { getTextDirection, resolveTranslations } from '@c15t/ui/utils';

	import { focusTrap } from '../actions/focus-trap';
	// Banner uses custom portal/focus-trap/scroll-lock actions (not Ark UI's built-in)
	// because the banner is not an Ark Dialog - it's a simpler container that
	// conditionally acts as a dialog. The ConsentDialog uses Ark's Dialog which
	// includes its own focus trap and scroll prevention. When transitioning from
	// banner to dialog, the banner unmounts (removing its focus trap) before
	// the dialog mounts (establishing Ark's focus trap), so they don't compete.
	import { portal } from '../actions/portal';
	import { scrollLock } from '../actions/scroll-lock';
	import { getConsentContext, getThemeContext } from '../context.svelte';
	import { useBannerVisibility } from '../use-banner-visibility.svelte';
	import { resolveComponentStyles, resolveConsentActionStyle } from '../utils';
	import Branding from './branding.svelte';
	import ConsentButton from './consent-button.svelte';
	import InlineLegalLinks from './inline-legal-links.svelte';
	import Overlay from './overlay.svelte';
	import PolicyActionsRenderer from './policy-actions-renderer.svelte';

	/**
	 * Button identifiers for the consent banner layout.
	 */
	type ConsentBannerButton = 'reject' | 'accept' | 'customize' | 'dismiss';
	type ConsentBannerLayout = (ConsentBannerButton | ConsentBannerButton[])[];

	let {
		noStyle: localNoStyle,
		disableAnimation: localDisableAnimation,
		scrollLock: localScrollLock,
		trapFocus: localTrapFocus,
		title,
		description,
		rejectButtonText,
		customizeButtonText,
		acceptButtonText,
		dismissButtonText,
		hideBranding = false,
		legalLinks,
		layout,
		primaryButton,
		variant,
		position,
		blocking,
		models = ['opt-in', 'opt-out', 'iab'] as Model[],
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
		dismissButtonText?: string;
		hideBranding?: boolean;
		legalLinks?: (keyof LegalLinksType)[] | null;
		layout?: ConsentBannerLayout;
		primaryButton?: ConsentBannerButton | ConsentBannerButton[];
		/**
		 * Shape of the prompt. Overrides the host presentation.
		 * A notice defaults to `bar`, a choice prompt to `floating`.
		 */
		variant?: PromptVariant;
		/**
		 * Where the prompt sits. Must be valid for the resolved variant;
		 * an invalid value falls back to the variant default with a
		 * development diagnostic.
		 */
		position?: PromptPosition;
		/**
		 * Backdrop, scroll lock, focus trap, and no dismissal from outside,
		 * as one value. `wall` is always blocking; a notice never is.
		 */
		blocking?: boolean;
		models?: Model[];
		class?: string;
	} = $props();

	/** Corner mirror for right-to-left text when the host set no position. */
	const MIRRORED_POSITIONS: Partial<Record<PromptPosition, PromptPosition>> = {
		'bottom-left': 'bottom-right',
		'bottom-right': 'bottom-left',
		'top-left': 'top-right',
		'top-right': 'top-left',
	};

	const consent = getConsentContext();
	const theme = getThemeContext();

	const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);
	const disableAnimation = $derived(
		localDisableAnimation ?? theme.disableAnimation ?? false
	);

	// Translations
	const translations = $derived(
		resolveTranslations(
			consent.state.translationConfig,
			defaultTranslationConfig
		)
	);
	const textDirection = $derived(
		getTextDirection(consent.state.translationConfig?.defaultLanguage)
	);

	// Visibility logic
	const shouldShowBanner = $derived(
		consent.state.hasPolicy &&
			consent.state.activeUI === 'banner' &&
			consent.snapshot.promptRequirement.kind !== 'none' &&
			models.includes(consent.state.model)
	);

	const visibility = useBannerVisibility(
		() => shouldShowBanner,
		() => disableAnimation
	);

	// Styling - per-element theme key resolution shared across framework adapters.
	const rootStyle = $derived(
		resolveComponentStyles(
			'consentBanner',
			theme.theme,
			{
				baseClassName: styles.root,
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
			{ noStyle },
			noStyle
		)
	);

	const rightsStyle = $derived(
		resolveComponentStyles(
			'consentBannerRights',
			theme.theme,
			{ baseClassName: styles.rights, noStyle },
			noStyle
		)
	);

	const rightLinkStyle = $derived(
		resolveComponentStyles(
			'consentBannerRightLink',
			theme.theme,
			{ baseClassName: styles.rightLink, noStyle },
			noStyle
		)
	);

	// A right control opens the preference center without recording a choice.
	const openPreferences = function openPreferences() {
		consent.state.setActiveUI('dialog');
	};

	const finalClassName = $derived(
		noStyle
			? rootStyle.className || ''
			: `${rootStyle.className || ''} ${visibility.isVisible ? styles.bannerVisible : styles.bannerHidden}`
	);

	const localPrimaryActions = $derived.by(() => {
		if (primaryButton === undefined) {
			return undefined;
		}
		return Array.isArray(primaryButton) ? primaryButton : [primaryButton];
	});
	// Button helpers
	const themedActions = $derived({
		accept: resolveConsentActionStyle(theme.theme, 'accept'),
		customize: resolveConsentActionStyle(theme.theme, 'customize'),
		dismiss: resolveConsentActionStyle(theme.theme, 'dismiss'),
		reject: resolveConsentActionStyle(theme.theme, 'reject'),
		save: resolveConsentActionStyle(theme.theme, 'save'),
	});
	const presentation = $derived(
		resolveConsentPresentation({
			actionAppearance: themedActions,
			override: {
				blocking,
				layout,
				position,
				primaryActions: localPrimaryActions,
				scrollLock: localScrollLock,
				trapFocus: localTrapFocus,
				variant,
			},
			policy: consent.snapshot.policyRule,
			presentation: {
				...consent.state.presentation,
				prompt: {
					scrollLock: theme.scrollLock,
					trapFocus: theme.trapFocus,
					...consent.state.presentation?.prompt,
				},
			},
			surface: 'prompt',
		})
	);
	const actionGroups = $derived(presentation.actionGroups);
	const primaryActions = $derived(presentation.primaryActions);
	// Additional buttons that open preferences, styled as underlined text.
	const preferenceControls = $derived(presentation.preferenceControls);
	// A notice offers dismiss alone; with no primary resolved it takes the lead.
	const dismissIsPrimary = $derived(
		primaryActions.length === 0 &&
			presentation.orderedActions.length === 1 &&
			presentation.orderedActions[0] === 'dismiss'
	);
	const promptKind = $derived(consent.snapshot.policyRule.prompt);
	const isNotice = $derived(promptKind === 'notice');
	const direction = $derived(presentation.direction);
	const shouldFillActions = $derived(presentation.shouldFillActions);
	const shouldTrapFocus = $derived(presentation.trapFocus);
	const shouldScrollLock = $derived(presentation.scrollLock);
	const resolvedVariant = $derived(presentation.variant);
	const isBlocking = $derived(presentation.blocking);
	// A defaulted corner follows the text direction; a host position is
	// physical and stays put.
	const resolvedPosition = $derived.by(() => {
		const { position: resolved, positionSource } = presentation;
		const corner =
			resolvedVariant === 'floating' || resolvedVariant === 'widget';
		if (textDirection === 'rtl' && positionSource === 'default' && corner) {
			return MIRRORED_POSITIONS[resolved] ?? resolved;
		}
		return resolved;
	});

	$effect(() => {
		if (
			typeof process === 'undefined' ||
			process.env?.NODE_ENV !== 'production'
		) {
			for (const diagnostic of presentation.diagnostics) {
				console.warn(diagnostic.message);
			}
		}
	});

	// Resolved texts. A notice has its own copy: it informs and points at
	// the opt-out instead of asking for permission.
	const englishTranslations = defaultTranslationConfig.translations.en;
	const resolvedTitle = $derived(
		title ??
			(isNotice
				? (translations.cookieBanner.noticeTitle ??
					englishTranslations?.cookieBanner?.noticeTitle)
				: translations.cookieBanner.title)
	);
	const resolvedDescription = $derived(
		description ??
			(isNotice
				? (translations.cookieBanner.noticeDescription ??
					englishTranslations?.cookieBanner?.noticeDescription)
				: translations.cookieBanner.description)
	);
	// Acknowledgement records no category choice.
	const resolvedDismissText = $derived(
		dismissButtonText ??
			translations.common.acknowledge ??
			translations.common.dismiss ??
			englishTranslations?.common?.acknowledge
	);
	const rightLabels = $derived<
		Partial<Record<PolicyRight, string | undefined>>
	>({
		'opt-out':
			translations.rights?.optOut ?? englishTranslations?.rights?.optOut,
		preferences:
			translations.rights?.preferences ??
			englishTranslations?.rights?.preferences,
	});
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
		{#if shouldScrollLock}
			<Overlay visible={visibility.isVisible} />
		{/if}
		<div
			bind:this={visibility.bannerEl}
			class={finalClassName}
			dir={textDirection}
			data-variant={resolvedVariant}
			data-position={resolvedPosition}
			data-blocking={isBlocking ? 'true' : undefined}
			data-prompt={promptKind}
			data-model={consent.state.model}
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
					tabindex="-1"
					role={isBlocking ? 'dialog' : 'region'}
					aria-modal={isBlocking ? 'true' : undefined}
					aria-label={resolvedTitle}
					use:focusTrap={shouldTrapFocus}
				>
					<div
						class={noStyle ? '' : headerStyle.className || ''}
						data-testid="consent-banner-header"
					>
						<h2
							class={noStyle ? '' : titleStyle.className || ''}
							data-testid="consent-banner-title"
						>
							{resolvedTitle}
						</h2>
						<div
							class={noStyle ? '' : descriptionStyle.className || ''}
							data-context="banner"
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
						{actionGroups}
						{primaryActions}
						{shouldFillActions}
						{direction}
						{noStyle}
						footerClassName={noStyle ? '' : footerStyle.className || ''}
						footerSubGroupClassName={noStyle
							? ''
							: footerSubGroupStyle.className || ''}
						footerTestId="consent-banner-footer"
						footerSubGroupTestId="consent-banner-footer-sub-group"
					>
						{#snippet leading()}
							{#if preferenceControls.length > 0}
								<div
									class={noStyle ? '' : rightsStyle.className || ''}
									style={rightsStyle.style
										? Object.entries(rightsStyle.style)
												.map(([key, value]) => `${key}:${value}`)
												.join(';')
										: undefined}
									data-testid="consent-banner-rights"
								>
									{#each preferenceControls as right (right)}
										<button
											type="button"
											class={noStyle ? '' : rightLinkStyle.className || ''}
											style={rightLinkStyle.style
												? Object.entries(rightLinkStyle.style)
														.map(([key, value]) => `${key}:${value}`)
														.join(';')
												: undefined}
											data-action="right"
											data-right={right}
											data-c15t-rights={consent.snapshot.policyRule.rights.join(
												' '
											)}
											data-testid={`consent-banner-right-link-${right}`}
											onclick={openPreferences}
										>
											{rightLabels[right] ?? right}
										</button>
									{/each}
								</div>
							{/if}
						{/snippet}
						{#snippet renderAction(action: string, isPrimary: boolean)}
							{#if action === 'reject'}
								<ConsentButton
									action="reject-consent"
									variant={themedActions.reject.variant ??
										(isPrimary ? 'primary' : 'neutral')}
									mode={themedActions.reject.mode ?? 'stroke'}
									closeConsentBanner
									data-action="reject"
									data-testid="consent-banner-reject-button"
								>
									{resolvedRejectText}
								</ConsentButton>
							{:else if action === 'accept'}
								<ConsentButton
									action="accept-consent"
									variant={themedActions.accept.variant ??
										(isPrimary ? 'primary' : 'neutral')}
									mode={themedActions.accept.mode ?? 'stroke'}
									closeConsentBanner
									data-action="accept"
									data-testid="consent-banner-accept-button"
								>
									{resolvedAcceptText}
								</ConsentButton>
							{:else if action === 'dismiss'}
								<ConsentButton
									action="dismiss-notice"
									variant={themedActions.dismiss.variant ??
										(isPrimary || dismissIsPrimary ? 'primary' : 'neutral')}
									mode={themedActions.dismiss.mode ?? 'stroke'}
									data-action="dismiss"
									data-testid="consent-banner-dismiss-button"
								>
									{resolvedDismissText}
								</ConsentButton>
							{:else if action === 'customize'}
								<ConsentButton
									action="open-consent-dialog"
									variant={themedActions.customize.variant ??
										(isPrimary ? 'primary' : 'neutral')}
									mode={themedActions.customize.mode ?? 'stroke'}
									data-action="customize"
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
