import { z } from 'zod';

export const PolicyTypeSchema = z.enum([
	'cookie_banner',
	'privacy_policy',
	'dpa',
	'terms_and_conditions',
	'marketing_communications',
	'age_verification',
	'other',
]);
