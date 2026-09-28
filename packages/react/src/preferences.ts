'use client';

/**
 * `@c15t/react/consent-widget`: the deferred `ConsentWidget`, the same
 * component the `@c15t/react` entry exports. Its implementation and styles
 * load when the widget first renders.
 *
 * The eager widget and its individual parts (`Accordion`, `Switch`, `Footer`,
 * ...) are in `@c15t/react/components/consent-widget`.
 *
 * @packageDocumentation
 */

export { ConsentWidget } from './aggregate-components';
export type {
	ConsentWidgetCompoundComponent,
	ConsentWidgetProps,
} from './components/preferences';
