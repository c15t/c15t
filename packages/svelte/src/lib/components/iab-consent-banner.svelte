<script lang="ts">
	import type { Model } from '@c15t/core';
	import buttonStyles from '@c15t/ui/styles/components/button';
	import actionStyles from '@c15t/ui/styles/components/consent-actions';
	import styles from '@c15t/ui/styles/components/iab-consent-banner';
	import { getTextDirection } from '@c15t/ui/utils';

	import { focusTrap } from '../actions/focus-trap';
	import { portal } from '../actions/portal';
	import { scrollLock } from '../actions/scroll-lock';
	import { getConsentContext, getThemeContext } from '../context.svelte';
	import { getIABTranslations } from '../iab-translations';
	import { getIABBannerDisplayItems } from '../iab-types';
	import { useBannerVisibility } from '../use-banner-visibility.svelte';
	import { resolveComponentStyles } from '../utils';
	import Branding from './branding.svelte';
	import Overlay from './overlay.svelte';

	let {
		noStyle: localNoStyle,
		disableAnimation: localDisableAnimation,
		scrollLock: localScrollLock,
		trapFocus: localTrapFocus = true,
		hideBranding = false,
		primaryButton = 'customize' as 'reject' | 'accept' | 'customize',
		models = ['iab'] as Model[],
		class: className,
	}: {
		noStyle?: boolean;
		disableAnimation?: boolean;
		scrollLock?: boolean;
		trapFocus?: boolean;
		hideBranding?: boolean;
		primaryButton?: 'reject' | 'accept' | 'customize';
		models?: Model[];
		class?: string;
	} = $props();

	const consent = getConsentContext();
	const theme = getThemeContext();

	const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);
	const disableAnimation = $derived(
		localDisableAnimation ?? theme.disableAnimation ?? false
	);
	const shouldTrapFocus = $derived(localTrapFocus ?? theme.trapFocus ?? true);
	// The IAB banner is modal — `aria-modal` on the card, focus trapped —
	// so it locks the page and paints a backdrop unless a host opts out.
	const shouldScrollLock = $derived(
		localScrollLock ?? theme.scrollLock ?? true
	);

	// IAB state
	const iabState = $derived(consent.state.iab);

	// Translations
	const iabT = $derived(getIABTranslations(consent.state.translationConfig));
	const textDirection = $derived(
		getTextDirection(consent.state.translationConfig?.defaultLanguage)
	);

	// Visibility logic
	const shouldShowBanner = $derived(
		consent.state.activeUI === 'banner' &&
			models.includes(consent.state.model) &&
			iabState?.config.enabled === true
	);

	const visibility = useBannerVisibility(
		() => shouldShowBanner,
		() => disableAnimation
	);

	// Vendor count from GVL + custom vendors
	const vendorCount = $derived.by(() => {
		if (!iabState?.gvl) {
			return 0;
		}
		const gvlVendorCount = Object.keys(iabState.gvl.vendors).length;
		const customVendorCount = iabState.nonIABVendors?.length ?? 0;
		return gvlVendorCount + customVendorCount;
	});

	// Display items: stacks + purposes + special features (max 5)
	const displayItems = $derived.by(() => {
		if (!iabState?.gvl) {
			return { displayed: [] as string[], isReady: false, remainingCount: 0 };
		}
		const result = getIABBannerDisplayItems(iabState.gvl);
		return { ...result, isReady: true };
	});

	// Handlers
	const handleAcceptAll = function handleAcceptAll() {
		iabState?.acceptAll();
		iabState?.save();
		consent.state.setActiveUI('none');
	};

	const handleRejectAll = function handleRejectAll() {
		iabState?.rejectAll();
		iabState?.save();
		consent.state.setActiveUI('none');
	};

	const handleCustomize = function handleCustomize() {
		iabState?.setPreferenceCenterTab('purposes');
		consent.state.setActiveUI('dialog');
	};

	const handleViewVendors = function handleViewVendors() {
		iabState?.setPreferenceCenterTab('vendors');
		consent.state.setActiveUI('dialog');
	};

	const isPrimary = function isPrimary(
		button: 'reject' | 'accept' | 'customize'
	): boolean {
		return button === primaryButton;
	};

	/**
	 * The shared button stylesheet keys its variants off `data-*`, the way
	 * every other consent button in the repo does. Emitting the same
	 * attributes keeps the IAB banner's controls identical to React's.
	 */
	const actionButtonAttrs = function actionButtonAttrs(
		button: 'reject' | 'accept' | 'customize'
	) {
		const primary = isPrimary(button);
		return {
			'data-mode': primary && button !== 'reject' ? 'filled' : 'stroke',
			'data-size': 'small',
			'data-variant': primary ? 'primary' : 'neutral',
		} as const;
	};

	// Styling
	const rootStyle = $derived(
		resolveComponentStyles(
			'iabConsentBanner',
			theme.theme,
			{
				baseClassName: styles.root,
				className,
				noStyle,
			},
			noStyle
		)
	);

	const finalClassName = $derived(
		noStyle
			? rootStyle.className || ''
			: `${rootStyle.className || ''} ${visibility.isVisible ? styles.bannerVisible : styles.bannerHidden}`
	);

	// Resolved texts
	const descriptionText = $derived(
		iabT.banner.description.replace('{partnerCount}', String(vendorCount))
	);
	const partnersLinkText = $derived(
		iabT.banner.partnersLink.replace('{count}', String(vendorCount))
	);
	const scopeNotice = $derived(iabT.banner.scopeServiceSpecific);

	// Split description around partners link
	const descriptionParts = $derived(descriptionText.split(partnersLinkText));
