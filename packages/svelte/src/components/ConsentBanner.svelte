<script lang="ts">
	import type { Model } from 'c15t';
	import { onMount } from 'svelte';
	import styles from '@c15t/ui/styles/components/consent-banner.module.js';
	import { resolveTranslations } from '@c15t/ui/utils';
	import { defaultTranslationConfig } from 'c15t';
	import { getTextDirection } from '@c15t/ui/utils';
	import { getConsentContext, getThemeContext, setTrackingContext } from '../context.svelte';
	import { resolveComponentStyles } from '../utils';
	import { portal } from '../actions/portal';
	import { focusTrap } from '../actions/focus-trap';
	import { scrollLock } from '../actions/scroll-lock';
	import ConsentButton from './ConsentButton.svelte';
	import Overlay from './Overlay.svelte';

	/**
	 * Button identifiers for the consent banner layout.
	 */
	type ConsentBannerButton = 'reject' | 'accept' | 'customize';
	type ConsentBannerLayout = (ConsentBannerButton | ConsentBannerButton[])[];

	const DEFAULT_LAYOUT: ConsentBannerLayout = [
		['reject', 'accept'],
		'customize',
	];

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
		layout?: ConsentBannerLayout;
		primaryButton?: ConsentBannerButton | ConsentBannerButton[];
		models?: Model[];
		uiSource?: string;
		class?: string;
	} = $props();

	const consent = getConsentContext();
	const theme = getThemeContext();
	setTrackingContext({ get uiSource() { return uiSource; } });

	const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);
	const disableAnimation = $derived(
		localDisableAnimation ?? theme.disableAnimation ?? false
	);
	const shouldTrapFocus = $derived(localTrapFocus ?? theme.trapFocus ?? true);
	const shouldScrollLock = $derived(localScrollLock ?? theme.scrollLock ?? false);

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
		consent.state.activeUI === 'banner' && models.includes(consent.state.model)
	);

	let isVisible = $state(false);
	let isMounted = $state(false);

	onMount(() => {
		isMounted = true;
	});

	$effect(() => {
		if (shouldShowBanner) {
			const timer = setTimeout(() => {
				isVisible = true;
			}, 10);
			return () => clearTimeout(timer);
		}
		if (disableAnimation) {
			isVisible = false;
		} else {
			const timer = setTimeout(() => {
				isVisible = false;
			}, 200);
			return () => clearTimeout(timer);
		}
	});

	// Styling
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

	const finalClassName = $derived(
		noStyle
			? rootStyle.className || ''
			: `${rootStyle.className || ''} ${isVisible ? styles.bannerVisible : styles.bannerHidden}`
	);

	// Button helpers
	function isPrimary(type: ConsentBannerButton): boolean {
		return Array.isArray(primaryButton)
			? primaryButton.includes(type)
			: type === primaryButton;
	}

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

{#if isMounted && shouldShowBanner}
	<div use:portal>
		<Overlay visible={isVisible} />
		<div
			class={finalClassName}
			dir={textDirection}
			data-testid="consent-banner-root"
			use:focusTrap={shouldTrapFocus}
			use:scrollLock={shouldScrollLock}
		>
			<div
				class={noStyle ? '' : styles.card}
				data-testid="consent-banner-card"
				role={shouldTrapFocus ? 'dialog' : undefined}
				aria-modal={shouldTrapFocus ? 'true' : undefined}
				aria-label={resolvedTitle}
			>
				<div class={noStyle ? '' : styles.header} data-testid="consent-banner-header">
					<div class={noStyle ? '' : styles.title} data-testid="consent-banner-title">
						{resolvedTitle}
					</div>
					<div
						class={noStyle ? '' : styles.description}
						data-testid="consent-banner-description"
					>
						{resolvedDescription}
					</div>
				</div>
				<div class={noStyle ? '' : styles.footer} data-testid="consent-banner-footer">
					{#each layout as item, index}
						{#if Array.isArray(item)}
							<div
								class={noStyle ? '' : styles.footerSubGroup}
								data-testid="consent-banner-footer-sub-group"
							>
								{#each item as buttonType}
									{#if buttonType === 'reject'}
										<ConsentButton
											action="reject-consent"
											variant={isPrimary('reject') ? 'primary' : 'neutral'}
											closeConsentBanner
											data-testid="consent-banner-reject-button"
										>
											{#snippet children()}
												{resolvedRejectText}
											{/snippet}
										</ConsentButton>
									{:else if buttonType === 'accept'}
										<ConsentButton
											action="accept-consent"
											variant={isPrimary('accept') ? 'primary' : 'neutral'}
											closeConsentBanner
											data-testid="consent-banner-accept-button"
										>
											{#snippet children()}
												{resolvedAcceptText}
											{/snippet}
										</ConsentButton>
									{:else if buttonType === 'customize'}
										<ConsentButton
											action="open-consent-dialog"
											variant={isPrimary('customize') ? 'primary' : 'neutral'}
											data-testid="consent-banner-customize-button"
										>
											{#snippet children()}
												{resolvedCustomizeText}
											{/snippet}
										</ConsentButton>
									{/if}
								{/each}
							</div>
						{:else}
							{#if item === 'reject'}
								<ConsentButton
									action="reject-consent"
									variant={isPrimary('reject') ? 'primary' : 'neutral'}
									closeConsentBanner
									data-testid="consent-banner-reject-button"
								>
									{#snippet children()}
										{resolvedRejectText}
									{/snippet}
								</ConsentButton>
							{:else if item === 'accept'}
								<ConsentButton
									action="accept-consent"
									variant={isPrimary('accept') ? 'primary' : 'neutral'}
									closeConsentBanner
									data-testid="consent-banner-accept-button"
								>
									{#snippet children()}
										{resolvedAcceptText}
									{/snippet}
								</ConsentButton>
							{:else if item === 'customize'}
								<ConsentButton
									action="open-consent-dialog"
									variant={isPrimary('customize') ? 'primary' : 'neutral'}
									data-testid="consent-banner-customize-button"
								>
									{#snippet children()}
										{resolvedCustomizeText}
									{/snippet}
								</ConsentButton>
							{/if}
						{/if}
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
