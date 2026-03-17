/**
 * Edge handler types — the minimal subset of C15TOptions needed to run /init
 * without a database adapter.
 *
 * @packageDocumentation
 */

import type { C15TOptions } from '~/types';

/**
 * Configuration for the edge init handler.
 * This is a strict subset of {@link C15TOptions} containing only the fields
 * needed for consent policy resolution — no database adapter required.
 */
export type C15TEdgeOptions = Pick<
	C15TOptions,
	| 'appName'
	| 'tenantId'
	| 'trustedOrigins'
	| 'disableGeoLocation'
	| 'customTranslations'
	| 'i18n'
	| 'policyPacks'
	| 'branding'
	| 'iab'
	| 'cache'
	| 'policySnapshot'
	| 'telemetry'
	| 'logger'
>;
