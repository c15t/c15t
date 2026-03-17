<script lang="ts">
	import styles from '@c15t/ui/styles/components/iab-consent-banner.module.js';
	import { getTextDirection } from '@c15t/ui/utils';
	import type { Model } from 'c15t';
	import { focusTrap } from '../actions/focus-trap';
	import { portal } from '../actions/portal';
	import { scrollLock } from '../actions/scroll-lock';
	import {
		getConsentContext,
		getThemeContext,
		setTrackingContext,
	} from '../context.svelte';
	import { getIABTranslations } from '../iab-translations';
	import { getIABBannerDisplayItems } from '../iab-types';
	import { useBannerVisibility } from '../use-banner-visibility.svelte';
	import { resolveComponentStyles } from '../utils';
	import Overlay from './Overlay.svelte';

	let {
		noStyle: localNoStyle,
		disableAnimation: localDisableAnimation,
		scrollLock: localScrollLock = true,
		trapFocus: localTrapFocus = true,
		primaryButton = 'customize' as 'reject' | 'accept' | 'customize',
		models = ['iab'] as Model[],
		uiSource = 'iab_banner',
		class: className,
	}: {
		noStyle?: boolean;
		disableAnimation?: boolean;
		scrollLock?: boolean;
		trapFocus?: boolean;
		primaryButton?: 'reject' | 'accept' | 'customize';
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
		if (!iabState?.gvl) return 0;
		const gvlVendorCount = Object.keys(iabState.gvl.vendors).length;
		const customVendorCount = iabState.nonIABVendors?.length ?? 0;
		return gvlVendorCount + customVendorCount;
	});

	// Display items: stacks + purposes + special features (max 5)
	const displayItems = $derived.by(() => {
		if (!iabState?.gvl) {
			return { displayed: [] as string[], remainingCount: 0, isReady: false };
		}
		const result = getIABBannerDisplayItems(iabState.gvl);
		return { ...result, isReady: true };
	});

	// Handlers
	function handleAcceptAll() {
		iabState?.acceptAll();
		iabState?.save();
		consent.state.setActiveUI('none');
	}

	function handleRejectAll() {
		iabState?.rejectAll();
		iabState?.save();
		consent.state.setActiveUI('none');
	}

	function handleCustomize() {
		iabState?.setPreferenceCenterTab('purposes');
		consent.state.setActiveUI('dialog');
	}

	function handleViewVendors() {
		iabState?.setPreferenceCenterTab('vendors');
		consent.state.setActiveUI('dialog');
	}

	function isPrimary(button: 'reject' | 'accept' | 'customize'): boolean {
		return button === primaryButton;
	}

	// Styling
	const rootStyle = $derived(
		resolveComponentStyles(
			'iabConsentBanner',
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
		<Overlay visible={visibility.isVisible} />
		<div
			bind:this={visibility.bannerEl}
			class={finalClassName}
			dir={textDirection}
			data-testid="iab-consent-banner-root"
			use:focusTrap={shouldTrapFocus}
			use:scrollLock={shouldScrollLock}
		>
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
						{descriptionParts[0]}<button
							type="button"
							class={noStyle ? '' : styles.partnersLink}
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
					class={noStyle ? '' : styles.footer}
					data-testid="iab-consent-banner-footer"
				>
					<div class={noStyle ? '' : styles.footerButtonGroup}>
						<button
							type="button"
							class={noStyle
								? ''
								: `${styles.rejectButton || ''} ${isPrimary('reject') ? styles.primaryButton || '' : ''}`}
							onclick={handleRejectAll}
							data-testid="iab-consent-banner-reject-button"
						>
							{iabT.common.rejectAll}
						</button>
						<button
							type="button"
							class={noStyle
								? ''
								: `${styles.acceptButton || ''} ${isPrimary('accept') ? styles.primaryButton || '' : ''}`}
							onclick={handleAcceptAll}
							data-testid="iab-consent-banner-accept-button"
						>
							{iabT.common.acceptAll}
						</button>
					</div>
					<div class={noStyle ? '' : styles.footerSpacer}></div>
					<button
						type="button"
						class={noStyle
							? ''
							: `${styles.customizeButton || ''} ${isPrimary('customize') ? styles.primaryButton || '' : ''}`}
						onclick={handleCustomize}
						data-testid="iab-consent-banner-customize-button"
					>
						{iabT.common.customize}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