</script>

{#if visibility.isMounted && visibility.shouldRender && displayItems.isReady}
	<div use:portal>
		{#if shouldScrollLock}
			<Overlay
				variant="iab-banner"
				visible={visibility.isVisible}
			/>
		{/if}
		<div
			bind:this={visibility.bannerEl}
			class={finalClassName}
			dir={textDirection}
			data-position={textDirection === 'ltr' ? 'bottom-left' : 'bottom-right'}
			data-testid="iab-consent-banner-root"
			use:focusTrap={shouldTrapFocus}
			use:scrollLock={shouldScrollLock}
		>
			<div class={noStyle ? '' : styles.cardShell || ''}>
				<Branding
					{hideBranding}
					{noStyle}
					variant="banner-tag"
					themeKey="iabConsentBannerTag"
					data-testid="iab-consent-banner-branding"
				/>
				<div
					class={noStyle ? '' : styles.card}
					data-testid="iab-consent-banner-card"
					role={shouldTrapFocus ? 'dialog' : undefined}
					aria-modal={shouldTrapFocus ? 'true' : undefined}
					aria-label={iabT.banner.title}
				>
					<!-- Header -->
					<div
						class={noStyle ? '' : styles.header}
						data-testid="iab-consent-banner-header"
					>
						<h2 class={noStyle ? '' : styles.title}>{iabT.banner.title}</h2>
						<p class={noStyle ? '' : styles.description}>
							{descriptionParts[0]}
							<button
								type="button"
								class={noStyle ? '' : styles.partnersLink}
								data-testid="iab-consent-banner-partners-link"
								onclick={handleViewVendors}
							>
								{partnersLinkText}
							</button>{descriptionParts[1] ?? ''}
						</p>
						<ul class={noStyle ? '' : styles.purposeList}>
							{#each displayItems.displayed as name (name)}
								<li>{name}</li>
							{/each}
							{#if displayItems.remainingCount > 0}
								<li class={noStyle ? '' : styles.purposeMore}>
									{iabT.banner.andMore.replace(
										'{count}',
										String(displayItems.remainingCount)
									)}
								</li>
							{/if}
						</ul>
						<p class={noStyle ? '' : styles.legitimateInterestNotice}>
							{iabT.banner.legitimateInterestNotice}
							{scopeNotice}
						</p>
					</div>

					<!-- Footer with buttons -->
					<div
						class={noStyle ? '' : `${styles.footer} ${actionStyles.actionRoot}`}
						data-testid="iab-consent-banner-footer"
						data-direction="row"
						data-split="true"
					>
						<div
							class={noStyle ? '' : actionStyles.actionGroup}
							data-direction="row"
						>
							<button
								type="button"
								class={noStyle ? '' : buttonStyles.button}
								{...actionButtonAttrs('reject')}
								onclick={handleRejectAll}
								data-action="reject"
								data-testid="iab-consent-banner-reject-button"
							>
								{iabT.common.rejectAll}
							</button>
							<button
								type="button"
								class={noStyle ? '' : buttonStyles.button}
								{...actionButtonAttrs('accept')}
								onclick={handleAcceptAll}
								data-action="accept"
								data-testid="iab-consent-banner-accept-button"
							>
								{iabT.common.acceptAll}
							</button>
						</div>
						<div
							class={noStyle ? '' : actionStyles.actionGroup}
							data-direction="row"
						>
							<button
								type="button"
								class={noStyle ? '' : buttonStyles.button}
								{...actionButtonAttrs('customize')}
								onclick={handleCustomize}
								data-action="customize"
								data-testid="iab-consent-banner-customize-button"
							>
								{iabT.common.customize}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
