import type { Result, ResultAsync } from 'neverthrow';
import { BASE_ERROR_CODES } from './codes';
import type { C15TError } from './error';
import { safeResult, safeResultAsync } from './results';

/**
 * Creates a standard validation pipeline
 *
 * @param validator - Function that validates input
 * @param processor - Function that processes validated input
 * @returns A function that validates and processes input in a Result chain
 */
export const validationPipeline = <Input, Output>(
	validator: (input: Input) => boolean | string,
	processor: (input: Input) => Output
): ((input: Input) => Result<Output, C15TError>) => {
	return (input: Input) => {
		const validationResult = safeResult(() => {
			const validationOutcome = validator(input);
			if (validationOutcome === false) {
				throw new Error('Validation failed');
			}
			if (typeof validationOutcome === 'string') {
				throw new Error(validationOutcome);
			}
			return input;
		}, BASE_ERROR_CODES.INVALID_REQUEST);

		return validationResult.andThen((validInput) =>
			safeResult(() => processor(validInput))
		);
	};
};

/**
 * Creates a standard async data retrieval pipeline
 *
 * @param fetcher - Function that fetches data
 * @param transformer - Function that transforms fetched data
 * @returns A function that fetches and transforms data in a ResultAsync chain
 */
export const retrievalPipeline = <RawData, TransformedData>(
	fetcher: () => Promise<RawData>,
	transformer: (data: RawData) => TransformedData
): (() => ResultAsync<TransformedData, C15TError>) => {
	return () => {
		return safeResultAsync(
			fetcher(),
			BASE_ERROR_CODES.FAILED_TO_GET_CONSENT
		).andThen((data) =>
			safeResult(
				() => transformer(data),
				BASE_ERROR_CODES.INVALID_CONFIGURATION
			)
		);
	};
};
