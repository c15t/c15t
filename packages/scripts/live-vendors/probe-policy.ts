/**
 * Pure probe policy helpers, split out of `runner.ts` so they can be unit
 * tested. `runner.ts` ends in a top-level `await main()`, so importing it from
 * a test would execute a full Playwright run.
 */
import { createHash } from 'node:crypto';
import type { LiveVendorProbeConfig } from './types';

/**
 * Decides whether a probe attempt must assert that the vendor runtime started.
 *
 * The runtime phase is the only signal that catches a vendor silently refusing
 * to install — the loader still answers 200 and the page throws nothing — so it
 * has to run wherever it can possibly pass, not only at `full` tier. Gating on
 * tier alone left `loader-only` vendors carrying `runtimeCheck` definitions
 * that were never executed: declared coverage that did not exist.
 *
 * @param config - The vendor's probe config.
 * @returns `true` when the runtime phase should run and be asserted.
 */
export function assertsRuntime(
	config: Pick<
		LiveVendorProbeConfig,
		'tier' | 'runtimeCheck' | 'runtimeReplacedGlobals'
	>
): boolean {
	return (
		config.tier === 'full' ||
		Boolean(config.runtimeCheck) ||
		(config.runtimeReplacedGlobals?.length ?? 0) > 0
	);
}

/**
 * Digests a loader body so reports pin the exact upstream bundle a run saw.
 *
 * @param body - Raw loader response bytes.
 * @returns The first 16 hex characters of the body's SHA-256 — collision-proof
 * enough to answer "same bundle as the last green run?" without bloating the
 * report.
 */
export function digestBody(body: Uint8Array | Buffer): string {
	return createHash('sha256').update(body).digest('hex').slice(0, 16);
}
