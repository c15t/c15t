import type { C15TOptions } from '~/types';
import type { InferFieldsInput, InferFieldsOutput } from './field-inference';
import type { Field } from './field-types';

/**
 * Infers field types from plugin definitions in C15T options.
 * Extracts and combines field definitions from enabled plugins.
 *
 * @template TOptions - The C15T options configuration type
 * @template TSchemaKey - Key for accessing the specific entity schema within plugins
 * @template TFormat - Format to return ('output' or 'input')
 *
 * @example
 * ```typescript
 * // Configuration with plugins defining consent fields
 * interface MyOptions extends C15TOptions {
 *   auth: {
 *     plugins: {
 *       consent: {
 *         enabled: true,
 *         subjectFields: {
 *           acceptedTerms: {
 *             type: 'boolean',
 *             required: true
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 *
 * // Infer the output types for subject fields from plugins
 * type SubjectPluginFields = InferFieldsFromPlugins<MyOptions, 'subjectFields', 'output'>;
 * // Results in { acceptedTerms: boolean }
 * ```
 *
 * @remarks
 * This type helper allows plugins to extend entity schemas with their own fields.
 * It walks through all enabled plugins, extracts fields for the specified entity type,
 * and combines them into a single type.
 */
export type InferFieldsFromPlugins<
	TOptions extends C15TOptions,
	TSchemaKey extends string,
	TFormat extends 'output' | 'input' = 'output',
> = InferFieldsFromObjectPath<
	TOptions,
	[string, 'plugins', string, TSchemaKey],
	TFormat
>;

/**
 * Infers field types from C15T options for a specific module.
 * Used to extract additional fields defined in options.
 *
 * @template TOptions - The C15T options configuration type
 * @template TSchemaKey - Key for accessing the specific entity schema
 * @template TFormat - Format to return ('output' or 'input')
 *
 * @example
 * ```typescript
 * // Configuration with additional subject fields
 * interface MyOptions extends C15TOptions {
 *   auth: {
 *     subjectFields: {
 *       profile: {
 *         type: 'string',
 *         required: false
 *       }
 *     }
 *   }
 * }
 *
 * // Infer the output types for subject fields from options
 * type SubjectAdditionalFields = InferFieldsFromOptions<MyOptions, 'subject', 'subjectFields', 'output'>;
 * // Results in { profile?: string | null | undefined }
 * ```
 *
 * @remarks
 * TSchemaKey can be one of:
 * - Single string key like 'subjectFields' to access TOptions[T]['subjectFields']
 * - Array of strings for a nested path like ['subject', 'subjectFields']
 *
 * This type helper extracts custom fields defined directly in the options object,
 * rather than those defined in plugins.
 */
export type InferFieldsFromOptions<
	TOptions extends C15TOptions,
	TModuleKey extends keyof TOptions & string,
	TSchemaKey extends string,
	TFormat extends 'output' | 'input' = 'output',
> = InferFieldsFromObjectPath<TOptions, [TModuleKey, TSchemaKey], TFormat>;

// Internal helper type
type InferFieldsFromObjectPath<
	TOptions,
	TPath extends (string | number)[],
	TFormat extends 'output' | 'input',
> = TFormat extends 'output'
	? InferFieldsOutput<GetFieldsFromPath<TOptions, TPath>>
	: InferFieldsInput<GetFieldsFromPath<TOptions, TPath>>;

// Internal helper type for accessing nested paths
type GetFieldsFromPath<
	TOptions,
	TPath extends (string | number)[],
> = TPath extends [infer TFirst, ...infer TRest]
	? TFirst extends keyof TOptions
		? TRest extends (string | number)[]
			? TRest['length'] extends 0
				? TOptions[TFirst] extends Record<string, Field>
					? TOptions[TFirst]
					: never
				: GetFieldsFromPath<TOptions[TFirst], TRest>
			: never
		: TFirst extends string
			? TOptions extends Record<string, unknown>
				? TRest extends (string | number)[]
					? TRest['length'] extends 0
						? {
								[K in keyof TOptions]: K extends TFirst
									? TOptions[K] extends Record<string, Field>
										? TOptions[K]
										: never
									: never;
							}[keyof TOptions & TFirst]
						: {
								[K in keyof TOptions]: K extends TFirst
									? GetFieldsFromPath<TOptions[K], TRest>
									: never;
							}[keyof TOptions & TFirst]
					: never
				: never
			: never
	: Record<string, never>;
