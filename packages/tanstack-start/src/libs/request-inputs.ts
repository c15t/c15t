import type { ConsentRequestHeaderInputs as ConsentRequestInputs } from '@c15t/schema/types';

/**
 * Consent inputs the request middleware resolved, keyed by the request
 * object. Lets header-only readers (`resolveConsent`, the init route) see
 * middleware overrides even on runtimes whose `request.headers`
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

/**
 * The request `Cookie` header with the subject ID the middleware set on the
 * response, keyed by the request. The browser sends that cookie only from
 * its next request, so the render in this one reads it from here.
 */
const subjectCookieByRequest = new WeakMap<Request, string>();

/** Records the cookie header carrying the subject ID minted for `request`. */
export const rememberSubjectCookieHeader = function rememberSubjectCookieHeader(
	request: Request,
	cookie: string
): void {
	subjectCookieByRequest.set(request, cookie);
};

/** Requests whose render read the visitor's cookies. */
const visitorRenders = new WeakSet<Request>();

/**
 * Records that a render on `request` read the visitor's cookies, so its
 * HTML holds that visitor's consent state and subject ID.
 */
export const rememberVisitorRender = function rememberVisitorRender(
	request: Request
): void {
	visitorRenders.add(request);
};

/** Whether a render on `request` read the visitor's cookies. */
export const renderedForVisitor = function renderedForVisitor(
	request: Request
): boolean {
	return visitorRenders.has(request);
};

/**
 * Reads the cookie header the middleware recorded for `request`, or
 * `undefined` when it minted no subject ID, so the request's own header is
 * read.
 */
export const readSubjectCookieHeader = function readSubjectCookieHeader(
	request: Request
): string | undefined {
	return subjectCookieByRequest.get(request);
};
