<script lang="ts">
import { Dialog } from '@ark-ui/svelte/dialog';
import { Portal } from '@ark-ui/svelte/portal';
import styles from '@c15t/ui/styles/components/consent-dialog.module.js';
import { getTextDirection, resolveTranslations } from '@c15t/ui/utils';
import type { Model } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import { getConsentContext, getThemeContext, setTrackingContext } from '../context.svelte';
import { resolveComponentStyles } from '../utils';
import ConsentWidget from './ConsentWidget.svelte';
import C15TIcon from './icons/C15TIcon.svelte';
import ConsentIconOnly from './icons/ConsentIconOnly.svelte';

const {
	open: openProp,
	noStyle: localNoStyle,
	hideBranding,
	models = ['opt-in', 'opt-out'] as Model[],
	class: className,
}: {
	open?: boolean;
	noStyle?: boolean;
	hideBranding?: boolean;
	models?: Model[];
	class?: string;
} = $props();

const consent = getConsentContext();
const theme = getThemeContext();
setTrackingContext({ uiSource: 'dialog' });

const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);

// Translations
const translations = $derived(
	resolveTranslations(consent.state.translationConfig, defaultTranslationConfig)
);
const textDirection = $derived(
	getTextDirection(consent.state.translationConfig?.defaultLanguage)
);

// Open state
const isOpen = $derived(
	models.includes(consent.state.model) &&
		(openProp ?? consent.state.activeUI === 'dialog')
);

// Styling
const rootStyle = $derived(
	resolveComponentStyles(
		'consentDialog',
		theme.theme,
		{ className, noStyle },
		noStyle
	)
);

// Branding
const branding = $derived(consent.state.branding);
const showBranding = $derived(!hideBranding && branding !== 'none');
const brandingHref = $derived.by(() => {
	const refParam =
		typeof window !== 'undefined' ? `?ref=${window.location.hostname}` : '';
	return branding === 'consent'
		? `https://consent.io${refParam}`
		: `https://c15t.com${refParam}`;
});

function handleOpenChange(details: { open: boolean }) {
	if (!details.open) {
		consent.state.setActiveUI('none');
	}
}
</script>

<Dialog.Root
	open={isOpen}
	onOpenChange={handleOpenChange}
	closeOnInteractOutside={false}
	closeOnEscape={true}
	trapFocus={true}
	preventScroll={true}
	lazyMount
	unmountOnExit
>
	<Portal>
		<Dialog.Backdrop
			class={noStyle ? '' : styles.overlay || ''}
			data-testid="consent-overlay"
		/>
		<Dialog.Positioner
			class={noStyle ? '' : styles.root || ''}
			data-testid="consent-dialog-root"
		>
			<Dialog.Content
				class={noStyle
					? rootStyle.className || ''
					: `${styles.container || ''} ${rootStyle.className || ''}`}
				dir={textDirection}
				data-testid="consent-dialog-card"
			>
				<!-- Card -->
				<div class={noStyle ? '' : styles.card || ''}>
					<!-- Header -->
					<div
						class={noStyle ? '' : styles.header || ''}
						data-testid="consent-dialog-header"
					>
						<Dialog.Title
							class={noStyle ? '' : styles.title || ''}
							data-testid="consent-dialog-title"
						>
							{translations.consentManagerDialog.title}
						</Dialog.Title>
						<Dialog.Description
							class={noStyle ? '' : styles.description || ''}
							data-testid="consent-dialog-description"
						>
							{translations.consentManagerDialog.description}
						</Dialog.Description>
					</div>

					<!-- Content: ConsentWidget -->
					<div
						class={noStyle ? '' : styles.content || ''}
						data-testid="consent-dialog-content"
					>
						<ConsentWidget {hideBranding} {noStyle} />
					</div>

					<!-- Footer with branding -->
					<div
						class={noStyle ? '' : styles.footer || ''}
						data-testid="consent-dialog-footer"
					>
						{#if showBranding}
							<a
								dir="ltr"
								class={noStyle ? '' : styles.branding || ''}
								href={brandingHref}
							>
								Secured by
								{#if branding === 'consent'}
									<ConsentIconOnly class={styles.brandingConsent || ''} />
								{:else}
									<C15TIcon class={styles.brandingC15T || ''} />
								{/if}
							</a>
						{/if}
					</div>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog.Root>
