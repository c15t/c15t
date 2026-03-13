<script lang="ts">
	import { resolveTranslations } from '@c15t/ui/utils';
	import { defaultTranslationConfig } from 'c15t';
	import { getConsentContext, getThemeContext } from '../../context.svelte';

	const consent = getConsentContext();
	const theme = getThemeContext();

	const translations = $derived(
		resolveTranslations(
			consent.state.translationConfig,
			defaultTranslationConfig
		)
	);
</script>

<div data-testid="has-manager">{Boolean(consent.manager).toString()}</div>
<div data-testid="active-ui">{consent.state.activeUI}</div>
<div data-testid="model">{consent.state.model}</div>
<div data-testid="no-style">{String(theme.noStyle ?? false)}</div>
<div data-testid="translation-banner-title">{translations.cookieBanner.title}</div>
<div data-testid="translation-banner-description"
	>{translations.cookieBanner.description}</div
>
<div data-testid="translation-dialog-title"
	>{translations.consentManagerDialog.title}</div
>
<div data-testid="translation-accept-all">{translations.common.acceptAll}</div>
<div data-testid="translation-reject-all">{translations.common.rejectAll}</div>
<div data-testid="translation-customize">{translations.common.customize}</div>
<div data-testid="translation-save">{translations.common.save}</div>
<div data-testid="translation-necessary-title"
	>{translations.consentTypes?.necessary?.title ?? ''}</div
>
