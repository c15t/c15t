import { z } from 'zod';

/**
 * Zod schema for validating consent consentPurpose entities.
 *
 * This defines the structure and validation rules for consent consentPurpose records:
 * - Required fields: code, name, description
 * - Default value of false for isEssential
 * - Default value of true for isActive
 * - Optional fields for dataCategory and legalBasis
 * - Default current date/time for creation and update timestamps
 *
 * @example
 * ```typescript
 * const purposeData = {
 *   id: 'pur_e8zyhgozr3im7xj59it',
 *   code: 'marketing',
 *   name: 'Marketing Communications',
 *   description: 'Allow us to send you marketing materials',
 *   isEssential: false
 * };
 *
 * // Validate and parse the consentPurpose data
 * const validPurpose = purposeSchema.parse(purposeData);
 *
 * // Example with missing fields (defaults will be applied)
 * const minimalPurposeData = {
 *   id: 'pur_e8zyhgozr3im7xj59it',
 *   code: 'marketing',
 *   name: 'Marketing Communications',
 *   description: 'Allow us to send you marketing materials',
 * };
 *
 * // isEssential will default to false, isActive to true, etc.
 * const purposeWithDefaults = purposeSchema.parse(minimalPurposeData);
 * ```
 */
export const purposeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  isEssential: z.boolean().default(false),
  dataCategory: z.string().optional(),
  legalBasis: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * Type definition for ConsentPurpose
 *
 * This type represents the structure of a consent consentPurpose record
 * as defined by the purposeSchema. It includes all fields
 * that are part of the consent consentPurpose entity.
 */
export type ConsentPurpose = z.infer<typeof purposeSchema>;
