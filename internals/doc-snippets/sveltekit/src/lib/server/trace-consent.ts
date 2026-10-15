// #region docs:trace-consent title="src/lib/server/trace-consent.ts"
import type { RequestHandler } from '@sveltejs/kit';

const SPAN_STATUS_ERROR = 2;

export const traceConsent =
	(handler: RequestHandler): RequestHandler =>
	async (event) => {
		if (!event.tracing.enabled) {
			return handler(event);
		}

		const span = event.tracing.current;
		const path = (event.params.path ?? '').split('/').filter(Boolean).join('/');
		let operation = 'proxy';
		if (event.request.method === 'GET') {
			if (path === '' || path === 'init') {
				operation = 'init';
			}
			if (path === 'manifest') {
				operation = 'manifest';
			}
		}
		span.setAttribute('c15t.operation', operation);

		const response = await handler(event);
		span.setAttribute('http.response.status_code', response.status);
		if (response.status >= 500) {
			span.setStatus({
				code: SPAN_STATUS_ERROR,
				message: `Consent request returned HTTP ${response.status}`,
			});
		}
		return response;
	};
// #endregion docs:trace-consent
