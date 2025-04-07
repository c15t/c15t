import { getWithHooks } from '~/pkgs/data-model';
import type { GenericEndpointContext, RegistryContext } from '~/pkgs/types';
import { validateEntityOutput } from '../definition';
import type { ConsentPurpose } from './schema';

/**
 * Creates and returns a set of consent purpose adapter methods to interact with the database.
 * These methods provide a consistent interface for creating and finding
 * consent purpose records while applying hooks and enforcing data validation rules.
 *
 * The consent purpose registry manages purpose definitions that describe specific
 * data processing activities for which consent may be given. Each purpose has a unique
 * code, name, description, and essential status flag indicating whether it's required
 * for core system functionality.
 *
 * @param params - Registry context parameters
 * @param params.adapter - The database adapter used for direct database operations
 * @param params.ctx - Additional context properties containing hooks and options
 * @returns An object containing type-safe consent purpose operations
 *
 * @example
 * ```ts
 * const registry = consentPurposeRegistry({
 *   adapter: databaseAdapter,
 *   hooks: customHooks,
 *   options: validationOptions
 * });
 *
 * // Create a marketing purpose
 * const marketingPurpose = await registry.createConsentPurpose({
 *   code: 'marketing',
 *   name: 'Marketing Communications',
 *   description: 'Allow us to send you promotional materials and offers',
 *   isEssential: false
 * });
 * ```
 *
 * @see {@link RegistryContext} For details on the context parameters
 * @see {@link ConsentPurpose} For the structure of consent purpose objects
 */
export function consentPurposeRegistry({ adapter, ...ctx }: RegistryContext) {
	const { createWithHooks } = getWithHooks(adapter, ctx);
	return {
		/**
		 * Creates a new consent purpose record in the database.
		 *
		 * This method creates a purpose definition that subjects can consent to.
		 * Purposes represent specific data processing activities (such as marketing,
		 * analytics, or personalization) that require user consent. The method
		 * automatically sets creation and update timestamps and applies any
		 * configured hooks during the creation process.
		 *
		 * @param consentPurpose - ConsentPurpose data to create (without id and timestamps)
		 * @param consentPurpose.code - Unique code identifying the purpose (e.g., 'marketing')
		 * @param consentPurpose.name - Human-readable name for the purpose
		 * @param consentPurpose.description - Detailed explanation of what the purpose entails
		 * @param consentPurpose.isEssential - Whether this purpose is required for core functionality
		 * @param context - Optional endpoint context for hooks execution
		 * @returns Promise resolving to the created purpose with all fields populated
		 * @throws {Error} When the creation operation fails or returns null
		 * @throws May also throw errors if hooks prevent creation or if validation fails
		 *
		 * @example
		 * ```ts
		 * // Create an analytics purpose
		 * const analyticsPurpose = await registry.createConsentPurpose({
		 *   code: 'analytics',
		 *   name: 'Usage Analytics',
		 *   description: 'Collect anonymous usage data to improve our services',
		 *   isEssential: false,
		 *   metadata: {
		 *     category: 'Tracking',
		 *     dataRetention: '90 days'
		 *   }
		 * });
		 *
		 * // Create an essential purpose
		 * const essentialPurpose = await registry.createConsentPurpose({
		 *   code: 'security',
		 *   name: 'Security & Fraud Prevention',
		 *   description: 'Process data necessary to protect against unauthorized access',
		 *   isEssential: true,
		 *   metadata: {
		 *     category: 'Core',
		 *     legalBasis: 'legitimate interest'
		 *   }
		 * });
		 * ```
		 *
		 * @see {@link ConsentPurpose} For the complete structure of consent purpose objects
		 * @see {@link GenericEndpointContext} For details on the context object
		 */
		createConsentPurpose: async (
			consentPurpose: Omit<ConsentPurpose, 'id' | 'createdAt' | 'updatedAt'> &
				Partial<ConsentPurpose>,
			context?: GenericEndpointContext
		) => {
			const createdPurpose = await createWithHooks({
				data: {
					id: consentPurpose.id || '',
					createdAt: new Date(),
					updatedAt: new Date(),
					...consentPurpose,
				},
				model: 'consentPurpose',
				context,
			});

			if (!createdPurpose) {
				throw new Error(
					'Failed to create consent purpose - operation returned null'
				);
			}

			return validateEntityOutput(
				'consentPurpose',
				createdPurpose,
				ctx.options
			);
		},

		/**
		 * Finds a consent purpose by its unique code.
		 *
		 * This method retrieves a single consent purpose that matches the provided code.
		 * The code serves as a unique identifier for purposes across the system.
		 * The resulting purpose is validated against the schema before being returned.
		 *
		 * @param code - The unique code of the purpose to find
		 * @returns Promise resolving to the validated purpose object if found, null otherwise
		 *
		 * @example
		 * ```ts
		 * // Find the marketing purpose
		 * const marketingPurpose = await registry.findConsentPurposeByCode('marketing');
		 * if (marketingPurpose) {
		 *   console.log(`Found purpose: ${marketingPurpose.name}`);
		 *   console.log(`Description: ${marketingPurpose.description}`);
		 *   console.log(`Essential: ${marketingPurpose.isEssential ? 'Yes' : 'No'}`);
		 * } else {
		 *   console.log('Purpose not found');
		 * }
		 * ```
		 *
		 * @see {@link ConsentPurpose} For the structure of the returned purpose object
		 */
		findConsentPurposeByCode: async (code: string) => {
			const consentPurpose = await adapter.findOne({
				model: 'consentPurpose',
				where: [
					{
						field: 'code',
						value: code,
					},
				],
			});
			return consentPurpose
				? validateEntityOutput('consentPurpose', consentPurpose, ctx.options)
				: null;
		},
	};
}
