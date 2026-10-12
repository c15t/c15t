import type { C15tError, C15tFailure, C15tSuccess } from '../index';

/** Narrows a result to its success, failing the test with the error otherwise. */
export const successOf = <Data>(
	result: C15tSuccess<Data> | C15tFailure<string>
): C15tSuccess<Data> => {
	if (!result.ok) {
		throw new Error(
			`Expected success, got ${JSON.stringify(result.error.toJSON())}`
		);
	}
	return result;
};

/** Narrows a result to its data, failing the test with the error otherwise. */
export const dataOf = <Data>(
	result: C15tSuccess<Data> | C15tFailure<string>
): Data => successOf(result).data;

/** Narrows a result to its error, failing the test on success. */
export const errorOf = <Code extends string>(
	result: C15tSuccess<unknown> | C15tFailure<Code>
): C15tError<Code> => {
	if (result.ok) {
		throw new Error(
			`Expected failure, got status ${result.status}: ${JSON.stringify(result.data)}`
		);
	}
	return result.error;
};
