const RETRY_SESSIONS_COOKIE = 'c15t_demo_retry_sessions';
const MAX_RETRY_SESSIONS = 12;

function noStoreHeaders(contentType: string) {
	return {
		'Cache-Control': 'no-store',
		'Content-Type': contentType,
	};
}

function readRetrySessions(request: Request) {
	const cookie = request.headers
		.get('cookie')
		?.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${RETRY_SESSIONS_COOKIE}=`));
	if (!cookie) {
		return [];
	}

	try {
		const value = cookie.slice(RETRY_SESSIONS_COOKIE.length + 1);
		const parsed = JSON.parse(decodeURIComponent(value));
		return Array.isArray(parsed)
			? parsed.filter((item): item is string => typeof item === 'string')
			: [];
	} catch {
		return [];
	}
}

function createRetrySessionsCookie(sessions: string[]) {
	const value = encodeURIComponent(
		JSON.stringify(sessions.slice(-MAX_RETRY_SESSIONS))
	);
	return `${RETRY_SESSIONS_COOKIE}=${value}; Path=/api/integration-fixture; Max-Age=300; HttpOnly; SameSite=Lax`;
}

export async function GET(request: Request) {
	const url = new URL(request.url);
	const fixture = url.searchParams.get('fixture');

	if (fixture === 'iframe') {
		const requestedDelay = Number(url.searchParams.get('delay') ?? 0);
		const delay = Number.isFinite(requestedDelay)
			? Math.min(Math.max(requestedDelay, 0), 15_000)
			: 0;

		await new Promise((resolve) => setTimeout(resolve, delay));

		return new Response(
			`<!doctype html>
			<html lang="en">
				<head>
					<meta charset="utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<style>
						html {
							color-scheme: light dark;
						}
						html, body {
							align-items: center;
							background: Canvas;
							color: CanvasText;
							display: flex;
							font: 500 15px/1.5 system-ui, sans-serif;
							height: 100%;
							justify-content: center;
							margin: 0;
						}
					</style>
				</head>
				<body>Iframe loaded after ${delay / 1000} seconds.</body>
			</html>`,
			{ headers: noStoreHeaders('text/html; charset=utf-8') }
		);
	}

	if (fixture === 'retry-script') {
		const session = url.searchParams.get('session');
		if (!session || session.length > 128) {
			return new Response('// Invalid or missing fixture session.', {
				headers: noStoreHeaders('application/javascript; charset=utf-8'),
				status: 400,
			});
		}

		const attemptedSessions = readRetrySessions(request);
		if (!attemptedSessions.includes(session)) {
			return new Response('// Intentional first-attempt failure.', {
				headers: {
					...noStoreHeaders('application/javascript; charset=utf-8'),
					'Set-Cookie': createRetrySessionsCookie([
						...attemptedSessions,
						session,
					]),
				},
				status: 503,
			});
		}

		const encodedSession = JSON.stringify(session);
		return new Response(
			`window.__c15tIntegrationFixtures ??= {};
			window.__c15tIntegrationFixtures[${encodedSession}] = {
				attempt: 2,
				session: ${encodedSession}
			};`,
			{ headers: noStoreHeaders('application/javascript; charset=utf-8') }
		);
	}

	return Response.json(
		{ error: 'Unknown integration fixture.' },
		{ status: 404 }
	);
}
