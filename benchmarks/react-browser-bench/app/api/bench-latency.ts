import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Sleep for `C15T_BENCH_BACKEND_LATENCY_MS`, modelling the consent backend's
 * round trip. Every fixture endpoint (init and subjects) calls it. The runner
 * always sets the variable (200 ms by default); when it is unset the app runs
 * outside a bench and answers at once.
 */
export const applyBenchBackendLatency =
	async function applyBenchBackendLatency(): Promise<void> {
		const latencyMs = Number(process.env.C15T_BENCH_BACKEND_LATENCY_MS ?? '0');
		if (Number.isFinite(latencyMs) && latencyMs > 0) {
			await sleep(latencyMs);
		}
	};
