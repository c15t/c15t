import { once } from 'node:events';
import { createServer } from 'node:http';

import type {
	buildInitResponse,
	CompatManifest,
} from '../../../internals/next-compat/shared/src/fixture';
import { handleFixtureRequest } from '../../../internals/next-compat/shared/src/fixture';
import {
	toWebRequest,
	writeWebResponse,
} from '../../../internals/next-compat/shared/src/fixture/node-adapter';

/** The existing protocol fixture, with a controllable outage for SSR tests. */
export const startExampleFixture = async function startExampleFixture(
	options: {
		translations?: ReturnType<
			typeof buildInitResponse
		>['translations']['translations'];
	} = {}
) {
	let failing = false;
	const server = createServer(async (request, response) => {
		try {
			const webRequest = await toWebRequest(request);
			const segments = new URL(webRequest.url).pathname
				.split('/')
				.filter(Boolean)
				.slice(2);
			let result: Response;
			if (request.method === 'OPTIONS') {
				result = new Response(null, { status: 204 });
			} else if (failing && ['init', 'manifest'].includes(segments[0] ?? '')) {
				result = Response.json(
					{ error: 'Fixture unavailable' },
					{ status: 503 }
				);
			} else {
				result = await handleFixtureRequest(webRequest, segments);
			}
			if (result.ok && options.translations && segments[0] === 'manifest') {
				const manifest = (await result.json()) as CompatManifest;
				manifest.translations = {
					i18n: {
						defaultProfile: 'default',
						messages: {
							default: {
								fallbackLanguage: 'en',
								translations: { en: options.translations },
							},
						},
					},
				};
				result = Response.json(manifest, { headers: result.headers });
			} else if (result.ok && options.translations && segments[0] === 'init') {
				const init = (await result.json()) as ReturnType<
					typeof buildInitResponse
				>;
				init.translations.translations = options.translations;
				result = Response.json(init, { headers: result.headers });
			}
			if (request.headers.origin) {
				result.headers.set(
					'access-control-allow-origin',
					request.headers.origin
				);
				result.headers.set('access-control-allow-credentials', 'true');
				result.headers.set('vary', 'origin');
			}
			result.headers.set(
				'access-control-allow-methods',
				'GET, POST, PATCH, DELETE, OPTIONS'
			);
			result.headers.set(
				'access-control-allow-headers',
				request.headers['access-control-request-headers'] ?? '*'
			);
			await writeWebResponse(result, response);
		} catch (error) {
			response.statusCode = 500;
			response.end(String(error));
		}
	});
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	if (!address || typeof address === 'string') {
		throw new Error('No fixture address');
	}
	return {
		backendURL: `http://127.0.0.1:${address.port}/api/c15t`,
		async close() {
			const closed = once(server, 'close');
			server.closeAllConnections();
			server.close();
			await closed;
		},
		setFailure(value: boolean) {
			failing = value;
		},
	};
};
