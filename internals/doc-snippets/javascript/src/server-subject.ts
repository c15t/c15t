// #region docs:server-subject title="server.ts"
import { resolveRequestSubject } from 'c15t/server';

export const handleRequest = async function handleRequest(
	request: Request,
	render: (request: Request) => Promise<Response>
): Promise<Response> {
	const subject = resolveRequestSubject({
		request: { headers: request.headers, url: request.url },
		// Match the browser's storage options, if you changed them.
		storage: { storageKey: 'c15t' },
	});
	if (!subject) {
		// A prefetch or prerender: render it without a subject.
		return render(request);
	}

	// The render reads the ID from the rewritten Cookie header.
	const headers = new Headers(request.headers);
	headers.set('cookie', subject.cookie);
	const response = await render(new Request(request, { headers }));
	if (!subject.setCookie) {
		return response;
	}

	// A response from fetch() or Response.redirect() has immutable
	// headers, so the cookie goes on a copy.
	const withCookie = new Response(response.body, response);
	withCookie.headers.append('set-cookie', subject.setCookie.header);
	return withCookie;
};
// #endregion docs:server-subject
