import type { PresentationAction } from '@c15t/core';
import type { InjectionKey } from 'vue';

import type { ConsentDraft } from '../composables/draft';

/** Manager-owned draft and completion behavior for its inline widget.
 * @internal
 */
export const consentWidgetManagerKey: InjectionKey<{
	draft: ConsentDraft;
	onAction: (action: PresentationAction) => Promise<void>;
}> = Symbol('c15t-consent-widget-manager');
