/**
 * IAB TCF Global Vendor List (GVL) schemas and types.
 *
 * Based on IAB TCF v2.3 specification.
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 */
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Purpose Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const gvlPurposeSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
	illustrations: z.array(z.string()),
	descriptionLegal: z.string().optional(),
});

export const gvlSpecialPurposeSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
	illustrations: z.array(z.string()),
	descriptionLegal: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const gvlFeatureSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
	illustrations: z.array(z.string()),
	descriptionLegal: z.string().optional(),
});

export const gvlSpecialFeatureSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
	illustrations: z.array(z.string()),
	descriptionLegal: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const gvlVendorUrlSchema = z.object({
	langId: z.string(),
	privacy: z.string().optional(),
	legIntClaim: z.string().optional(),
});

export const gvlVendorSchema = z.object({
	id: z.number(),
	name: z.string(),
	purposes: z.array(z.number()),
	legIntPurposes: z.array(z.number()),
	flexiblePurposes: z.array(z.number()),
	specialPurposes: z.array(z.number()),
	features: z.array(z.number()),
	specialFeatures: z.array(z.number()),
	cookieMaxAgeSeconds: z.number().nullable(),
	usesCookies: z.boolean(),
	cookieRefresh: z.boolean(),
	usesNonCookieAccess: z.boolean(),
	urls: z.array(gvlVendorUrlSchema),
	deviceStorageDisclosureUrl: z.string().optional(),
	dataCategories: z.array(z.number()).optional(),
	dataRetention: z
		.object({
			purposes: z.record(z.string(), z.number()).optional(),
			specialPurposes: z.record(z.string(), z.number()).optional(),
			stdRetention: z.number().optional(),
		})
		.optional(),
	deletedDate: z.string().optional(),
	overflow: z
		.object({
			httpGetLimit: z.number(),
		})
		.optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Stack Schema
// ─────────────────────────────────────────────────────────────────────────────

export const gvlStackSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
	purposes: z.array(z.number()),
	specialFeatures: z.array(z.number()),
});

// ─────────────────────────────────────────────────────────────────────────────
// Data Category Schema
// ─────────────────────────────────────────────────────────────────────────────

export const gvlDataCategorySchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Global Vendor List Schema
// ─────────────────────────────────────────────────────────────────────────────

export const globalVendorListSchema = z.object({
	gvlSpecificationVersion: z.number(),
	vendorListVersion: z.number(),
	tcfPolicyVersion: z.number(),
	lastUpdated: z.string(),
	purposes: z.record(z.string(), gvlPurposeSchema),
	specialPurposes: z.record(z.string(), gvlSpecialPurposeSchema),
	features: z.record(z.string(), gvlFeatureSchema),
	specialFeatures: z.record(z.string(), gvlSpecialFeatureSchema),
	vendors: z.record(z.string(), gvlVendorSchema),
	stacks: z.record(z.string(), gvlStackSchema),
	dataCategories: z.record(z.string(), gvlDataCategorySchema).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type GVLPurpose = z.infer<typeof gvlPurposeSchema>;
export type GVLSpecialPurpose = z.infer<typeof gvlSpecialPurposeSchema>;
export type GVLFeature = z.infer<typeof gvlFeatureSchema>;
export type GVLSpecialFeature = z.infer<typeof gvlSpecialFeatureSchema>;
export type GVLVendorUrl = z.infer<typeof gvlVendorUrlSchema>;
export type GVLVendor = z.infer<typeof gvlVendorSchema>;
export type GVLStack = z.infer<typeof gvlStackSchema>;
export type GVLDataCategory = z.infer<typeof gvlDataCategorySchema>;
export type GlobalVendorList = z.infer<typeof globalVendorListSchema>;
