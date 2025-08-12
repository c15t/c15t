import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

export const consentPolicyTable = table('consentPolicy', {
	id: idColumn('id', 'varchar(255)').defaultTo$('auto'),
	version: column('version', 'string'),
	type: column('type', 'string'),
	name: column('name', 'string'),
	effectiveDate: column('effectiveDate', 'timestamp'),
	expirationDate: column('expirationDate', 'timestamp').nullable(),
	content: column('content', 'string'),
	contentHash: column('contentHash', 'string'),
	isActive: column('isActive', 'bool').defaultTo$(() => true),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
});

export const PolicyTypeSchema = z.enum([
	'cookie_banner',
	'privacy_policy',
	'dpa',
	'terms_and_conditions',
	'marketing_communications',
	'age_verification',
	'other',
]);

export const consentPolicySchema = z.object({
	id: z.string(),
	version: z.string(),
	type: PolicyTypeSchema,
	name: z.string(),
	effectiveDate: z.date(),
	expirationDate: z.date().nullable().optional(),
	content: z.string(),
	contentHash: z.string(),
	isActive: z.boolean().default(true),
	createdAt: z.date().default(() => new Date()),
});

export type ConsentPolicy = z.infer<typeof consentPolicySchema>;
export type PolicyType = z.infer<typeof PolicyTypeSchema>;
