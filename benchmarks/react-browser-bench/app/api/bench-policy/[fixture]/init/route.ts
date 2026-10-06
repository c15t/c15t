import { NextResponse } from 'next/server';

import { applyBenchBackendLatency } from '../../../bench-latency';
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
	await applyBenchBackendLatency();
	const init = await resolvePolicyBenchInit(fixture);
	return NextResponse.json(init, {
		headers: {
			'cache-control': 'no-store',
		},
	});
};
