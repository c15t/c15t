import { z } from 'zod';

/**
 * Zod schema for validating domain entities.
 *
 * This defines the structure and validation rules for domain records:
 * - Required fields: name
 * - Optional fields: description, allowedOrigins
 * - Default value of true for isActive and isVerified
 * - Default current date/time for creation timestamp
 *
 * @example
 * ```typescript
 * const domainData = {
 *   id: 'dom_x1pftyoufsm7xgo1kv',
 *   name: 'example.com',
 *   description: 'Company website',
 *   allowedOrigins: ['https://app.example.com', 'https://admin.example.com']
 * };
 *
 * // Validate and parse the domain data
 * const validDomain = domainSchema.parse(domainData);
 * ```
 */
export const domainSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  allowedOrigins: z.array(z.string()).optional().default([]),
  isVerified: z.boolean().default(true),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * Type definition for Domain
 *
 * This type represents the structure of a domain record
 * as defined by the domainSchema. It includes all fields
 * that are part of the domain entity.
 */
export type Domain = z.infer<typeof domainSchema>;
