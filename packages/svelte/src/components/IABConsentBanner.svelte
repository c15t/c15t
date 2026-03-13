<script lang="ts">
	import type { Model } from 'c15t';
	import { onMount } from 'svelte';
	import styles from '@c15t/ui/styles/components/iab-consent-banner.module.js';
	import { getTextDirection } from '@c15t/ui/utils';
	import { getConsentContext, getThemeContext, setTrackingContext } from '../context.svelte';
	import { resolveComponentStyles } from '../utils';
	import { portal } from '../actions/portal';
	import { focusTrap } from '../actions/focus-trap';
	import { scrollLock } from '../actions/scroll-lock';
	import { getIABTranslations } from '../iab-translations';
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
	setTrackingContext({ get uiSource() { return uiSource; } });

	const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);
	const disableAnimation = $derived(
		localDisableAnimation ?? theme.disableAnimation ?? false
	);
	const shouldTrapFocus = $derived(localTrapFocus ?? theme.trapFocus ?? true);
	const shouldScrollLock = $derived(
		localScrollLock ?? theme.scrollLock ?? false
	);

	// IAB state
	const iabState = $derived(consent.state.iab);

	// Translations
	const iabT = $derived(
		getIABTranslations(consent.state.translationConfig)
	);
	const textDirection = $derived(
		getTextDirection(consent.state.translationConfig?.defaultLanguage)
	);

	// Visibility logic
	const shouldShowBanner = $derived(
		consent.state.activeUI === 'banner' &&
			models.includes(consent.state.model) &&
			iabState?.config.enabled === true
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

	// Vendor count from GVL + custom vendors
	const vendorCount = $derived.by(() => {
		if (!iabState?.gvl) return 0;
		const gvlVendorCount = Object.keys(iabState.gvl.vendors).length;
		const customVendorCount = iabState.nonIABVendors?.length ?? 0;
		return gvlVendorCount + customVendorCount;
	});

	// Display items: stacks + purposes + special features (max 5)
	const MAX_DISPLAY_ITEMS = 5;
	const displayItems = $derived.by(() => {
		if (!iabState?.gvl) {
			return { displayed: [] as string[], remainingCount: 0, isReady: false };
		}

		const gvl = iabState.gvl;

		// Get purposes that have vendors
		const purposesWithVendors = Object.entries(gvl.purposes)
			.filter(([id]) =>
				Object.values(gvl.vendors).some(
					(vendor) =>
						vendor.purposes?.includes(Number(id)) ||
						vendor.legIntPurposes?.includes(Number(id))
				)
			)
			.map(([id, purpose]) => ({ id: Number(id), name: purpose.name }));

		// Purpose 1 is always standalone per IAB TCF spec
		const STANDALONE_PURPOSE_ID = 1;
		const standalonePurpose = purposesWithVendors.find(
			(p) => p.id === STANDALONE_PURPOSE_ID
		);
		const otherPurposes = purposesWithVendors.filter(
			(p) => p.id !== STANDALONE_PURPOSE_ID
		);
		const otherPurposeIds = new Set(otherPurposes.map((p) => p.id));

		// Score stacks by coverage
		const gvlStacks = gvl.stacks || {};
		const stackScores: Array<{
			stackId: number;
			name: string;
			coveredPurposeIds: number[];
			score: number;
		}> = [];

		for (const [stackIdStr, stack] of Object.entries(gvlStacks)) {
			const coveredIds = stack.purposes.filter((pid) =>
				otherPurposeIds.has(pid)
			);
			if (coveredIds.length >= 2) {
				stackScores.push({
					stackId: Number(stackIdStr),
					name: stack.name,
					coveredPurposeIds: coveredIds,
					score: coveredIds.length,
				});
			}
		}

		stackScores.sort((a, b) => b.score - a.score);

		// Greedily select stacks
		const selectedStacks: string[] = [];
		const assignedPurposeIds = new Set<number>();

		for (const { name, coveredPurposeIds: covered } of stackScores) {
			const unassignedInStack = covered.filter(
				(pid) => !assignedPurposeIds.has(pid)
			);
			if (unassignedInStack.length >= 2) {
				selectedStacks.push(name);
				for (const pid of unassignedInStack) {
					assignedPurposeIds.add(pid);
				}
			}
		}

		// Purposes not assigned to any stack become standalone
		const uncoveredPurposes = otherPurposes.filter(
			(p) => !assignedPurposeIds.has(p.id)
		);

		// Get special features that have vendors
		const specialFeaturesWithVendors = Object.entries(
			gvl.specialFeatures || {}
		)
			.filter(([id]) =>
				Object.values(gvl.vendors).some((vendor) =>
					vendor.specialFeatures?.includes(Number(id))
				)
			)
			.map(([, feature]) => feature.name);

		// Build final list
		const items: string[] = [];
		if (standalonePurpose) items.push(standalonePurpose.name);
		for (const stackName of selectedStacks) items.push(stackName);
		for (const purpose of uncoveredPurposes) items.push(purpose.name);
		for (const featureName of specialFeaturesWithVendors)
			items.push(featureName);

		const displayed = items.slice(0, MAX_DISPLAY_ITEMS);
		const remainingCount = Math.max(0, items.length - MAX_DISPLAY_ITEMS);

		return { displayed, remainingCount, isReady: true };
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
			'iabConsentBanner' as any,
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

{#if isMounted && shouldShowBanner && displayItems.isReady}
	<div use:portal>
		<Overlay visible={isVisible} />
		<div
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
						{#each displayItems.displayed as name}
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
