import { z } from 'zod';

/**
 * Zod schema for validating subject entities.
 *
 * This defines the structure and validation rules for subject records:
 * - Requires a valid UUID for the ID field
 * - Default value of false for isIdentified
 * - Optional fields for externalId, identityProvider, and lastIpAddress
 * - Default current date/time for creation and update timestamps
 *
 * @example
 * ```typescript
 * const subjectData = {
 *   id: 'sub_x1pftyoufsm7xgo1kv',
 *   externalId: 'ext-123',
 *   isIdentified: true
 * };
 *
 * // Validate and parse the subject data
 * const validSubject = subjectSchema.parse(subjectData);
 * ```
 */
export const subjectSchema = z.object({
  id: z.string(),
  isIdentified: z.boolean().default(false),
  externalId: z.string().nullable().optional(),
  identityProvider: z.string().optional(),
  lastIpAddress: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * Type definition for Subject
 *
 * This type represents the structure of a subject record
 * as defined by the subjectSchema. It includes all fields
 * that are part of the subject entity.
 */
export type Subject = z.infer<typeof subjectSchema>;
