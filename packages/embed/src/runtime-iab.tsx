import { IABConsentBanner, IABConsentDialog } from '@c15t/react';
import type { EmbedIABComponents } from './types';

function registerWithRuntime(target: Window): void {
	const components: EmbedIABComponents = {
		Banner: IABConsentBanner,
		Dialog: IABConsentDialog,
	};

	if (target.c15tEmbed?.registerIABComponents) {
		target.c15tEmbed.registerIABComponents(components);
		return;
	}

	target.__c15tEmbedPendingIABComponents = components;
}

export function registerEmbedIABAddon(target: Window = window): void {
	registerWithRuntime(target);
}

if (typeof window !== 'undefined') {
	registerEmbedIABAddon(window);
}
