/**
 * Returns the in-flight request for `key`, or starts and tracks a new one.
 *
 * Settled requests are removed only when they are still the request registered
 * for the key, so an older request cannot delete a newer replacement.
 *
 * @param requests - In-flight requests indexed by their logical operation
 * @param key - Stable identity for the operation
 * @param createRequest - Starts the operation when no request is in flight
 * @returns The existing or newly tracked request
 */
export const coalesceInFlight = function coalesceInFlight<Result>(
	requests: Map<string, Promise<Result>>,
	key: string,
	createRequest: () => Promise<Result>
): Promise<Result> {
	const existingRequest = requests.get(key);
	if (existingRequest) {
		return existingRequest;
	}

	const requestRef: { current?: Promise<Result> } = {};
	const request = (async () => {
		try {
			return await createRequest();
		} finally {
			if (requests.get(key) === requestRef.current) {
				requests.delete(key);
			}
		}
	})();
	requestRef.current = request;

	requests.set(key, request);
	return request;
};
