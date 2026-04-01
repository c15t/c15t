import { NextResponse } from 'next/server';

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	const body = [
		`window.__c15tScriptBench?.recordScriptExecution?.(${JSON.stringify(id)});`,
		`window.__c15tScriptBench && (window.__c15tScriptBench.scriptEvents[${JSON.stringify(id)}] = performance.now());`,
	].join('\n');

	return new NextResponse(body, {
		headers: {
			'cache-control': 'no-store',
			'content-type': 'application/javascript; charset=utf-8',
		},
	});
}
