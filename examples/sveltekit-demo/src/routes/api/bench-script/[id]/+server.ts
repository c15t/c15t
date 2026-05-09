import type { RequestHandler } from '@sveltejs/kit';
import { text } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;
	const body = [
		`window.__c15tScriptBench?.recordScriptExecution?.(${JSON.stringify(id)});`,
		`window.__c15tScriptBench && (window.__c15tScriptBench.scriptEvents[${JSON.stringify(id)}] = performance.now());`,
	].join('\n');

	return text(body, {
		headers: {
			'cache-control': 'no-store',
			'content-type': 'application/javascript; charset=utf-8',
		},
	});
};
