/**
 * Extracts a useful error message from any error type.
 *
 * Handles `AggregateError` (e.g. from Node.js `net.connect` failing on both
 * IPv4/IPv6) where `error.message` is empty but `error.errors[]` contains the
 * real messages.
 */
export function extractErrorMessage(error: unknown): string {
	if (error instanceof AggregateError && error.errors?.length > 0) {
		const inner = error.errors
			.map((e: unknown) => (e instanceof Error ? e.message : String(e)))
			.join('; ');
		return `AggregateError: ${inner}`;
	}

	if (error instanceof Error) {
		return error.message || error.name;
	}

	return String(error);
}
