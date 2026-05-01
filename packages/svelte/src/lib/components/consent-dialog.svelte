<script lang="ts">
import styles from '@c15t/ui/styles/components/consent-dialog.module.js';
import { getTextDirection, resolveTranslations } from '@c15t/ui/utils';
import type { LegalLinks as LegalLinksType, Model } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import {
	getConsentContext,
	getThemeContext,
	setTrackingContext,
} from '../context.svelte';
import { Dialog, Portal } from '../primitives';
import { resolveComponentStyles } from '../utils';
import Branding from './branding.svelte';
import ConsentDialogTrigger from './consent-dialog-trigger.svelte';
import ConsentWidget from './consent-widget.svelte';
import InlineLegalLinks from './inline-legal-links.svelte';

type ConsentDialogTriggerProps = {
	defaultPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
	persistPosition?: boolean;
	showWhen?: 'always' | 'after-consent' | 'never';
	size?: 'sm' | 'md' | 'lg';
	ariaLabel?: string;
	noStyle?: boolean;
	class?: string;
};

const {
	open: openProp,
	noStyle: localNoStyle,
	hideBranding,
	legalLinks,
	showTrigger = false,
	models = ['opt-in', 'opt-out'] as Model[],
	class: className,
}: {
	open?: boolean;
	noStyle?: boolean;
	hideBranding?: boolean;
	legalLinks?: (keyof LegalLinksType)[] | null;
	showTrigger?: boolean | ConsentDialogTriggerProps;
	models?: Model[];
	class?: string;
} = $props();

const consent = getConsentContext();
const theme = getThemeContext();
setTrackingContext({
	get uiSource() {
		return 'dialog';
	},
});

const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);
const disableAnimation = $derived(theme.disableAnimation ?? false);

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

// Per-element theme key styling
const rootStyle = $derived(
	resolveComponentStyles(
		'consentDialog',
		theme.theme,
		{ className, noStyle },
		noStyle
	)
);

const cardStyle = $derived(
	resolveComponentStyles(
		'consentDialogCard',
		theme.theme,
		{ baseClassName: styles.card, noStyle },
		noStyle
	)
);

const headerStyle = $derived(
	resolveComponentStyles(
		'consentDialogHeader',
		theme.theme,
		{ baseClassName: styles.header, noStyle },
		noStyle
	)
);

const titleStyle = $derived(
	resolveComponentStyles(
		'consentDialogTitle',
		theme.theme,
		{ baseClassName: styles.title, noStyle },
		noStyle
	)
);

const descriptionStyle = $derived(
	resolveComponentStyles(
		'consentDialogDescription',
		theme.theme,
		{ baseClassName: styles.description, noStyle },
		noStyle
	)
);

const contentStyle = $derived(
	resolveComponentStyles(
		'consentDialogContent',
		theme.theme,
		{ baseClassName: styles.content, noStyle },
		noStyle
	)
);

// Trigger props
const triggerProps = $derived.by(() => {
	if (showTrigger === true) return {};
	if (showTrigger === false) return null;
	return showTrigger;
});

function handleOpenChange(details: { open: boolean }) {
	if (!details.open) {
		consent.state.setActiveUI('none');
	}
}
</script>

{#if triggerProps}
	<ConsentDialogTrigger {...triggerProps} />
{/if}

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
		<Dialog.Backdrop class={noStyle ? '' : styles.overlay || ''} data-testid="consent-dialog-overlay" />
		<Dialog.Positioner
			class={noStyle
				? ''
				: `${styles.root || ''} ${!disableAnimation ? (isOpen ? styles.dialogVisible || '' : styles.dialogHidden || '') : ''}`}
			data-testid="consent-dialog-root"
		>
			<Dialog.Content
				class={noStyle
					? rootStyle.className || ''
					: `${styles.container || ''} ${rootStyle.className || ''} ${!disableAnimation ? (isOpen ? styles.contentVisible || '' : styles.contentHidden || '') : ''}`}
				dir={textDirection}
				aria-labelledby="consent-dialog-title"
				aria-describedby="consent-dialog-description"
			>
				<!-- Card -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class={noStyle ? '' : cardStyle.className || ''}
					data-testid="consent-dialog-card"
					data-c15t-dialog-focus="true"
					tabindex={-1}
				>
					<!-- Header -->
					<div
						class={noStyle ? '' : headerStyle.className || ''}
						data-testid="consent-dialog-header"
					>
						<div
							class={noStyle ? '' : titleStyle.className || ''}
							data-testid="consent-dialog-title"
							id="consent-dialog-title"
						>
							{translations.consentManagerDialog.title}
						</div>
						<div
							class={noStyle ? '' : descriptionStyle.className || ''}
							data-testid="consent-dialog-description"
							id="consent-dialog-description"
						>
							{translations.consentManagerDialog.description}
							<InlineLegalLinks
								links={legalLinks}
								themeKey="consentDialogContent"
								testIdPrefix="consent-dialog-legal-link"
							/>
						</div>
					</div>

					<!-- Content: ConsentWidget -->
					<div
						class={noStyle ? '' : contentStyle.className || ''}
						data-testid="consent-dialog-content"
					>
						<ConsentWidget hideBranding {noStyle} />
					</div>
					<Branding
						{hideBranding}
						{noStyle}
						variant="dialog-tag"
						themeKey="consentDialogTag"
						data-testid="consent-dialog-branding"
					/>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog.Root>
