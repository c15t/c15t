/**
 * Utility to create isolated models for transaction safety
 *
 * @module isolate
 */
import type { ModelFunctions } from '../model';

/**
 * Type for a model that can be isolated
 */
type IsolatableModel<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
> = ModelFunctions<TDatabase, TTableName, TIdColumnName>;

/**
 * Isolates one or more models for transaction safety
 *
 * This prevents using non-isolated models in transactions,
 * which helps prevent accidental mixing of transaction and non-transaction queries.
 *
 * @typeParam TModels - Type of models to isolate
 * @param models - Model or models to isolate
 * @returns Isolated model(s)
 *
 * @example
 * ```typescript
 * // Isolate a single model
 * const IsolatedUserModel = isolate(UserModel);
 *
 * // Isolate multiple models
 * const {
 *   UserModel: IsolatedUserModel,
 *   PostModel: IsolatedPostModel
 * } = isolate({ UserModel, PostModel });
 * ```
 */
export default function isolate<
	TModels extends
		| IsolatableModel<any, any, any>[]
		| Record<string, IsolatableModel<any, any, any>>,
>(models: TModels): TModels {
	// Handle array of models
	if (Array.isArray(models)) {
		return models.map((model) => ({
			...model,
			isolated: true,
		})) as TModels;
	}

	// Handle record of models
	const isolatedModels: Record<string, IsolatableModel<any, any, any>> = {};

	for (const key of Object.keys(models)) {
		const model = models[key];
		isolatedModels[key] = {
			...model,
			isolated: true,
		} as IsolatableModel<any, any, any>;
	}

	return isolatedModels as TModels;
}
