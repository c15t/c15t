/**
 * @packageDocumentation
 * Pure TypeScript types for c15t consent management.
 *
 * This module exports only TypeScript types without any Zod runtime code,
 * making it safe to use in frontend applications without adding bundle size.
 *
 * For validation schemas with Zod, import from '@c15t/schema'
 */

// Import constants directly to avoid Zod
import { brandingValues, jurisdictionCodes } from './shared/constants';

// API types - Consent
export type {
	IdentifyUserInput,
	IdentifyUserOutput,
	PostConsentInput,
	PostConsentOutput,
	VerifyConsentInput,
	VerifyConsentOutput,
} from './api/consent';
// API types - Init
export type {
	InitOutput,
	LocationResponse,
	TranslationsResponse,
} from './api/init';
// API types - Meta
export type { StatusOutput } from './api/meta';
// Domain types
export type {
	AuditLog,
	Consent,
	ConsentPolicy,
	ConsentPurpose,
	ConsentRecord,
	ConsentStatus,
	Domain,
	PolicyType,
	Subject,
} from './domain';

// Shared types - derived from constants without Zod
export type Branding = (typeof brandingValues)[number];
export type JurisdictionCode = (typeof jurisdictionCodes)[number];

// Re-export constants for runtime checks (no Zod involved)
export { brandingValues, jurisdictionCodes };
