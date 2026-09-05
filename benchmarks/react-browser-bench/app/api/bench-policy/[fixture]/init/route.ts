import { setTimeout as sleep } from 'node:timers/promises';

import { NextResponse } from 'next/server';

import {
	isPolicyBenchFixtureName,
	resolvePolicyBenchInit,
} from '../../manifests';

/**
 * Deterministic `/init` for one fixed policy fixture. The payload is what
 * the installed schema package resolves from the fixture's manifest, so
 * the wire bytes and the prompt the client derives come from source, not
 * from a hand-written JSON literal.
 */
export const GET = async function GET(
	_request: Request,
	context: { params: Promise<{ fixture: string }> }
) {
	const { fixture } = await context.params;
	if (!isPolicyBenchFixtureName(fixture)) {
		return NextResponse.json(
			{ error: `Unknown policy fixture "${fixture}"` },
			{ status: 404 }
		);
	}
	const latencyMs = Number(process.env.C15T_BENCH_INIT_LATENCY_MS ?? '0');
	if (Number.isFinite(latencyMs) && latencyMs > 0) {
		await sleep(latencyMs);
	}
	const init = await resolvePolicyBenchInit(fixture);
	return NextResponse.json(init, {
		headers: {
			'cache-control': 'no-store',
		},
	});
};
