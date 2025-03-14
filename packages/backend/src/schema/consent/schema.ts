import { z } from 'zod';

/**
 * Zod schema for validating consent entities.
 *
 * This defines the structure and validation rules for consent records:
 * - Required fields: subjectId, domainId, purposeIds
 * - Default value of 'active' for status
 * - Default current date/time for creation timestamp
 * - Includes audit trail of all changes
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
 *   history: [
 *     {
 *       actionType: 'given',
 *       timestamp: new Date(),
 *       details: { ip: '192.168.1.1' }
 *     }
 *   ]
 * };
 * ```
 */
export const consentHistorySchema = z.object({
	actionType: z.enum(['given', 'withdrawn', 'updated', 'expired']),
	timestamp: z.date(),
	details: z.record(z.unknown()).optional(),
	previousState: z.record(z.unknown()).optional(),
	newState: z.record(z.unknown()).optional(),
});

export const consentSchema = z.object({
	id: z.string(),
	subjectId: z.string(),
	domainId: z.string(),
	purposeIds: z.array(z.string()),
	metadata: z.record(z.unknown()).optional(),
	policyId: z.string().optional(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
	status: z.enum(['active', 'withdrawn', 'expired']).default('active'),
	withdrawalReason: z.string().optional(),
	givenAt: z.date().default(() => new Date()),
	validUntil: z.date().optional(),
	isActive: z.boolean().default(true),
	history: z.array(consentHistorySchema).default([]),
});

/**
 * Type definition for Consent
 *
 * This type represents the structure of a consent record
 * as defined by the consentSchema. It includes all fields
 * that are part of the consent entity and its history.
 */
export type Consent = z.infer<typeof consentSchema>;
export type ConsentHistory = z.infer<typeof consentHistorySchema>;
