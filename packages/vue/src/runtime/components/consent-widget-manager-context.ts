import type { PresentationAction } from '@c15t/core';
import type { InjectionKey } from 'vue';

import type { useConsentDraft } from '../composables/draft';

/** Manager-owned draft and completion behavior for its inline widget.
 * @internal
 */
export const consentWidgetManagerKey: InjectionKey<{
	draft: ReturnType<typeof useConsentDraft>;
	onAction: (action: PresentationAction) => Promise<void>;
}> = Symbol('c15t-consent-widget-manager');
