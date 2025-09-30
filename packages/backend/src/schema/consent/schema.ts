import { z } from 'zod';

/**
 * Zod schema for validating consent entities.
 *
 * This defines the structure and validation rules for consent records:
 * - Required fields: subjectId, domainId, purposeIds
 * - Default value of 'active' for status
 * - Default current date/time for creation timestamp
 * - Captures contextual information like IP address and user agent
 *
 * @example
 * ```typescript
 * const consentData = {
 *   id: 'cns_w5qufx2a66m7xkn3ty',
 *   subjectId: 'sub_x1pftyoufsm7xgo1kv',
 *   domainId: 'dom_x1pftyoufsm7xgo1kv',
 *   purposeIds: ['pur_e8zyhgozr3im7xj59it'],
 *   status: 'active',
 *   givenAt: new Date(),
 *   isActive: true,
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...',
 * };
 * ```
 */

export const consentSchema = z.object({
	id: z.string(),
	subjectId: z.string(),
	domainId: z.string(),
	purposeIds: z.array(z.string()),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	policyId: z.string().optional(),
	ipAddress: z.string().nullable().optional(),
	userAgent: z.string().nullable().optional(),
	status: z.enum(['active', 'withdrawn', 'expired']).prefault('active'),
	withdrawalReason: z.string().nullable().optional(),
	givenAt: z.date().prefault(() => new Date()),
	validUntil: z.date().nullable().optional(),
	isActive: z.boolean().prefault(true),
});

/**
 * Type definition for Consent
 *
 * This type represents the structure of a consent record
 * as defined by the consentSchema. It includes all fields
 * that are part of the consent entity and its history.
 */
export type Consent = z.infer<typeof consentSchema>;
