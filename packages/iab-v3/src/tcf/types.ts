/**
 * Re-export IAB types from core.
 *
 * The canonical IAB type definitions live in `c15t` core since they define
 * the contract between core and the IAB addon. This file re-exports them
 * for convenience within the @c15t/iab package.
 *
 * @packageDocumentation
 */

export type {
	CMPApi,
	CMPApiConfig,
	FetchGVLResult,
	IABActions,
	IABConfig,
	IABManager,
	IABModule,
	IABState,
} from 'c15t';
