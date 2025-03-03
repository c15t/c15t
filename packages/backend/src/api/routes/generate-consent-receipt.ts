import { createAuthEndpoint } from '../call';
import { APIError } from 'better-call';
import { z } from 'zod';
import crypto from 'node:crypto';
import type { C15TContext } from '../../types';
import type { inferRecord as RecordType } from '~/db/schema/record/schema';

// Define the schema for validating request parameters
const generateConsentReceiptSchema = z.object({
	consentId: z.string(),
	includeSignature: z.boolean().default(true),
});

/**
 * Endpoint for generating a standardized consent receipt.
 *
 * This endpoint generates a detailed receipt document that provides formal proof of consent,
 * following industry standards for consent documentation. The receipt includes comprehensive
 * information about who gave consent, what they consented to, and all metadata associated
 * with the consent event.
 *
 * Optionally, the receipt can include a cryptographic signature for verification purposes.
 *
 * @endpoint GET /consent/receipt
 */
export const generateConsentReceipt = createAuthEndpoint(
	'/consent/receipt',
	{
		method: 'GET',
		query: generateConsentReceiptSchema,
	},
	async (ctx) => {
		try {
			const validatedData = generateConsentReceiptSchema.safeParse(ctx.query);

			if (!validatedData.success) {
				throw new APIError('BAD_REQUEST', {
					message: 'Invalid request parameters',
					details: validatedData.error.errors,
				});
			}

			const params = validatedData.data;
			const { registry } = ctx.context as C15TContext;

			if (!registry) {
				throw new APIError('INTERNAL_SERVER_ERROR', {
					message: 'Registry not available',
					status: 503,
				});
			}

			// Get the consent record with related information
			const consentResult = await registry.findConsentById(params.consentId);
			//@ts-expect-error
			if (!consentResult || !consentResult.consent) {
				throw new APIError('NOT_FOUND', {
					message: 'Consent record not found',
					details: { consentId: params.consentId },
				});
			}
			//@ts-expect-error
			const record = consentResult.consent;
			//@ts-expect-error
			const userRecord = consentResult.user;

			if (!userRecord) {
				throw new APIError('NOT_FOUND', {
					message: 'User associated with consent not found',
					details: { consentId: params.consentId },
				});
			}

			// Get consent records related to this consent
			let records: RecordType[] = [];

			try {
				if (registry.getRecords) {
					//@ts-expect-error
					records = await registry.getRecords(consentResult.consent.id);
				}
			} catch (error) {
				// Log error but continue processing
				if (ctx.context?.logger) {
					ctx.context.logger.error(
						`Error retrieving records for consent ${params.consentId}:`,
						error
					);
				}
			}

			// Get domain information
			const domain = {
				id: record.domainId,
				domain: record.domainId,
				name: `Domain for ${record.domainId}`,
			};

			// Generate a unique receipt ID
			const receiptId = `CR${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 1000)}`;

			// Map consent preferences to services and purposes
			const services = Object.entries(record.preferences || {}).map(
				([key, value]) => {
					// Convert key to a more readable service name
					const serviceName = key.charAt(0).toUpperCase() + key.slice(1);

					return {
						service: serviceName,
						purposes: [
							{
								purpose: key,
								purposeDescription: `${value ? 'Enabled' : 'Disabled'} ${key} tracking and functionality`,
								consentType: 'EXPLICIT',
								purposeCategory: [serviceName],
								termination: record.policyId
									? `As specified in policy ${record.policyId}`
									: 'Until consent is withdrawn',
								thirdPartyDisclosure: false,
							},
						],
					};
				}
			);

			// Extract metadata from consent records
			const metadata = {
				deviceInfo:
					//@ts-expect-error
					records.length > 0 && records[0]?.recordMetadata?.deviceInfo
						? //@ts-expect-error
							records[0].recordMetadata.deviceInfo
						: 'Not recorded',
				ipAddress: record.ipAddress || 'Not recorded',
				policyId: record.policyId,
				...record.metadata,
			};

			// Create the receipt object
			const receipt = {
				version: '1.0.0',
				jurisdiction: 'GDPR', // Default to GDPR
				consentTimestamp: record.givenAt || new Date(),
				collectionMethod:
					//@ts-expect-error
					records.length > 0 && records[0]?.recordTypeDetail
						? //@ts-expect-error
							records[0].recordTypeDetail
						: 'API',
				consentReceiptID: receiptId,
				publicKey: process.env.CONSENT_RECEIPT_PUBLIC_KEY || 'not-configured',
				subject: {
					id: userRecord.id,
					idType: 'UUID',
				},
				dataController: {
					id: domain.domain,
					name: domain.name || domain.domain,
					on_behalf: [],
				},
				policyURL: `https://${domain.domain}/privacy`,
				services,
				sensitive: false,
				spiCat: [],
				metadata,
			};

			// Add signature if requested
			if (params.includeSignature) {
				// Create a hash of the receipt data as a signature
				const receiptString = JSON.stringify(receipt);
				const signature = crypto
					.createHash('sha256')
					.update(receiptString)
					.digest('hex');

				//@ts-expect-error
				receipt.signature = signature;
			}

			// Return the completed receipt
			return {
				success: true,
				data: {
					receipt,
					receiptId,
					timestamp: new Date().toISOString(),
				},
			};
		} catch (error) {
			const context = ctx.context as C15TContext;
			context.logger?.error?.('Error generating consent receipt:', error);

			if (error instanceof APIError) {
				throw error;
			}
			if (error instanceof z.ZodError) {
				throw new APIError('BAD_REQUEST', {
					message: 'Invalid request parameters',
					details: error.errors,
				});
			}

			throw new APIError('INTERNAL_SERVER_ERROR', {
				message: 'Failed to generate consent receipt',
				status: 503,
				details:
					error instanceof Error ? { message: error.message } : { error },
			});
		}
	}
);
