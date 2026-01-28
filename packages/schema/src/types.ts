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

// API types - Consent (v2.0: only check endpoint remains)
export type {
	CheckConsentOutput,
	CheckConsentQuery,
	ConsentCheckResult,
} from './api/consent';
// API types - Init
export type {
	InitOutput,
	LocationResponse,
	TranslationsResponse,
} from './api/init';
// API types - Meta
export type { StatusOutput } from './api/meta';
// API types - Subject
export type {
	ConsentItem,
	GetSubjectInput,
	GetSubjectOutput,
	GetSubjectParams,
	GetSubjectQuery,
	ListSubjectsOutput,
	ListSubjectsQuery,
	PatchSubjectFullInput,
	PatchSubjectInput,
	PatchSubjectOutput,
	PatchSubjectParams,
	PostSubjectInput,
	PostSubjectOutput,
	SubjectItem,
} from './api/subject';
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

// GVL types - IAB TCF Global Vendor List
export type {
	GlobalVendorList,
	GVLDataCategory,
	GVLFeature,
	GVLPurpose,
	GVLSpecialFeature,
	GVLSpecialPurpose,
	GVLStack,
	GVLVendor,
	GVLVendorUrl,
} from './shared/gvl';

// Non-IAB vendor types - Custom vendors not registered with IAB
export type {
	NonIABVendor,
	NonIABVendorConsent,
} from './shared/non-iab-vendor';

// Re-export constants for runtime checks (no Zod involved)
export { brandingValues, jurisdictionCodes };
