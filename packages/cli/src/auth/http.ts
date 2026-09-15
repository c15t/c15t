import { TIMEOUTS } from '../constants';

/** Fetch with a per-request deadline and optional caller cancellation. */
export const fetchWithDeadline = (
	url: string,
	init: RequestInit = {},
	timeout: number = TIMEOUTS.HTTP_REQUEST
): Promise<Response> => {
	const deadline = AbortSignal.timeout(timeout);
	return fetch(url, {
		...init,
		signal: init.signal ? AbortSignal.any([deadline, init.signal]) : deadline,
	});
};
