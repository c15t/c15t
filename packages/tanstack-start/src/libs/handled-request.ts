/**
 * The request `consentRequestMiddleware` handles: the Start request this
 * code runs in, from `getRequest()`. The middleware records what it
 * resolved on that request and checks it again for the response, while a
 * render or a route handler may hold a clone or another `Request`.
 * Outside a Start request, such as a unit test, it is `request`.
 */
export const handledRequestFor = async function handledRequestFor(
	request: Request
): Promise<Request> {
	try {
		const { getRequest } = await import('@tanstack/react-start/server');
		return getRequest();
	} catch {
		return request;
	}
};
