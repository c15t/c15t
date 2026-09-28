'use client';

/**
 * `@c15t/react/consent-dialog`: the deferred `ConsentDialog`, the same
 * component the `@c15t/react` entry exports. Its implementation and styles
 * load when the dialog first opens, or earlier when something preloads it,
 * so importing this entry adds nothing heavy to the first load.
 *
 * The eager dialog and its individual parts (`Card`, `Header`, `Overlay`,
 * ...) are in `@c15t/react/components/consent-dialog`.
 *
 * @packageDocumentation
 */

export { ConsentDialog } from './aggregate-components';
export type {
	ConsentDialogCompoundComponent,
	ConsentDialogProps,
} from './components/panel';
