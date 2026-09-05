import type { ConsentRequestInputs } from '../headers';

/**
 * Consent inputs the request middleware resolved, keyed by the request
 * object. Lets header-only readers (`readInitialConsentConfig`, the init
 * route) see middleware overrides even on runtimes whose `request.headers`
 * are immutable and cannot carry the normalized values.
 */
const inputsByRequest = new WeakMap<Request, ConsentRequestInputs>();

/** Records the inputs the middleware resolved for `request`. */
export const rememberConsentInputs = function rememberConsentInputs(
	request: Request,
	inputs: ConsentRequestInputs
): void {
	inputsByRequest.set(request, inputs);
};

/** Reads the inputs the middleware recorded for `request`, if any. */
export const readConsentInputs = function readConsentInputs(
	request: Request
): ConsentRequestInputs | undefined {
	return inputsByRequest.get(request);
};
